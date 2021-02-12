
import { Buffer, BufferType } from "./Buffer";
import { createVertexArray } from "./Common";
import { ErrorKind, GLError } from "./Error";

export interface BufferDescriptor {
    /**
     * Attribute index
     * 
     * e.g. for attribute `layout(location = 0) in vec2 POSITION` it would be `0`.
     */
    location: number;
    /**
     * Number of `baseType` in the compound type.
     * 
     * e.g. for attribute `layout(location = 0) in vec2 POSITION`, it would be `2`, because it's a `vec2`.
     */
    arraySize: number;
    /**
     * Base type of the attribute
     * 
     * e.g. for attribute `layout(location = 0) in vec2 POSITION`, it would be `GL.FLOAT`, because it's a `vec2`, which is comprised of two floats.
     */
    baseType: GLenum;
    /**
     * Whether the value should be normalized to the (0, 1) range.
     */
    normalized: boolean;
}

function sizeof(type: GLenum) {
    switch (type) {
        case 0x1400: return /* byte */ 1;
        case 0x1401: return /* unsigned byte */ 1;
        case 0x8b56: return /* bool */ 1;
        case 0x1402: return /* short */ 2;
        case 0x1403: return /* unsigned short */ 2;
        case 0x1404: return /* int */ 4;
        case 0x1405: return /* unsigned int */ 4;
        case 0x1406: return /* float */ 4;
        default: throw new GLError(ErrorKind.UnknownBaseType, { type });
    }
}

export class VertexArray {
    private static ID_SEQUENCE = 0;
    public readonly id: number;
    public readonly handle: WebGLVertexArrayObject;

    constructor(
        private buffers: { buffer: Buffer<BufferType.Static | BufferType.Dynamic>, descriptors: BufferDescriptor[] }[]
    ) {
        this.id = VertexArray.ID_SEQUENCE++;
        this.handle = createVertexArray();

        if (DEBUG && buffers.length === 0) throw new GLError(ErrorKind.EmptyVertexArray);

        GL.bindVertexArray(this.handle);

        // calculate stride
        let stride = 0;
        for (let i = 0, len0 = buffers.length; i < len0; ++i) {
            const descriptors = buffers[i].descriptors;
            for (let j = 0, len1 = descriptors.length; j < len1; ++j) {
                stride += descriptors[j].arraySize * sizeof(descriptors[j].baseType);
            }
        }

        // bind buffers and their attribute pointers
        let offset = 0;
        for (let i = 0, len = buffers.length; i < len; ++i) {
            const buffer = buffers[i].buffer;
            const descriptors = buffers[i].descriptors;

            buffer.bind();

            for (let j = 0, len1 = descriptors.length; j < len1; ++j) {
                GL.vertexAttribPointer(descriptors[j].location, descriptors[j].arraySize, descriptors[j].baseType, descriptors[j].normalized, stride, offset);
                GL.enableVertexAttribArray(descriptors[j].location);
                offset += descriptors[j].arraySize * sizeof(descriptors[j].baseType)
            }
        }

        GL.bindVertexArray(null);
    }

    bind() {
        GL.bindVertexArray(this.handle);
    }

    unbind() {
        GL.bindVertexArray(null);
    }
}