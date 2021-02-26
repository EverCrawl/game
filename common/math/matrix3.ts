
import { Vector2 } from "./vector2";

export type Matrix3 = [
    number, number, number,
    number, number, number,
    number, number, number,
];
export interface m3 {
    (
        m00?: number, m01?: number, m02?: number,
        m10?: number, m11?: number, m12?: number,
        m20?: number, m21?: number, m22?: number,
    ): Matrix3;
    clone(matrix: Matrix3): Matrix3;
    invert(matrix: Matrix3): Matrix3;
    /* adjoint(matrix: Matrix3): Matrix3;
    transpose(matrix: Matrix3): Matrix3;
    determinant(matrix: Matrix3): Matrix3;
    mult(matrix: Matrix3): Matrix3; */
    translate(matrix: Matrix3, value: Vector2): Matrix3;
    scale(matrix: Matrix3, value: Vector2): Matrix3;
    rotate(matrix: Matrix3, rad: number): Matrix3;
    /* projection(matrix: Matrix3): Matrix3;
    add(matrix: Matrix3): Matrix3;
    sub(matrix: Matrix3): Matrix3;
    multScalar(matrix: Matrix3): Matrix3; */
}
m3.invert = function invert(matrix: Matrix3): Matrix3 {
    const a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2];
    const a10 = matrix[3],
        a11 = matrix[4],
        a12 = matrix[5];
    const a20 = matrix[6],
        a21 = matrix[7],
        a22 = matrix[8];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) {
        return m3();
    }

    det = 1.0 / det;
    matrix[0] = b01 * det;
    matrix[1] = (-a22 * a01 + a02 * a21) * det;
    matrix[2] = (a12 * a01 - a02 * a11) * det;
    matrix[3] = b11 * det;
    matrix[4] = (a22 * a00 - a02 * a20) * det;
    matrix[5] = (-a12 * a00 + a02 * a10) * det;
    matrix[6] = b21 * det;
    matrix[7] = (-a21 * a00 + a01 * a20) * det;
    matrix[8] = (a11 * a00 - a01 * a10) * det;
    return matrix;
}
export function m3(
    m00 = 1, m01 = 0, m02 = 0,
    m10 = 0, m11 = 1, m12 = 0,
    m20 = 0, m21 = 0, m22 = 1
): Matrix3 {
    return [
        m00, m01, m02,
        m10, m11, m12,
        m20, m21, m22
    ];
}

m3.clone = function clone(matrix: Matrix3): Matrix3 {
    return [
        matrix[0],
        matrix[1],
        matrix[2],
        matrix[3],
        matrix[4],
        matrix[5],
        matrix[6],
        matrix[7],
        matrix[8],
    ];
}
/* m3.transpose = function transpose(matrix: Matrix3): Matrix3 {

}
m3.invert = function invert(matrix: Matrix3): Matrix3 {

}
m3.adjoint = function adjoint(matrix: Matrix3): Matrix3 {

}
m3.determinant = function determinant(matrix: Matrix3): Matrix3 {

}
m3.mult = function mult(matrix: Matrix3): Matrix3 {

} */
m3.translate = function translate(matrix: Matrix3, value: Vector2): Matrix3 {
    const a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2],
        a10 = matrix[3],
        a11 = matrix[4],
        a12 = matrix[5],
        a20 = matrix[6],
        a21 = matrix[7],
        a22 = matrix[8],
        x = value[0],
        y = value[1];

    matrix[0] = a00;
    matrix[1] = a01;
    matrix[2] = a02;
    matrix[3] = a10;
    matrix[4] = a11;
    matrix[5] = a12;
    matrix[6] = x * a00 + y * a10 + a20;
    matrix[7] = x * a01 + y * a11 + a21;
    matrix[8] = x * a02 + y * a12 + a22;
    return matrix;
}
m3.scale = function scale(matrix: Matrix3, value: Vector2): Matrix3 {
    const x = value[0],
        y = value[1];

    matrix[0] = x * matrix[0];
    matrix[1] = x * matrix[1];
    matrix[2] = x * matrix[2];
    matrix[3] = y * matrix[3];
    matrix[4] = y * matrix[4];
    matrix[5] = y * matrix[5];
    matrix[6] = matrix[6];
    matrix[7] = matrix[7];
    matrix[8] = matrix[8];
    return matrix;
}
m3.rotate = function rotate(matrix: Matrix3, rad: number): Matrix3 {
    const a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2],
        a10 = matrix[3],
        a11 = matrix[4],
        a12 = matrix[5],
        a20 = matrix[6],
        a21 = matrix[7],
        a22 = matrix[8],
        s = Math.sin(rad),
        c = Math.cos(rad);

    matrix[0] = c * a00 + s * a10;
    matrix[1] = c * a01 + s * a11;
    matrix[2] = c * a02 + s * a12;
    matrix[3] = c * a10 - s * a00;
    matrix[4] = c * a11 - s * a01;
    matrix[5] = c * a12 - s * a02;
    matrix[6] = a20;
    matrix[7] = a21;
    matrix[8] = a22;
    return matrix;
}
/* m3.projection = function projection(matrix: Matrix3): Matrix3 {

}
m3.add = function add(matrix: Matrix3): Matrix3 {

}
m3.sub = function sub(matrix: Matrix3): Matrix3 {

}
m3.multScalar = function multScalar(matrix: Matrix3): Matrix3 {

} */

// @ts-ignore
if (DEBUG) {
    // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
    globalThis.m3 = m3;
}