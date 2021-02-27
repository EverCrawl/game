import { World, Entity } from "uecs";
import * as Runtime from "common/runtime";
import { performance } from "perf_hooks";
import { Player } from "./entity";
import { NetPos } from "common/component";
import { Message, Schema } from "common/net";
import { v2 } from "common/math";
import { Session, SessionManager } from "./session";

// TODO: move to 'system.ts'
function synchronize(world: World, smgr: SessionManager) {
    if (smgr.size > 0) {
        const entities = new Array<Schema.Action.Move.Entity>();
        world.view(NetPos).each((id, p) => {
            // don't send entities which have not moved
            if (p.current[0] !== p.previous[0] || p.current[1] !== p.previous[1]) {
                entities.push({ id, cstate: p.cstate, x: p.current[0], y: p.current[1] });
            }
            p.update(v2.clone(p.current));
        });
        if (entities.length > 0) {
            const msg = Message.build(Schema.Action.Id.Move,
                new Schema.Action.Move(entities).write());
            smgr.broadcast(msg);
        }
    }
}

export class Server {
    smgr: SessionManager;
    world: World = new World;

    constructor(
        public readonly port: number
    ) {
        this.smgr = new SessionManager(port, 20);
    }

    // TODO: handle animation for non-player
    // TODO: send initial state on join

    tick = () => {
        synchronize(this.world, this.smgr);
    }

    private handle(entity: Entity, message: Message) {
        const session = this.world.get(entity!, Session)!;
        switch (message.id) {
            case Schema.Id.Position: {
                const pos = this.world.get(entity!, NetPos)!;

                let packet = Schema.Position.read(message.payload);
                if (!packet) return session.close();

                pos.update(v2(packet.x, packet.y));
                pos.cstate = packet.cstate;
            } break;
            default: {
                console.error(`Invalid message:`, message);
                session.close();
            } break;
        }
    }

    async run() {
        console.log(`Starting server on port ${this.port}`);

        // set socket manager callbacks
        this.smgr.onopen = session => {
            // create player
            console.log(`Session#${session.id} opened`);
            // TODO: fetch this from DB
            const pos = v2(424, 90)
            const entity = Player.create(this.world, session, pos);

            // send initial state to player
            // it includes the player's entity ID + the state of other entities
            const player = { id: entity, position: { x: pos[0], y: pos[1] } };
            const entities = new Array<Schema.Initial.Entity>();
            this.world.view(NetPos).each((id, p) => {
                if (id === entity) return;
                entities.push({ id, position: { x: p.current[0], y: p.current[1] } });
            });
            const identity = new Schema.Initial(player, entities);
            session.send(Message.build(Schema.Id.Initial, identity.write()));

            // tell everyone else the player has been created
            const create = new Schema.Create(player.id, player.position);
            const message = Message.build(Schema.Id.Create, create.write());
            this.smgr.broadcast(message, [session.id]);
        }
        this.smgr.onclose = session => {
            // delete player
            console.log(`Session#${session.id} closed`);
            this.world.destroy(session.entity);

            // tell everyone else that player has been deleted
            const del = new Schema.Delete(session.entity);
            this.smgr.broadcast(Message.build(Schema.Id.Delete, del.write()));
        }
        this.smgr.onmessage = (session, msg) => {
            this.handle(session.entity, msg);
        }

        await this.smgr.start();
        console.log(`SessionManager booted`);

        console.log(`Starting main loop`);
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