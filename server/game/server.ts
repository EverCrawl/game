import { World, Entity } from "uecs";
import * as Runtime from "common/runtime";
import { performance } from "perf_hooks";
import { Socket, SocketManager } from "server/net/socket";
import { Player } from "./entity";
import { LerpPos } from "common/component";
import { Message, Schema } from "common/net";
import { v2 } from "common/math";

export class Server {
    smgr: SocketManager;
    world: World = new World;
    sessions: Map<number, Entity> = new Map;

    constructor(
        public readonly port: number
    ) {
        this.smgr = new SocketManager(port, 20);
    }

    // TODO: handle animation for non-player
    // TODO: send initial state on join

    tick = () => {
        if (this.sessions.size > 0) {
            const ids = this.getIds();
            const entities = new Array<Schema.Action.Move.Entity>();
            this.world.view(LerpPos).each((id, p) => {
                // don't send entities which have not moved
                if (p.current[0] !== p.previous[0] ||
                    p.current[1] !== p.previous[1]) {
                    entities.push({ id, x: p.current[0], y: p.current[1] });
                }
                p.update(v2.clone(p.current));
            });
            if (entities.length > 0) {
                const msg = Message.build(Schema.Action.Id.Move,
                    new Schema.Action.Move(entities).write());
                this.smgr.batchSend(ids, msg);
            }
        }
    }

    private getIds(exclude: number[] = []) {
        const ids = [...this.sessions.keys()];
        if (exclude.length > 0) {
            for (let i = 0; i < ids.length; ++i) {
                for (let j = 0; j < exclude.length; ++j) {
                    if (ids[i] === exclude[j]) {
                        ids.splice(i, 1);
                        exclude.splice(j, 1);
                        if (exclude.length === 0) break;
                    }
                }
            }
        }
        return ids;
    }

    private handle(id: number, message: Message) {
        const entity = this.sessions.get(id);
        const socket = this.world.get(entity!, Socket)!;
        switch (message.id) {
            case Schema.Id.Position: {
                const pos = this.world.get(entity!, LerpPos)!;

                let packet = Schema.Position.read(message.payload.buffer);
                if (!packet) return socket.close();

                pos.update(v2(packet.x, packet.y));
            } break;
            default: {
                console.error(`Invalid message:`, message);
                socket.close();
            } break;
        }
    }

    async run() {
        console.log(`Starting server on port ${this.port}`);

        this.smgr.onopen = socket => {
            // create player
            console.log(`Socket#${socket.id} opened`);
            const entity = Player.create(this.world, socket);
            this.sessions.set(socket.id, entity);
            console.log(`Created entity#${entity} (player#${socket.id})`)

            // tell player that he's been created
            const player = { id: entity, position: { x: 424, y: 90 } };
            const entities = new Array<Schema.Initial.Entity>();
            this.world.view(LerpPos).each((id, p) => {
                if (id === entity) return;
                entities.push({ id, position: { x: p.current[0], y: p.current[1] } });
            });
            const identity = new Schema.Initial(player, entities);
            socket.send(Message.build(Schema.Id.Initial, identity.write()));

            // tell everyone else the player has been created
            const ids = this.getIds([socket.id]);
            this.smgr.batchSend(ids,
                Message.build(Schema.Id.Create,
                    new Schema.Create(player.id, player.position).write()));
        }
        this.smgr.onclose = id => {
            // delete player
            console.log(`Socket#${id} closed`);
            const entity = this.sessions.get(id)!;
            this.world.destroy(entity);
            this.sessions.delete(id);
            console.log(`Destroyed entity#${entity} (player#${id})`)

            // tell everyone else that player has been deleted
            const ids = this.getIds();
            const del = new Schema.Delete(entity);
            const msg = Message.build(Schema.Id.Delete, del.write());
            this.smgr.batchSend(ids, msg);
        }
        this.smgr.onmessage = (id, msg) => {
            console.log(`Socket#${id} message`, Schema.Name[msg.id as keyof Schema.Name]);
            this.handle(id, msg);
        }
        await this.smgr.start();
        console.log(`SocketManager booted`);

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