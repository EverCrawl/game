import { ErrorKind, GLError, glError } from "./Error";

declare global {
    const GL: WebGL2RenderingContext;
}

export function InitGL(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
    // @ts-ignore |SAFETY| see below
    if (window.GL) throw new Error(`WebGL2 context already exists!`);
    const gl = canvas.getContext("webgl2", options);
    if (gl == null) throw new GLError(ErrorKind.ContextAcquireFailure, { contextId: "WebGL2" });
    // @ts-ignore |SAFETY| safe because only one context may exist at a time
    window.GL = gl;
}

export function createShader(type: GLenum): WebGLShader {
    const shader = GL.createShader(type);
    if (!shader) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Shader", why: glError() });
    }
    return shader;
}

export function createProgram(): WebGLShader {
    const shader = GL.createProgram();
    if (!shader) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Program", why: glError() });
    }
    return shader;
}

export function createBuffer(): WebGLBuffer {
    const buffer = GL.createBuffer();
    if (!buffer) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Buffer", why: glError() });
    }
    return buffer;
}

export function createVertexArray(): WebGLVertexArrayObject {
    const vertexArray = GL.createVertexArray();
    if (!vertexArray) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Vertex Array", why: glError() });
    }
    return vertexArray;
}

export function createTexture(): WebGLTexture {
    const texture = GL.createTexture();
    if (!texture) {
        throw new GLError(ErrorKind.CreateFailure, { what: "Texture", why: glError() });
    }
    return texture;
}
