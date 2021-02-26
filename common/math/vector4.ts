
export type Vector4 = [number, number, number, number];

export interface v4 {
    (x?: number, y?: number, z?: number, w?: number): Vector4;
    /**
     * Creates a Vector4 from a hex string
     * @param value hex string in the `RRGGBBAA` or `RRGGBB` format
     */
    hex(value: string): Vector4;
}
/**
 * Construct a 4-component vector
 */
export function v4(x = 0, y = 0, z = 0, w: number = 0): Vector4 {
    return [x, y, z, w];
}
const HEX_RGBA_REGEX = /([\w\d]{2})([\w\d]{2})([\w\d]{2})([\w\d]{2})?/;
/**
 * Creates a Vector4 from a hex string
 * @param value hex string in the `RRGGBBAA` or `RRGGBB` format
 */
v4.hex = function hex(value: string): Vector4 {
    const result = HEX_RGBA_REGEX.exec(value);
    if (result != null) {
        return v4(
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            result[4] != null ? (parseInt(result[4], 16) / 255) : 1.0
        )
    }
    else throw new Error(`Could not parse '${value}' as hex string`);
}

// @ts-ignore
if (DEBUG) {
    // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
    globalThis.v4 = v4;
}
