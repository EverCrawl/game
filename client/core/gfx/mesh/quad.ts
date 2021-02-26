import { Buffer } from "../buffer";
import { VertexArray } from "../vertex_array";

const vertices = [
    -1, -1, +0.0, +0.0,
    -1, +1, +0.0, +1.0,
    +1, +1, +1.0, +1.0,
    +1, -1, +1.0, +0.0,
];
const indices = [
    0, 1, 2,
    2, 3, 0
];

export function build(): VertexArray {
    const quadBuffers = {
        vertex: Buffer.static(new Float32Array(vertices), GL.ARRAY_BUFFER),
        index: Buffer.static(new Int32Array(indices), GL.ELEMENT_ARRAY_BUFFER)
    };
    return new VertexArray([{
        buffer: quadBuffers.vertex, descriptors: [
            { location: 0, arraySize: 2, baseType: GL.FLOAT, normalized: false },
            { location: 1, arraySize: 2, baseType: GL.FLOAT, normalized: false },
        ]
    }, { buffer: quadBuffers.index, descriptors: [] }]);
}