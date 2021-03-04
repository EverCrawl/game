import { World, Entity } from "uecs";
import * as Runtime from "common/runtime";
import { performance } from "perf_hooks";
import { Player } from "./entity";
import { NetTransform, Transform } from "common/component";
import { Message, Schema } from "common/net";
import { v2 } from "common/math";
import { Session, SessionManager } from "./session";
import Log from "server/util/log";
import { LevelStorage } from "server/map/level";

// TODO: player broadcast to self.level
//      -> create, when entering (transfer or connect)
//      -> delete, when leaving (transfer or disconnect)
//      -> position
// maybe each level should have its own "world"?
//  moving between levels would be equivalent to moving between worlds
//  it would be a bit slower to iterate over all entities, regardless of world
//  

// TODO: move to 'system.ts'
function synchronize(world: World, sessionManager: SessionManager) {
    // skip synchronizing entirely if nobody is connected
    if (sessionManager.size === 0) return;

    // TODO: maintain this per-level, and update them instead of re-creating each time
    const state: Record<string, {
        recipients: number[],
        entities: Schema.Action.Move.Entity[]
    }> = {};

    world.view(NetTransform).each((entity, transform) => {
        if (!state[transform.level]) state[transform.level] = { recipients: [], entities: [] };

        const current = transform.current.position;
        const previous = transform.previous.position;
        if (current[0] !== previous[0] || current[1] !== previous[1]) {
            state[transform.level].entities.push({
                id: entity,
                cstate: transform.cstate,
                x: current[0],
                y: current[1]
            });
        }
        transform.update(Transform.clone(transform.current));

        // if it's a player -> add it to the list of recipients for its level
        const session = world.get(entity, Session);
        if (session) {
            state[transform.level].recipients.push(session.id);
        }
    });

    // for each level, if there are some recipients -> notify them about state changes
    for (const level of Object.values(state)) {
        if (level.recipients.length > 0) {
            const msg = Message.build(Schema.Action.Id.Move, new Schema.Action.Move(level.entities).write());
            sessionManager.broadcast(msg, true, level.recipients);
        }
    }
}

export class Server {
    readonly port: number;
    smgr: SessionManager;
    world: World;
    levelStorage: LevelStorage;

    constructor() {
        Log.info("Initializing server");
        this.port = process.env.PORT ? parseInt(process.env.PORT) : 8888;
        this.smgr = new SessionManager(this.port, 20);
        this.world = new World;
        this.levelStorage = new LevelStorage("assets/maps");
    }

    tick = () => {
        synchronize(this.world, this.smgr);
    }

    private handle(entity: Entity, message: Message) {
        const session = this.world.get(entity, Session)!;
        switch (message.id) {
            case Schema.Id.Position: {
                const packet = Schema.Position.read(message.payload);
                if (!packet) return session.close();

                const transform = this.world.get(entity, NetTransform)!;
                transform.update(new Transform(v2(packet.x, packet.y), transform.current.rotation, v2.clone(transform.current.scale)));
                transform.cstate = packet.cstate;
                break;
            }
            case Schema.Action.Id.Use: {
                const packet = Schema.Action.Use.read(message.payload);
                if (!packet) return session.close();

                const ptransform = this.world.get(entity, NetTransform)!;

                // 'pos.level' always exists, but 'object[packet.which]' may not
                const target = this.levelStorage.levels[ptransform.level]!.data.object[packet.which];
                // but that's only in the case that the user is messing with the packets,
                // so disconnect the user immediately
                if (!target) return session.close();

                // TODO: move this dynamic dispatch elsewhere
                switch (target.type) {
                    case "portal": {
                        // using a portal means the player is transported to the destination level
                        // which implies:
                        // 1. they are sent a packet with the current state of that level
                        // 2. they are deleted from the source level
                        // 3. they are created in the destination level

                        // 'dst' is always valid at this point
                        const dst = this.levelStorage.destination(target);

                        // TODO: maintain these per-level, and update them instead of re-creating each time
                        // recipients of the "delete" packet -> players inside the source level
                        const delRecipients = new Array<number>();
                        // recipients of the "create" packet -> players inside the destination level
                        const crtRecipients = new Array<number>();
                        // entities in the destination level
                        const entities = new Array<Schema.Transfer.Entity>();
                        this.world.view(NetTransform).each((id, transform) => {
                            if (id === entity) return;
                            const session = this.world.get(id, Session);
                            // if this entity is in the source level
                            if (transform.level === ptransform.level) {
                                // and it is a player, send it the "delete" packet
                                if (session) delRecipients.push(session.id);
                            }
                            // else if it's in the destination level
                            else if (transform.level === dst.level) {
                                // serialize it
                                entities.push({
                                    id,
                                    position: {
                                        x: transform.current.position[0],
                                        y: transform.current.position[1]
                                    }
                                });
                                // and if it is a player, send it the "create" packet
                                if (session) crtRecipients.push(session.id);
                            }
                        });

                        // update the player's position
                        ptransform.update(new Transform(v2(dst.x, dst.y), ptransform.current.rotation, v2.clone(ptransform.current.scale)));
                        ptransform.level = dst.level;

                        // and finally, build and send the packets
                        const transfer = new Schema.Transfer(dst.level, dst.x, dst.y, entities);
                        session.send(Message.build(Schema.Id.Transfer, transfer.write()));
                        const del = new Schema.Delete(entity);
                        this.smgr.broadcast(Message.build(Schema.Id.Delete, del.write()), true, delRecipients);
                        const crt = new Schema.Create(entity, { x: dst.x, y: dst.y });
                        this.smgr.broadcast(Message.build(Schema.Id.Create, crt.write()), true, crtRecipients);
                        break;
                    }
                }
                break;
            }
            default: {
                Log.error(`Invalid message:`, message);
                session.close();
                break;
            }
        }
    }

    async run() {
        Log.info(`Starting server on port ${this.port}`);

        // set socket manager callbacks
        this.smgr.onopen = session => {
            // create player
            Log.info(`Session#${session.id} opened`);
            // TODO: fetch this from DB
            const position = { x: 424, y: 90 };
            const level = "test";
            const entity = Player.create(this.world, session, v2(position.x, position.y));

            // send initial state to player
            // it includes the player's entity ID + the state of other entities
            const player = { id: entity, level, position };
            const entities = new Array<Schema.Initial.Entity>();
            this.world.view(NetTransform).each((id, npos) => {
                if (id === entity || npos.level !== player.level) return;
                entities.push({
                    id,
                    position: {
                        x: npos.current.position[0],
                        y: npos.current.position[1]
                    }
                });
            });
            const identity = new Schema.Initial(player, entities);
            session.send(Message.build(Schema.Id.Initial, identity.write()));

            // tell everyone else the player has been created
            const create = new Schema.Create(player.id, player.position);
            const message = Message.build(Schema.Id.Create, create.write());
            this.smgr.broadcast(message, false, [session.id]);
        }
        this.smgr.onclose = session => {
            // delete player
            Log.info(`Session#${session.id} closed`);
            this.world.destroy(session.entity);

            // tell everyone else that player has been deleted
            const del = new Schema.Delete(session.entity);
            this.smgr.broadcast(Message.build(Schema.Id.Delete, del.write()), false);
        }
        this.smgr.onmessage = (session, msg) => {
            this.handle(session.entity, msg);
        }

        await this.smgr.start();
        Log.info(`SessionManager initialized`);

        Log.info(`Server initialized`);
        Runtime.start({
            update: this.tick,
            rate: 30,
            time: performance,
            frame: setImmediate
        });
    }

    async shutdown() {
        Runtime.stop();
        await this.smgr.stop();
    }
}