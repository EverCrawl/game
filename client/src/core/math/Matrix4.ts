
import { Vector3 } from "./Vector3";

export type Matrix4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];
export interface m4 {
    (
        m00?: number, m01?: number, m02?: number, m03?: number,
        m10?: number, m11?: number, m12?: number, m13?: number,
        m20?: number, m21?: number, m22?: number, m23?: number,
        m30?: number, m31?: number, m32?: number, m33?: number
    ): Matrix4;
    clone(matrix: Matrix4): Matrix4;
    /* 
    transpose(matrix: Matrix4): Matrix4;
    invert(matrix: Matrix4): Matrix4 | null;
    adjoint(matrix: Matrix4): Matrix4;
    determinant(matrix: Matrix4): number;
    add(a: Matrix4, b: Matrix4): Matrix4;
    sub(a: Matrix4, b: Matrix4): Matrix4;
    mult(a: Matrix4, b: Matrix4): Matrix4;
    multScalar(a: Matrix4, value: number): Matrix4;
    translate(matrix: Matrix4, value: Vector3): Matrix4;
    scale(matrix: Matrix4, value: Vector3): Matrix4;
    rotate(matrix: Matrix4, value: Vector3, axis: Vector3): Matrix4;
    rotateX(matrix: Matrix4, rad: number): Matrix4;
    rotateY(matrix: Matrix4, rad: number): Matrix4;
    rotateZ(matrix: Matrix4, rad: number): Matrix4;
    frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;
    perspective(fov: number, aspect: number, near: number, far: number): Matrix4; 
    */
    orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;
    lookAt(eye: Vector3, center: Vector3, up: Vector3): Matrix4;
}
export function m4(
    m00: number = 1, m01: number = 0, m02: number = 0, m03: number = 0,
    m10: number = 0, m11: number = 1, m12: number = 0, m13: number = 0,
    m20: number = 0, m21: number = 0, m22: number = 1, m23: number = 0,
    m30: number = 0, m31: number = 0, m32: number = 0, m33: number = 1
): Matrix4 {
    return [
        m00, m01, m02, m03,
        m10, m11, m12, m13,
        m20, m21, m22, m23,
        m30, m31, m32, m33
    ];
}
m4.clone = function clone(matrix: Matrix4): Matrix4 {
    return [
        matrix[0], matrix[1], matrix[2], matrix[3],
        matrix[4], matrix[5], matrix[6], matrix[7],
        matrix[8], matrix[9], matrix[10], matrix[11],
        matrix[12], matrix[13], matrix[14], matrix[15]
    ];
}
/* m4.transpose = function transpose(matrix: Matrix4): Matrix4 {
    let temp = m4.clone(matrix);
    matrix[0] = temp[0];
    matrix[1] = temp[4];
    matrix[2] = temp[8];
    matrix[3] = temp[12];
    matrix[4] = temp[1];
    matrix[5] = temp[5];
    matrix[6] = temp[9];
    matrix[7] = temp[13];
    matrix[8] = temp[2];
    matrix[9] = temp[6];
    matrix[10] = temp[10];
    matrix[11] = temp[14];
    matrix[12] = temp[3];
    matrix[13] = temp[7];
    matrix[14] = temp[11];
    matrix[15] = temp[15];
    return matrix;
}
m4.invert = function invert(matrix: Matrix4): Matrix4 | null {
    const a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2],
        a03 = matrix[3];
    const a10 = matrix[4],
        a11 = matrix[5],
        a12 = matrix[6],
        a13 = matrix[7];
    const a20 = matrix[8],
        a21 = matrix[9],
        a22 = matrix[10],
        a23 = matrix[11];
    const a30 = matrix[12],
        a31 = matrix[13],
        a32 = matrix[14],
        a33 = matrix[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32; // Calculate the determinant

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }

    det = 1.0 / det;
    matrix[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    matrix[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    matrix[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    matrix[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    matrix[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    matrix[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    matrix[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    matrix[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    matrix[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    matrix[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    matrix[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    matrix[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    matrix[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    matrix[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    matrix[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    matrix[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return matrix;
}
m4.adjoint = function adjoint(matrix: Matrix4): Matrix4 {
    const a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2],
        a03 = matrix[3];
    const a10 = matrix[4],
        a11 = matrix[5],
        a12 = matrix[6],
        a13 = matrix[7];
    const a20 = matrix[8],
        a21 = matrix[9],
        a22 = matrix[10],
        a23 = matrix[11];
    const a30 = matrix[12],
        a31 = matrix[13],
        a32 = matrix[14],
        a33 = matrix[15];
    matrix[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
    matrix[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    matrix[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
    matrix[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    matrix[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    matrix[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
    matrix[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    matrix[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
    matrix[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
    matrix[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    matrix[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
    matrix[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    matrix[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    matrix[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
    matrix[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    matrix[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
    return matrix;
}
m4.determinant = function determinant(matrix: Matrix4): number {
    const a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2],
        a03 = matrix[3];
    const a10 = matrix[4],
        a11 = matrix[5],
        a12 = matrix[6],
        a13 = matrix[7];
    const a20 = matrix[8],
        a21 = matrix[9],
        a22 = matrix[10],
        a23 = matrix[11];
    const a30 = matrix[12],
        a31 = matrix[13],
        a32 = matrix[14],
        a33 = matrix[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
m4.add = function add(a: Matrix4, b: Matrix4): Matrix4 {
}
m4.sub = function sub(a: Matrix4, b: Matrix4): Matrix4 {
}
m4.mult = function mult(a: Matrix4, b: Matrix4): Matrix4 {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15]; // Cache only the current line of the second matrix

    let b0 = b[0],
        b1 = b[1],
        b2 = b[2],
        b3 = b[3];

    a[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    a[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    a[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    a[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    a[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    a[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    a[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return a;
}
m4.multScalar = function multScalar(a: Matrix4, value: number): Matrix4 {
}
m4.translate = function translate(matrix: Matrix4, value: Vector3): Matrix4 {
    const x = value[0],
        y = value[1],
        z = value[2];
    let a00, a01, a02, a03;
    let a10, a11, a12, a13;
    let a20, a21, a22, a23;
    const out = Mat4.create();
    if (this === out) {
        out[12] = this[0] * x + this[4] * y + this[8] * z + this[12];
        out[13] = this[1] * x + this[5] * y + this[9] * z + this[13];
        out[14] = this[2] * x + this[6] * y + this[10] * z + this[14];
        out[15] = this[3] * x + this[7] * y + this[11] * z + this[15];
    } else {
        a00 = this[0];
        a01 = this[1];
        a02 = this[2];
        a03 = this[3];
        a10 = this[4];
        a11 = this[5];
        a12 = this[6];
        a13 = this[7];
        a20 = this[8];
        a21 = this[9];
        a22 = this[10];
        a23 = this[11];
        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;
        out[12] = a00 * x + a10 * y + a20 * z + this[12];
        out[13] = a01 * x + a11 * y + a21 * z + this[13];
        out[14] = a02 * x + a12 * y + a22 * z + this[14];
        out[15] = a03 * x + a13 * y + a23 * z + this[15];
    }

    return out;
}
m4.scale = function scale(matrix: Matrix4, value: Vector3): Matrix4 {
}
m4.rotate = function rotate(matrix: Matrix4, value: Vector3, axis: Vector3): Matrix4 {
}
m4.rotateX = function rotateX(matrix: Matrix4, rad: number): Matrix4 {
}
m4.rotateY = function rotateY(matrix: Matrix4, rad: number): Matrix4 {
}
m4.rotateZ = function rotateZ(matrix: Matrix4, rad: number): Matrix4 {
}
m4.frustum = function frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
}
m4.perspective = function perspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
} */
m4.orthographic = function orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    const lr = 1 / (left - right);
    const bt = 1 / (top - bottom);
    const nf = 1 / (near - far);
    const tx = (left + right) * lr,
        ty = (top + bottom) * bt,
        tz = (far + near) * nf
    return [
        2 * lr, 0, 0, 0,
        0, -2 * bt, 0, 0,
        0, 0, 2 * nf, 0,
        tx, ty, tz, 1,
    ];
}
m4.lookAt = function lookAt(eye: Vector3, center: Vector3, up: Vector3 = [0, 1, 0]): Matrix4 {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    const centerx = center[0];
    const centery = center[1];
    const centerz = center[2];

    if (
        Math.abs(eyex - centerx) < Math.EPSILON &&
        Math.abs(eyey - centery) < Math.EPSILON &&
        Math.abs(eyez - centerz) < Math.EPSILON
    ) {
        return m4();
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.hypot(z0, z1, z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.hypot(x0, x1, x2);

    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.hypot(y0, y1, y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    const tx = -(x0 * eyex + x1 * eyey + x2 * eyez);
    const ty = -(y0 * eyex + y1 * eyey + y2 * eyez);
    const tz = -(z0 * eyex + z1 * eyey + z2 * eyez);
    return [
        x0, y0, z0, 0,
        x1, y1, z1, 0,
        x2, y2, z2, 0,
        tx, ty, tz, 1
    ];
}

if (DEBUG) {
    // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
    window.m4 = m4;
}

/* export class Mat4 extends Array<number> {

    public translate(offset: Vec3): Mat4 {
        const x = offset[0],
            y = offset[1],
            z = offset[2];
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;
        const out = Mat4.create();
        if (this === out) {
            out[12] = this[0] * x + this[4] * y + this[8] * z + this[12];
            out[13] = this[1] * x + this[5] * y + this[9] * z + this[13];
            out[14] = this[2] * x + this[6] * y + this[10] * z + this[14];
            out[15] = this[3] * x + this[7] * y + this[11] * z + this[15];
        } else {
            a00 = this[0];
            a01 = this[1];
            a02 = this[2];
            a03 = this[3];
            a10 = this[4];
            a11 = this[5];
            a12 = this[6];
            a13 = this[7];
            a20 = this[8];
            a21 = this[9];
            a22 = this[10];
            a23 = this[11];
            out[0] = a00;
            out[1] = a01;
            out[2] = a02;
            out[3] = a03;
            out[4] = a10;
            out[5] = a11;
            out[6] = a12;
            out[7] = a13;
            out[8] = a20;
            out[9] = a21;
            out[10] = a22;
            out[11] = a23;
            out[12] = a00 * x + a10 * y + a20 * z + this[12];
            out[13] = a01 * x + a11 * y + a21 * z + this[13];
            out[14] = a02 * x + a12 * y + a22 * z + this[14];
            out[15] = a03 * x + a13 * y + a23 * z + this[15];
        }

        return out;
    }

    public scale(scale: Vec3) {
        const x = scale[0],
            y = scale[1],
            z = scale[2];
        const out = Mat4.create();
        out[0] = this[0] * x;
        out[1] = this[1] * x;
        out[2] = this[2] * x;
        out[3] = this[3] * x;
        out[4] = this[4] * y;
        out[5] = this[5] * y;
        out[6] = this[6] * y;
        out[7] = this[7] * y;
        out[8] = this[8] * z;
        out[9] = this[9] * z;
        out[10] = this[10] * z;
        out[11] = this[11] * z;
        out[12] = this[12];
        out[13] = this[13];
        out[14] = this[14];
        out[15] = this[15];
        return out;
    }

    public rotate(angle: number, axis: Vec3): Mat4 | null {
        let x = axis[0],
            y = axis[1],
            z = axis[2];
        let len = Math.hypot(x, y, z);

        if (len < Math.EPSILON) {
            return null;
        }

        len = 1 / len;
        x *= len;
        y *= len;
        z *= len;
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const t = 1 - c;
        const a00 = this[0];
        const a01 = this[1];
        const a02 = this[2];
        const a03 = this[3];
        const a10 = this[4];
        const a11 = this[5];
        const a12 = this[6];
        const a13 = this[7];
        const a20 = this[8];
        const a21 = this[9];
        const a22 = this[10];
        const a23 = this[11]; // Construct the elements of the rotation matrix

        const b00 = x * x * t + c;
        const b01 = y * x * t + z * s;
        const b02 = z * x * t - y * s;
        const b10 = x * y * t - z * s;
        const b11 = y * y * t + c;
        const b12 = z * y * t + x * s;
        const b20 = x * z * t + y * s;
        const b21 = y * z * t - x * s;
        const b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

        const out = Mat4.create();
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a03 * b00 + a13 * b01 + a23 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[7] = a03 * b10 + a13 * b11 + a23 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        out[11] = a03 * b20 + a13 * b21 + a23 * b22;

        if (this !== out) {
            // If the source and destination differ, copy the unchanged last row
            out[12] = this[12];
            out[13] = this[13];
            out[14] = this[14];
            out[15] = this[15];
        }

        return out;
    }

    public rotateX(angle: number): Mat4 | null {
        return this.rotate(angle, Vec3.create([1, 0, 0]));
    }

    public rotateY(angle: number): Mat4 | null {
        return this.rotate(angle, Vec3.create([0, 1, 0]));
    }

    public rotateZ(angle: number): Mat4 | null {
        return this.rotate(angle, Vec3.create([0, 0, 1]));
    }

    public static frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const out = Mat4.create();
        const rl = 1 / (right - left);
        const tb = 1 / (top - bottom);
        const nf = 1 / (near - far);
        out[0] = near * 2 * rl;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = near * 2 * tb;
        out[6] = 0;
        out[7] = 0;
        out[8] = (right + left) * rl;
        out[9] = (top + bottom) * tb;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[14] = far * near * 2 * nf;
        out[15] = 0;
        return out;
    }

    public static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
        const out = Mat4.create();
        const f = 1.0 / Math.tan(fov / 2);
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[15] = 0;

        if (far != null && far !== Infinity) {
            const nf = 1 / (near - far);
            out[10] = (far + near) * nf;
            out[14] = 2 * far * near * nf;
        } else {
            out[10] = -1;
            out[14] = -2 * near;
        }

        return out;
    }

    public static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const out = Mat4.create();
        const lr = 1 / (left - right);
        const bt = 1 / (top - bottom);
        const nf = 1 / (near - far);
        out[0] = 2 * lr;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = -2 * bt;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 2 * nf;
        out[11] = 0;
        out[12] = (left + right) * lr;
        out[13] = (top + bottom) * bt;
        out[14] = (far + near) * nf;
        out[15] = 1;
        return out;
    }

    public static lookAt(eye: Vec3, center: Vec3, up: Vec3 = Vec3.create([0, 1, 0])): Mat4 {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        const eyex = eye[0];
        const eyey = eye[1];
        const eyez = eye[2];
        const upx = up[0];
        const upy = up[1];
        const upz = up[2];
        const centerx = center[0];
        const centery = center[1];
        const centerz = center[2];

        if (
            Math.abs(eyex - centerx) < Math.EPSILON &&
            Math.abs(eyey - centery) < Math.EPSILON &&
            Math.abs(eyez - centerz) < Math.EPSILON
        ) {
            return Mat4.identity();
        }

        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;

        len = 1 / Math.hypot(z0, z1, z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.hypot(x0, x1, x2);

        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;

        len = Math.hypot(y0, y1, y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }

        const out = Mat4.create();
        out[0] = x0;
        out[1] = y0;
        out[2] = z0;
        out[3] = 0;
        out[4] = x1;
        out[5] = y1;
        out[6] = z1;
        out[7] = 0;
        out[8] = x2;
        out[9] = y2;
        out[10] = z2;
        out[11] = 0;
        out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out[15] = 1;
        return out;
    }

    public add(other: Mat4): Mat4 {
        const out = Mat4.create();
        out[0] = other[0] + this[0];
        out[1] = other[1] + this[1];
        out[2] = other[2] + this[2];
        out[3] = other[3] + this[3];
        out[4] = other[4] + this[4];
        out[5] = other[5] + this[5];
        out[6] = other[6] + this[6];
        out[7] = other[7] + this[7];
        out[8] = other[8] + this[8];
        out[9] = other[9] + this[9];
        out[10] = other[10] + this[10];
        out[11] = other[11] + this[11];
        out[12] = other[12] + this[12];
        out[13] = other[13] + this[13];
        out[14] = other[14] + this[14];
        out[15] = other[15] + this[15];
        return out;
    }

    public sub(other: Mat4): Mat4 {
        const out = Mat4.create();
        out[0] = this[0] - other[0];
        out[1] = this[1] - other[1];
        out[2] = this[2] - other[2];
        out[3] = this[3] - other[3];
        out[4] = this[4] - other[4];
        out[5] = this[5] - other[5];
        out[6] = this[6] - other[6];
        out[7] = this[7] - other[7];
        out[8] = this[8] - other[8];
        out[9] = this[9] - other[9];
        out[10] = this[10] - other[10];
        out[11] = this[11] - other[11];
        out[12] = this[12] - other[12];
        out[13] = this[13] - other[13];
        out[14] = this[14] - other[14];
        out[15] = this[15] - other[15];
        return out;
    }

    public multiplyScalar(scalar: number): Mat4 {
        const out = Mat4.create();
        out[0] = this[0] * scalar;
        out[1] = this[1] * scalar;
        out[2] = this[2] * scalar;
        out[3] = this[3] * scalar;
        out[4] = this[4] * scalar;
        out[5] = this[5] * scalar;
        out[6] = this[6] * scalar;
        out[7] = this[7] * scalar;
        out[8] = this[8] * scalar;
        out[9] = this[9] * scalar;
        out[10] = this[10] * scalar;
        out[11] = this[11] * scalar;
        out[12] = this[12] * scalar;
        out[13] = this[13] * scalar;
        out[14] = this[14] * scalar;
        out[15] = this[15] * scalar;
        return out;
    }
}

if (DEBUG) {
    // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
    window.m4 = m4;window.Mat4 = Mat4;
} */
