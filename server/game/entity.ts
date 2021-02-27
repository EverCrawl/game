import { NetPos } from "common/component";
import { Vector2 } from "common/math";
import { World, Entity } from "uecs";
import { Session } from "./session";

export class Player {
    static create(world: World, session: Session, position?: Vector2): Entity {
        session.entity = world.create(session, new NetPos(position))
        return session.entity;
    }
}