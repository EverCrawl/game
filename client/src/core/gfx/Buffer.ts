
/** TODO: dynamic buffer */

import { createBuffer } from "./Common";
import { ErrorKind, GLError } from "./Error";

// convenience 
export type StaticBuffer = Buffer<BufferType.Static>;
export type DynamicBuffer = Buffer<BufferType.Dynamic>;

export const enum BufferType {
    Static,
    Dynamic
}

export class Buffer<Type extends BufferType> {

    private byteLength_: number;
    private info_: TypedArrayInfo | undefined;

    private constructor(
        public readonly handle: WebGLBuffer,
        public readonly target: GLenum,
        public readonly usage: GLenum,
        byteLength: number,
        info: Type extends BufferType.Static ? TypedArrayInfo : TypedArrayInfo | undefined
    ) {
        this.byteLength_ = byteLength;
        this.info_ = info;
    }

    get byteLength() { return this.byteLength_; }
    /** undefined in case the buffer is empty */
    get elementType() { return this.info_?.type; }
    /** undefined in case the buffer is empty */
    get elementSize() { return this.info_?.elementSize; }
    /** undefined in case the buffer is empty */
    get elementTypeName() { return this.info_?.typeName; }

    bind() {
        GL.bindBuffer(this.target, this.handle);
    }

    unbind() {
        GL.bindBuffer(this.target, null);
    }

    upload(data: ArrayBufferView | ArrayBuffer, dstOffset = -1) {
        if (DEBUG && this.usage === GL.STATIC_DRAW) {
            throw new Error(`Attempted to overwrite static buffer`);
        }

        this.info_ = getTypedArrayInfo(data);

        this.bind();
        if (dstOffset === -1) {
            GL.bufferData(this.target, data, this.usage);
        } else {
            if (DEBUG && dstOffset < 0) {
                throw new Error(`Negative buffer dstOffset (${dstOffset}) is invalid`);
            }
            if (DEBUG && this.byteLength_ < dstOffset + data.byteLength) {
                throw new Error(`Buffer overflow: ${dstOffset + data.byteLength}/${this.byteLength_}`);
            }
            GL.bufferSubData(this.target, dstOffset, data);
        }
        this.unbind();
    }

    static static(
        data: ArrayBufferView | ArrayBuffer,
        target: GLenum
    ): StaticBuffer {
        const handle = createBuffer();

        GL.bindBuffer(target, handle);
        GL.bufferData(target, data, GL.STATIC_DRAW);
        GL.bindBuffer(target, null);

        const byteLength = data.byteLength;
        const info = getTypedArrayInfo(data);

        return new Buffer<BufferType.Static>(handle, target, GL.STATIC_DRAW, byteLength, info);
    }

    static dynamic(
        data: ArrayBufferView | ArrayBuffer | number | null,
        target: GLenum
    ): DynamicBuffer {
        const handle = createBuffer();

        let byteLength = 0;
        let info: TypedArrayInfo | undefined;
        if (data != null) {
            GL.bindBuffer(target, handle);
            if (typeof data === "number") {
                byteLength = data;
                GL.bufferData(target, data, GL.DYNAMIC_DRAW);
            } else {
                byteLength = data.byteLength;
                info = getTypedArrayInfo(data)
                GL.bufferData(target, data, GL.DYNAMIC_DRAW);
            }
            GL.bindBuffer(target, null);
        }

        return new Buffer<BufferType.Dynamic>(handle, target, GL.DYNAMIC_DRAW, byteLength, info);
    }
}

interface TypedArrayInfo {
    type: number;
    typeName: string;
    elementSize: number;
}

function getTypedArrayInfo(array: ArrayBufferView | ArrayBuffer): TypedArrayInfo {
    switch (true) {
        case array instanceof ArrayBuffer: return { type: 0x1400, typeName: "Byte", elementSize: 1 };
        case array instanceof Uint8Array: return { type: 0x1405, typeName: "Uint8", elementSize: 1 };
        case array instanceof Uint16Array: return { type: 0x1405, typeName: "Uint16", elementSize: 2 };
        case array instanceof Uint32Array: return { type: 0x1405, typeName: "Uint32", elementSize: 4 };
        case array instanceof Int8Array: return { type: 0x1404, typeName: "Int8", elementSize: 1 };
        case array instanceof Int16Array: return { type: 0x1404, typeName: "Int16", elementSize: 2 };
        case array instanceof Int32Array: return { type: 0x1404, typeName: "Int32", elementSize: 4 };
        case array instanceof Float32Array: return { type: 0x1406, typeName: "Float32", elementSize: 4 };
        default: throw new GLError(ErrorKind.UnknownArrayType, { type: array.constructor.name.slice(0, array.constructor.name.length - "Array".length) });
    }
}