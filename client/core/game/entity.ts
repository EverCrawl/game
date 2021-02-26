import { World, Tag, Entity } from "uecs";
import { Sprite, Spritesheet } from "client/core/gfx";
import { v2, Vector2 } from "common/math";
import { LerpPos, RigidBody } from "common/component";

export namespace Player {
    export function self(
        world: World,
        id: Entity,
        sprite: string,
        position: Vector2 = v2()
    ) {
        return world.insert(id,
            Tag.for("Player"),
            new Sprite(new Spritesheet(sprite)),
            new RigidBody(position));
    }

    export function insert(
        world: World,
        id: Entity,
        sprite: string,
        position: Vector2 = v2()
    ) {
        return world.insert(id,
            Tag.for("Player"),
            new Sprite(new Spritesheet(sprite)),
            new LerpPos(position));
    }
}