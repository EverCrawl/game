
export * from "./Array";
export * from "./Filter";
export * from "./Number";
export * from "./Object";
export * as Path from "./Path";
export * from "./String";

export type Constructor<T> = {
    new(...args: any): T
}

export function isClass<T extends object>(it: T): boolean {
    const className = it.constructor?.toString();
    return className != null && className.startsWith("class");
}

export function TypeOf(type: any): string {
    return type.name ?? type.constructor.name;
}

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type InstanceTypeTuple<T extends any[]> = {
    [K in keyof T]: T[K] extends Constructor<infer U> ? U : never;
};

export function setImmediate(fn: Function) {
    return setTimeout(fn, 0);
}

export type Friend<T, Expose> = {
    [K in keyof T]: K extends keyof Expose ? never : T[K];
} & Expose;

export function parseBool(value: string): boolean | null {
    switch (value.toLowerCase()) {
        case "false": return false;
        case "true": return true;
        default: return null;
    }
}

export type Array2D<T> = T[][];