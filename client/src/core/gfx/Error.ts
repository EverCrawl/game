

export function glError(): string | null {
    const error = GL.getError();
    switch (error) {
        case GL.INVALID_ENUM: return "Unacceptable value has been specified for an enumerated argument.";
        case GL.INVALID_VALUE: return "Numeric argument is out of range.";
        case GL.INVALID_OPERATION: return "The specified command is not allowed for the current state.";
        case GL.INVALID_FRAMEBUFFER_OPERATION: return "The currently bound framebuffer is not framebuffer complete when trying to render to or to read from it.";
        case GL.OUT_OF_MEMORY: return "Not enough memory is left to execute the command.";
        case GL.CONTEXT_LOST_WEBGL: return "The WebGL context was lost.";
        default: return null;
    }
}

function isContextTypeSupported(type: string) {
    switch (type) {
        case "2d": return !!window.CanvasRenderingContext2D;
        case "bitmaprenderer": return !!window.ImageBitmapRenderingContext;
        case "webgl": return !!window.WebGLRenderingContext;
        case "webgl2": return !!window.WebGL2RenderingContext;
    }
}

export const enum ErrorKind {
    EmptyVertexArray = "E1VA",
    UnknownBaseType = "U2BT",
    ShaderCompileFailure = "S3CF",
    CreateFailure = "N4CF",
    ContextAcquireFailure = "C5AF",
    UnknownUniformType = "U6UT",
    InvalidUniformData = "I7UD",
    UnknownArrayType = "U8AT",
    Unsupported = "U9SP",
}

export function stringifyErrorKind(code: ErrorKind, extra?: any) {
    if (!DEBUG) return `GL operation failed. Code: ${code}`;
    switch (code) {
        case ErrorKind.EmptyVertexArray:
            return "Cannot create empty vertex array";
        case ErrorKind.UnknownBaseType:
            return `Unknown base type: ${extra.type}`;
        case ErrorKind.ShaderCompileFailure:
            return `[${extra.type && extra.type === 0x8B31 ? "VERTEX" : "FRAGMENT"} SHADER] Failed to compile:\n${extra.message}`;
        case ErrorKind.CreateFailure:
            return `Failed to create ${extra.what}: ${extra.why}`;
        case ErrorKind.ContextAcquireFailure:
            return `Failed to acquire context ${extra.contextId}. Supported: ${isContextTypeSupported(extra.contextId)}`;
        case ErrorKind.UnknownUniformType:
            return `Unknown uniform type: ${extra.type}`;
        case ErrorKind.InvalidUniformData:
            return `Attempted to upload ${extra.data} to uniform of type ${extra.type}`;
        case ErrorKind.UnknownArrayType:
            return `Unknown array type: ${extra.type}`;
        case ErrorKind.Unsupported:
            return `${extra.what} ${extra.plural === true ? "are" : "is"} unsupported. ${extra.info}`;
    }
}

export class GLError extends Error {
    constructor(
        code: ErrorKind,
        extra?: any
    ) {
        super(stringifyErrorKind(code, extra))
    }
}