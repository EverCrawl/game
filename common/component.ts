import { Interpolated, v2, Vector2 } from "common/math";
import { Schema } from "./net";

export class Value<T> {
    constructor(public value: T) { }
}

export const enum CollisionState {
    Air,
    Ground,
    Ladder
}

export class NetPos extends Interpolated<Vector2> {
    cstate: CollisionState = CollisionState.Air;
    constructor(initial: Vector2 = v2()) {
        super(initial, v2.lerp);
    }
}

export class Position {
    constructor(public value: Vector2 = v2()) { }
}

/* export class Velocity extends Value<Vector2> { }
export class Speed extends Value<number> { }
export class Collider extends Value<AABB> {
    clone() {
        return new Collider(new AABB(v2.clone(this.value.center), v2.clone(this.value.half)))
    }
} */

export class RigidBody {
    position: Interpolated<Vector2>;
    velocity: Vector2;
    acceleration: number;
    friction: number;
    drag: number;
    speed: number;
    jumpSpeed: number;
    ladderSpeed: number;
    cstate: CollisionState;

    constructor(
        pos: Vector2,
        acceleration: number = 0.9,
        friction: number = 1.9,
        drag: number = 0.3,
        speed: number = 3.5,
        jumpSpeed: number = 9,
        ladderSpeed: number = 3
    ) {
        this.position = new Interpolated<Vector2>(pos, v2.lerp);
        this.velocity = v2();
        this.acceleration = acceleration;
        this.friction = friction;
        this.drag = drag;
        this.speed = speed;
        this.jumpSpeed = jumpSpeed;
        this.ladderSpeed = ladderSpeed;
        this.cstate = CollisionState.Ground;
    }
}