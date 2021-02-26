export * from "./collision";
export * from "./common";
export * from "./matrix3";
export * from "./matrix4";
export * from "./vector2";
export * from "./vector3";
export * from "./vector4";

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