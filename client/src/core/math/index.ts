export * from "./Collision";
export * from "./Common";
export * from "./Matrix3";
export * from "./Matrix4";
export * from "./Vector2";
export * from "./Vector3";
export * from "./Vector4";

/**
 * Lightweight state wrapper. Provides an abstraction
 * for interpolating between states.
 */
export class Interpolated<T> {
    private current_: T;
    private previous_: T;

    constructor(
        initial: T,
        private lerp: (a: T, b: T, weight: number) => T
    ) {
        this.current_ = initial;
        this.previous_ = initial;
    }

    public get current(): T { return this.current_; }
    public get previous(): T { return this.previous_; }

    public update(value: T): void {
        this.previous_ = this.current_;
        this.current_ = value;
    }

    public get(weight: number): T {
        return this.lerp(this.previous_, this.current_, weight);
    }
}