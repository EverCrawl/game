import { World, Tag, Entity } from "uecs";
import { Sprite, Spritesheet } from "client/core/gfx";
import { v2, Vector2 } from "common/math";
import { NetTransform, RigidBody, Transform, Velocity } from "common/component";

export namespace Player {
    export const TAG = Tag.for("Player");

    export function self(
        world: World,
        id: Entity,
        sprite: string,
        position: Vector2
    ) {
        return world.insert(id, TAG,
            new Sprite(new Spritesheet(sprite)),
            new RigidBody(position));
    }

    export function insert(
        world: World,
        id: Entity,
        sprite: string,
        position: Vector2
    ) {
        return world.insert(id, TAG,
            new Sprite(new Spritesheet(sprite)),
            new NetTransform(position, 0, v2(0.5, 0.5)));
    }
}

export namespace Bullet {
    export const TAG = Tag.for("Bullet");

    export function insert(
        world: World,
        id: Entity,
        position: Vector2
    ) {
        return world.insert(id, TAG,
            new Sprite(new Spritesheet("assets/sprites/bullet.json")),
            new NetTransform(position, Math.rad(45), v2(0.25, 0.25)));
    }

    export function shoot(
        world: World,
        id: Entity,
        start: Vector2,
        direction: Vector2,
        ttl: number
    ) {
        const transform = new NetTransform(start, v2.angle(direction), v2(0.25, 0.25));
        const velocity = new Velocity(v2.scale(v2.norm(direction), 5));
        const sprite = new Sprite(new Spritesheet("assets/sprites/bullet.json"));
        const entity = world.insert(id, TAG, sprite, transform, velocity);
        sprite.addEventListener("frame", (anim, frame, length) => {
            if (anim === "Explode") {
                if (frame + 1 === length) {
                    world.destroy(entity);
                }
            }
        });
        setTimeout(() => {
            sprite.animation = "Explode";
            velocity.value[0] = 0;
            velocity.value[1] = 0;
        }, ttl);
        console.log(entity, sprite, transform);
        return entity;
    }
}