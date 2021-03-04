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

const STARTING_LEVEL = "test";

export class Transform {
    constructor(
        public position: Vector2,
        public rotation: number,
        public scale: Vector2
    ) { }

    static lerp(a: Transform, b: Transform, weight: number): Transform {
        const interpolatedPosition = v2.lerp(a.position, b.position, weight);
        const interpolatedRotation = Math.lerp(a.rotation, b.rotation, weight);
        const interpolatedScale = v2.lerp(a.scale, b.scale, weight);
        return new Transform(interpolatedPosition, interpolatedRotation, interpolatedScale);
    }

    static clone(it: Transform): Transform {
        return new Transform(v2.clone(it.position), it.rotation, v2.clone(it.scale));
    }
}
export class NetTransform extends Interpolated<Transform> {
    level: string = STARTING_LEVEL;
    cstate: CollisionState = CollisionState.Ground;
    constructor(position = v2(), rotation = 0, scale = v2()) {
        super(new Transform(position, rotation, scale), Transform.lerp);
    }
}
export class Velocity extends Value<Vector2> { }

/*
export class Speed extends Value<number> { }
export class Collider extends Value<AABB> {
    clone() {
        return new Collider(new AABB(v2.clone(this.value.center), v2.clone(this.value.half)))
    }
} */

export class RigidBody {
    position: Interpolated<Vector2>;
    velocity: Vector2;
    cstate: CollisionState;

    readonly acceleration: number;
    readonly friction: number;
    readonly drag: number;
    readonly speed: number;
    readonly jumpSpeed: number;
    readonly ladderSpeed: number;

    constructor(
        pos: Vector2,
        acceleration: number = 0.9,
        friction: number = 1.9,
        drag: number = 0.3,
        speed: number = 3.5,
        jumpSpeed: number = 9,
        ladderSpeed: number = 3
    ) {
        // variables
        this.position = new Interpolated<Vector2>(pos, v2.lerp);
        this.velocity = v2();
        this.cstate = CollisionState.Air;

        // constants
        this.acceleration = acceleration;
        this.friction = friction;
        this.drag = drag;
        this.speed = speed;
        this.jumpSpeed = jumpSpeed;
        this.ladderSpeed = ladderSpeed;
    }

    reset(position: Vector2) {
        this.position.reset(position);
        this.velocity = v2();
        this.cstate = CollisionState.Air;
    }
}