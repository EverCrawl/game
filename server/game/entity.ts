import { LerpPos } from "common/component";
import { Socket } from "server/net";
import { Vector2 } from "common/math";
import { World, Entity } from "uecs";

export class Player {
    static create(world: World, socket: Socket, position?: Vector2): Entity {
        return world.create(socket, new LerpPos(position));
    }
}