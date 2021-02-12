import { Matrix3 } from "./Matrix3";

export type Vector2 = [number, number];

export interface v2 {
    (x?: number, y?: number): Vector2;
    clone(vec: Vector2): Vector2;
    add(a: Vector2, b: Vector2): Vector2;
    sub(a: Vector2, b: Vector2): Vector2;
    mult(a: Vector2, b: Vector2): Vector2;
    div(a: Vector2, b: Vector2): Vector2;
    min(a: Vector2, b: Vector2): Vector2;
    max(a: Vector2, b: Vector2): Vector2;
    sign(vec: Vector2): Vector2;
    ceil(vec: Vector2): Vector2;
    floor(vec: Vector2): Vector2;
    round(vec: Vector2): Vector2;
    scale(vec: Vector2, value: number): Vector2;
    dist(a: Vector2, b: Vector2): number;
    dist2(a: Vector2, b: Vector2): number;
    len(vec: Vector2): number;
    len2(vec: Vector2): number;
    clamp(vec: Vector2, a: Vector2, b: Vector2): Vector2;
    negate(vec: Vector2): Vector2;
    inverse(vec: Vector2): Vector2;
    norm(vec: Vector2): Vector2;
    dot(a: Vector2, b: Vector2): number;
    cross(a: Vector2, b: Vector2): [number, number, number];
    lerp(a: Vector2, b: Vector2, t: number): Vector2;
    multMat3(vec: Vector2, mat: Matrix3): Vector2;
    rotate(vec: Vector2, o: Vector2, rad: number): Vector2;
    angle(a: Vector2, b: Vector2): number;
    zero(vec: Vector2): Vector2;
    equals(a: Vector2, b: Vector2, epsilon?: number): boolean;
    exactEquals(a: Vector2, b: Vector2): boolean;
    stringify(vec: Vector2): string;
}
export function v2(x = 0, y = 0): Vector2 {
    return [x, y];
}
v2.clone = function clone(vec: Vector2): Vector2 {
    return [vec[0], vec[1]];
}
/**
 * Adds `a` to `b`
 * 
 * NOTE: modifies `a`
 */
v2.add = function add(a: Vector2, b: Vector2): Vector2 {
    a[0] += b[0];
    a[1] += b[1];
    return a;
}
/**
 * Subtracts `b` from `a`
 * 
 * NOTE: modifies `a`
 */
v2.sub = function sub(a: Vector2, b: Vector2): Vector2 {
    a[0] -= b[0];
    a[1] -= b[1];
    return a;
}
/**
 * Multiplies `a` by `b`
 * 
 * NOTE: modifies `a`
 */
v2.mult = function mult(a: Vector2, b: Vector2): Vector2 {
    a[0] *= b[0];
    a[1] *= b[1];
    return a;
}
/**
 * Divides `a` by `b`
 * 
 * NOTE: modifies `a`
 */
v2.div = function div(a: Vector2, b: Vector2): Vector2 {
    a[0] /= b[0];
    a[1] /= b[1];
    return a;
}
/**
 * Component-wise minimum of `a` and `b`
 * 
 * NOTE: modifies `a`
 * 
 * Example:
 * ```
 * v2.min(v2(0, 10), v2(10, 0)) // outputs v2(0, 0)
 * ```
 */
v2.min = function min(a: Vector2, b: Vector2): Vector2 {
    a[0] = Math.min(a[0], b[0]);
    a[1] = Math.min(a[1], b[1]);
    return a;
}
/**
 * Component-wise maximum of `a` and `b`
 * 
 * NOTE: modifies `a`
 * 
 * Example:
 * ```
 * v2.max(v2(0, 10), v2(10, 0)) // outputs v2(10, 10)
 * ```
 */
v2.max = function max(a: Vector2, b: Vector2): Vector2 {
    a[0] = Math.max(a[0], b[0]);
    a[1] = Math.max(a[1], b[1]);
    return a;
}
/**
 * Gets sign of `vec` components
 * 
 * NOTE: modifies `vec`
 */
v2.sign = function sign(vec: Vector2): Vector2 {
    vec[0] = Math.sign(vec[0]);
    vec[1] = Math.sign(vec[1]);
    return vec;
}
/**
 * Ceils components of `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.ceil = function ceil(vec: Vector2): Vector2 {
    vec[0] = Math.ceil(vec[0]);
    vec[1] = Math.ceil(vec[1]);
    return vec;
}
/**
 * Floors components of `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.floor = function floor(vec: Vector2): Vector2 {
    vec[0] = Math.floor(vec[0]);
    vec[1] = Math.floor(vec[1]);
    return vec;
}
/**
 * Rounds components of `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.round = function round(vec: Vector2): Vector2 {
    vec[0] = Math.round(vec[0]);
    vec[1] = Math.round(vec[1]);
    return vec;
}
/**
 * Scales components of `vec` by `value`
 * 
 * NOTE: modifies `vec`
 */
v2.scale = function scale(vec: Vector2, value: number): Vector2 {
    vec[0] *= value;
    vec[1] *= value;
    return vec;
}
/**
 * Euclidean distance between `a` and `b`
 */
v2.dist = function dist(a: Vector2, b: Vector2): number {
    return Math.fhypot(b[0] - a[0], b[1] - a[1]);
}
/**
 * Square of euclidean distance between `a` and `b`
 */
v2.dist2 = function dist2(a: Vector2, b: Vector2): number {
    return (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]);
}
/**
 * Length of `vec`
 */
v2.len = function len(vec: Vector2): number {
    return Math.fhypot(vec[0], vec[1]);
}
/**
 * Squared length of `vec`
 */
v2.len2 = function len2(vec: Vector2): number {
    return vec[0] * vec[0] + vec[1] * vec[1];
}
v2.clamp = function clamp(vec: Vector2, a: Vector2, b: Vector2): Vector2 {
    return [
        Math.clamp(vec[0], a[0], b[0]),
        Math.clamp(vec[1], a[1], b[1])
    ];
}
/**
 * Negates components of `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.negate = function negate(vec: Vector2): Vector2 {
    vec[0] = -vec[0];
    vec[1] = -vec[1];
    return vec;
}
/**
 * Inverts components of `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.inverse = function inverse(vec: Vector2): Vector2 {
    vec[0] = 1 / vec[0];
    vec[1] = 1 / vec[1];
    return vec;
}
/**
 * Normalizes components of `vec` to range (0, 1)
 * 
 * NOTE: modifies `vec`
 */
v2.norm = function norm(vec: Vector2): Vector2 {
    let len = vec[0] * vec[0] + vec[1] * vec[1];
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    vec[0] *= len;
    vec[1] *= len;
    return vec;
}
/**
 * Dot product of `a` and `b`
 */
v2.dot = function dot(a: Vector2, b: Vector2): number {
    return a[0] * b[0] + a[1] * b[1];
}
/**
 * Cross product of `a` and `b`
 */
v2.cross = function cross(a: Vector2, b: Vector2): [number, number, number] {
    const z = a[0] * b[1] - a[1] * b[0];
    return [0, 0, z];
}
/**
 * Linear interpolation between `a` and `b` with weight `t`
 */
v2.lerp = function lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return [
        a[0] + t * (b[0] - a[0]),
        a[1] + t * (b[1] - a[1])
    ];
}
/**
 * Applies `mat` to `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.multMat3 = function multMat3(vec: Vector2, mat: Matrix3): Vector2 {
    vec[0] = mat[0] * vec[0] + mat[3] * vec[1] + mat[6];
    vec[0] = mat[1] * vec[0] + mat[4] * vec[1] + mat[7];
    return vec;
}
/**
 * Rotates `vec` around axis `o` by `rad`
 * 
 * `rad` must be in radians
 * 
 * NOTE: modifies `vec`
 */
v2.rotate = function rotate(vec: Vector2, o: Vector2, rad: number): Vector2 {
    let p0 = vec[0] - o[0],
        p1 = vec[1] - o[1],
        sinC = Math.sin(rad),
        cosC = Math.cos(rad);
    vec[0] = p0 * cosC - p1 * sinC + o[0];
    vec[1] = p0 * sinC + p1 * cosC + o[1];
    return vec;
}
/**
 * Returns a vector perpendicular to `vec`
 */
v2.perp = function perp(vec: Vector2): Vector2 {
    return [vec[1], -vec[0]];
}
/**
 * Angle of `vec` relative to the x axis
 */
v2.angle = function angle(a: Vector2, b: Vector2): number {
    let mag = Math.sqrt(a[0] * a[0] + a[1] * a[1]) * Math.sqrt(b[0] * b[0] + b[1] * b[1]),
        cosine = mag && (a[0] * b[0] + a[1] * b[1]) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Zeros out components of `vec`
 * 
 * NOTE: modifies `vec`
 */
v2.zero = function zero(vec: Vector2): Vector2 {
    vec[0] = 0;
    vec[1] = 0;
    return vec;
}
/**
 * Comparison between components of `a` and `b` with a margin of `epsilon`
 */
v2.equals = function equals(a: Vector2, b: Vector2, epsilon: number = Math.EPSILON): boolean {
    return (
        Math.abs(a[0] - b[0]) < epsilon &&
        Math.abs(a[1] - b[1]) < epsilon
    );
}
/**
 * Exact comparison between components of `a` and `b`
 */
v2.exactEquals = function exactEquals(a: Vector2, b: Vector2): boolean {
    return (
        a[0] === b[0] &&
        a[1] === b[1]
    );
}
/**
 * Return a string representation of a vector
 */
v2.stringify = function stringify(vec: Vector2): string {
    return `[${vec[0].toFixed(2)}, ${vec[1].toFixed(2)}]`;
}

if (DEBUG) {
    // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
    window.v2 = v2;
}


