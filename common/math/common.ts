
declare global {
    interface Math {
        EPSILON: number;
        /**
         * Epsilon rounded up to the nearest power of two.
         */
        EPSILONP2: number;
        rad(angle: number): number;
        deg(angle: number): number;
        clamp(num: number, min: number, max: number): number;
        lerp(start: number, end: number, weight: number): number;
        norm(start: number, end: number, value: number): number;
        /**
         * Fast hypotenuse.
         * 
         * Returns the square root of the sum of the squares of its arguments.
         * 
         * Does not handle edge cases such as one or more of the arguments being NaN,
         * or passed as a string.
         */
        fhypot(...n: number[]): number;
        /**
         * Inverse square root.
         */
        rsqrt(n: number): number;
        /**
         * Round number up to the nearest power of 2.
         */
        ceil2(n: number): number;
    }
}

Math.EPSILON = 0.000001;
const _PI_DIV_180 = Math.PI / 180;
const _180_DIV_PI = 180 / Math.PI;
globalThis["Math"]["rad"] = function rad(angle) { return angle * _PI_DIV_180 }
globalThis["Math"]["deg"] = function deg(angle) { return angle * _180_DIV_PI }
globalThis["Math"]["clamp"] = function clamp(num, min, max) {
    if (num <= min) return min
    if (num >= max) return max
    return num
}
globalThis["Math"]["lerp"] = function lerp(start, end, weight) {
    return start * (1 - weight) + end * weight;
}
globalThis["Math"]["norm"] = function norm(start, end, value) {
    return (value - start) / (end - start);
}
globalThis["Math"]["fhypot"] = function fhypot(...n) {
    let sum = 0;
    for (let i = 0; i < n.length; ++i) {
        sum += n[i] * n[i];
    }
    return Math.sqrt(sum);
}
globalThis["Math"]["rsqrt"] = function rsqrt(n) {
    return 1 / Math.sqrt(n);
}
globalThis["Math"]["ceil2"] = function ceil2(n) {
    return Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));
}

export { };