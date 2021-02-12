
import { createShader, createProgram } from "./Common";
import { ErrorKind, GLError } from "./Error";

type UniformSetter = (data: number | number[]) => void;

type Uniform = {
    readonly name: string;
    readonly size: GLint;
    readonly type: string;
    readonly location: WebGLUniformLocation;
    readonly set: UniformSetter;
};

export class Shader {
    private static ID_SEQUENCE = 0;
    public readonly id: number;
    public readonly program: WebGLProgram;
    public readonly uniforms: { [name: string]: Uniform };

    constructor(
        vertex: string, fragment: string
    ) {
        this.id = Shader.ID_SEQUENCE++;
        // compile the shader
        const program = linkProgram(
            compileShader(vertex, GL.VERTEX_SHADER),
            compileShader(fragment, GL.FRAGMENT_SHADER)
        );
        this.program = program;
        // reflect uniforms
        this.uniforms = {};
        this.bind();
        for (let i = 0, len = GL.getProgramParameter(this.program, GL.ACTIVE_UNIFORMS); i < len; ++i) {
            const info = GL.getActiveUniform(this.program, i)!;
            const location = GL.getUniformLocation(program, info.name)!;
            this.uniforms[info.name] = {
                name: info.name,
                size: info.size,
                type: stringifyType(info.type),
                location,
                set: createSetter(info.type, location)
            };
        }
        this.unbind();
    }

    bind() {
        GL.useProgram(this.program);
    }

    unbind() {
        GL.useProgram(null);
    }
}

function buildShaderErrorMessage(shader: WebGLShader): string {
    const source = GL.getShaderSource(shader);
    const log = GL.getShaderInfoLog(shader);
    const type = GL.getShaderParameter(shader, GL.SHADER_TYPE);
    // if both sources are null, exit early
    if (source === null) {
        return `\n${log}\n`;
    }
    if (log === null) {
        return `Unknown error`;
    }
    // parse for line number and error
    const tokens = log
        .split("\n")
        .filter(it => it.length > 1)
        .map(it => it.replace(/(ERROR:\s)/g, ""))
        .map(it => it.split(":")).flat()
        .map(it => it.trim());
    const [line, token, error] = [parseInt(tokens[1]), tokens[2], tokens[3]];
    const lines = source.split(/\n|\r/g);
    // pad first line - this always works
    // because the first line in a webgl shader MUST be a #version directive
    // and no whitespace characters may precede it
    lines[0] = `    ${lines[0]}`;

    let padding = `${lines.length}`.length;

    let found = false;
    for (let i = 0; i < lines.length; ++i) {
        if (i === line - 1) {
            const whitespaces = lines[i].match(/\s+/);
            if (whitespaces !== null) {
                lines[i] = `${"-".repeat(whitespaces[0].length - 1)}> ${lines[i].trimStart()}`
            }
            lines[i] = `${" ".repeat(padding - `${i + 1}`.length)}${i + 1} +${lines[i]}`;
        } else {
            lines[i] = `${" ".repeat(padding - `${i + 1}`.length)}${i + 1} | ${lines[i]}`;
        }
    }
    lines.push(`${" ".repeat(padding)} |`);
    lines.push(`${" ".repeat(padding)} +-------> ${error}: ${token}`);
    lines.push(``);

    return lines.join("\n");
}

function compileShader(source: string, type: GLenum): WebGLShader {
    const shader = createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (DEBUG && GL.getShaderParameter(shader, GL.COMPILE_STATUS) === false) {
        throw new GLError(ErrorKind.ShaderCompileFailure, {
            type: GL.getShaderParameter(shader, GL.SHADER_TYPE) === GL.VERTEX_SHADER ? "VERTEX" : "FRAGMENT",
            message: buildShaderErrorMessage(shader)
        }).message;
    }
    return shader;
}

function linkProgram(vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
    const program = createProgram();
    GL.attachShader(program, vertex);
    GL.attachShader(program, fragment);
    GL.linkProgram(program);

    if (GL.getProgramParameter(program, /* LINK_STATUS */ 0x8B82) === false) {
        const log = GL.getProgramInfoLog(program);
        throw new GLError(ErrorKind.ShaderCompileFailure, { message: `${log ?? "Unknown error"}` });
    }
    return program;
}

function createSetter(/* shader: WebGLProgram,  */type: number, location: WebGLUniformLocation): UniformSetter {
    let typeInfo: [desc: "scalar" | "array" | "matrix", size: number, name: string];
    switch (type) {
        case 0x1400:
        case 0x1402:
        case 0x1404:
        case 0x8b56:
        case 0x8b5e:
        case 0x8b5f:
        case 0x8b60:
        case 0x8dc1:
        case 0x8dd2:
            typeInfo = ["scalar", 1, "uniform1i"]; break;
        case 0x1401:
        case 0x1403:
        case 0x1405:
            typeInfo = ["scalar", 1, "uniform1ui"]; break;
        case 0x8b53:
        case 0x8b57:
            typeInfo = ["array", 2, "uniform2iv"]; break;
        case 0x8b54:
        case 0x8b58:
            typeInfo = ["array", 3, "uniform3iv"]; break;
        case 0x8b55:
        case 0x8b59:
            typeInfo = ["array", 4, "uniform4iv"]; break;
        case 0x1406:
            typeInfo = ["scalar", 1, "uniform1f"]; break;
        case 0x8b50:
            typeInfo = ["array", 2, "uniform2fv"]; break;
        case 0x8b51:
            typeInfo = ["array", 3, "uniform3fv"]; break;
        case 0x8b52:
            typeInfo = ["array", 4, "uniform4fv"]; break;
        case 0x8dc6:
            typeInfo = ["array", 2, "uniform2uiv"]; break;
        case 0x8dc7:
            typeInfo = ["array", 3, "uniform3uiv"]; break;
        case 0x8dc8:
            typeInfo = ["array", 4, "uniform4uiv"]; break;
        case 0x8b5a:
            typeInfo = ["matrix", 2 * 2, "uniformMatrix2fv"]; break;
        case 0x8b65:
            typeInfo = ["matrix", 2 * 3, "uniformMatrix2x3fv"]; break;
        case 0x8b66:
            typeInfo = ["matrix", 2 * 4, "uniformMatrix2x4fv"]; break;
        case 0x8b67:
            typeInfo = ["matrix", 3 * 2, "uniformMatrix3x2fv"]; break;
        case 0x8b5b:
            typeInfo = ["matrix", 3 * 3, "uniformMatrix3fv"]; break;
        case 0x8b68:
            typeInfo = ["matrix", 3 * 4, "uniformMatrix3x4fv"]; break;
        case 0x8b69:
            typeInfo = ["matrix", 4 * 2, "uniformMatrix4x2fv"]; break;
        case 0x8b6a:
            typeInfo = ["matrix", 4 * 3, "uniformMatrix4x3fv"]; break;
        case 0x8b5c:
            typeInfo = ["matrix", 4 * 4, "uniformMatrix4fv"]; break;
        default: throw new GLError(ErrorKind.UnknownUniformType, { type });
    }

    const setter = typeInfo[2];
    switch (typeInfo[0]) {
        case "scalar": return function (data) {
            if (DEBUG && typeof data !== "number")
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), data });
            // TypeScript takes the stand that `Object.keys()` 
            // does not return only `keyof Object`, because of the 
            // prototype chain, which may not be correctly reflected
            // by the interface.
            // This is a hotpath, so we can't afford a runtime check
            // @ts-ignore |SAFETY| `setter` is always `keyof WebGL2RenderingContext`
            GL[setter](location, data);
        }
        case "array": return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== typeInfo[1]))
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), data });
            // @ts-ignore |SAFETY| same as above
            GL[setter](location, data);
        }
        case "matrix": return function (data) {
            if (DEBUG && (!Array.isArray(data) || data.length !== typeInfo[1]))
                throw new GLError(ErrorKind.InvalidUniformData, { type: stringifyType(type), data });
            // @ts-ignore |SAFETY| same as above
            GL[setter](location, false, data);
        }
    }
}

function stringifyType(type: number): string {
    switch (type) {
        case 0x1400: return "byte";
        case 0x1402: return "short";
        case 0x1404: return "int";
        case 0x8b56: return "bool";
        case 0x8b5e: return "2d float sampler";
        case 0x8b5f: return "3d float sampler";
        case 0x8dc1: return "2d float sampler array";
        case 0x8dd2: return "2d unsigned int sampler";
        case 0x8b60: return "cube sampler";
        case 0x1401: return "unsigned byte";
        case 0x1403: return "unsigned short";
        case 0x1405: return "unsigned int";
        case 0x8b53: return "int 2-component vector";
        case 0x8b54: return "int 3-component vector";
        case 0x8b55: return "int 4-component vector";
        case 0x8b57: return "bool 2-component vector";
        case 0x8b58: return "bool 3-component vector";
        case 0x8b59: return "bool 4-component vector";
        case 0x1406: return "float";
        case 0x8b50: return "float 2-component vector";
        case 0x8b51: return "float 3-component vector";
        case 0x8b52: return "float 4-component vector";
        case 0x8dc6: return "unsigned int 2-component vector";
        case 0x8dc7: return "unsigned int 3-component vector";
        case 0x8dc8: return "unsigned int 4-component vector";
        case 0x8b5a: return "float 2x2 matrix";
        case 0x8b65: return "float 2x3 matrix";
        case 0x8b66: return "float 2x4 matrix";
        case 0x8b5b: return "float 3x3 matrix";
        case 0x8b67: return "float 3x2 matrix";
        case 0x8b68: return "float 3x4 matrix";
        case 0x8b5c: return "float 4x4 matrix";
        case 0x8b69: return "float 4x2 matrix";
        case 0x8b6a: return "float 4x3 matrix";
        default: throw new GLError(ErrorKind.UnknownUniformType, { type });
    }
}
