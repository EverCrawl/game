import { ECS } from "core";
import { Sprite, Spritesheet } from "core/gfx";
import { v2, Vector2 } from "core/math";
import { RigidBody } from "./Component";

export namespace Player {
    export function create(
        registry: ECS.Registry,
        sprite: string,
        position: Vector2 = v2()
    ) {
        const entity = registry.create();
        // players consist of a Sprite, Collider, and a RigidBody
        registry.emplace(entity, new Sprite(new Spritesheet(sprite)));
        registry.emplace(entity, ECS.Tag("Collider"));
        registry.emplace(entity, new RigidBody(position));
        return entity;
    }
}