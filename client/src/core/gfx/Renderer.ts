import { Matrix3, m3, Vector2, Vector4, v4, Vector3 } from "core/math";
import { Buffer, Camera, Shader, Texture, VertexArray } from "core/gfx";
import { DynamicBuffer } from "./Buffer";
import * as Shaders from "./glsl";
import * as Meshes from "./mesh";

// TODO(speed): optimize rendering - it's about 94% of the frame time right now

// TODO(speed): draw each tilemap chunk at once through instanced rendering
// quad vertices + indices
//      -> drawn N times, where N = chunk.width * chunk.height
// 3 uniforms
//      - uint tileset ID 
//      - uint tile ID
//      - vec2 position


interface SpriteRenderCommand {
    texture: Texture;
    uv: Vector4;
    model: Matrix3;
}

interface TileRenderCommand {
    texture: Readonly<Texture>;
    tile: number;
    model: Matrix3;
}

export class Renderer {
    private shaders: {
        tile: Shader;
        sprite: Shader;
        line: Shader;
        point: Shader;
    }
    private vao: {
        quad: VertexArray;
        point: VertexArray;
        line: VertexArray;
    }
    private commands: {
        tile: {
            [layer: number]: TileRenderCommand[];
        }
        sprite: {
            [layer: number]: SpriteRenderCommand[];
        }
    }
    private buffers: {
        point: {
            cpu: number[];
            gpu: DynamicBuffer;
        };
        line: {
            cpu: number[];
            gpu: DynamicBuffer;
        };
    }

    camera: Camera | null;

    background: Vector4 = v4(0, 0, 0, 1);

    options: {
        maxLines: number;
        maxPoints: number;
        lineWidth: number;
    }

    constructor(
        options: {
            maxLines?: number,
            maxPoints?: number,
            lineWidth?: number
        } = {}
    ) {
        this.options = {
            maxLines: options.maxLines ?? 4096 * 4,
            maxPoints: options.maxPoints ?? 8192,
            lineWidth: options.lineWidth ?? 2
        };
        this.shaders = {
            tile: Shaders.Tile.compile(),
            sprite: Shaders.Sprite.compile(),
            line: Shaders.Line.compile(),
            point: Shaders.Point.compile(),
        };
        this.commands = {
            tile: [],
            sprite: []
        };
        this.buffers = {
            point: {
                cpu: [],
                gpu: Buffer.dynamic((4 * 2) + (4 * 3) * this.options.maxPoints, GL.ARRAY_BUFFER)
            },
            line: {
                cpu: [],
                gpu: Buffer.dynamic((4 * 2) + (4 * 4) * this.options.maxLines, GL.ARRAY_BUFFER)
            }
        };
        this.vao = {
            quad: Meshes.Quad22I.build(),
            point: new VertexArray([{
                buffer: this.buffers.point.gpu, descriptors: [
                    { location: 0, arraySize: 2, baseType: GL.FLOAT, normalized: false },
                    { location: 1, arraySize: 3, baseType: GL.FLOAT, normalized: false },
                ]
            }]),
            line: new VertexArray([{
                buffer: this.buffers.line.gpu, descriptors: [
                    { location: 0, arraySize: 2, baseType: GL.FLOAT, normalized: false },
                    { location: 1, arraySize: 4, baseType: GL.FLOAT, normalized: false },
                ]
            }]),
        };

        this.camera = null;
    }

    command = {
        tile: (
            texture: Readonly<Texture>,
            layer: number,
            tile: number,
            position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            const model = m3();
            m3.translate(model, position);
            m3.rotate(model, rotation);
            m3.scale(model, scale);

            const cmd: TileRenderCommand = { texture, tile, model };

            if (!this.commands.tile[layer]) {
                this.commands.tile[layer] = [cmd];
            } else {
                this.commands.tile[layer].push(cmd);
            }
        },
        quad: (
            texture: Texture,
            layer: number,
            uvMin: Vector2 = [0, 0], uvMax: Vector2 = [1, 1],
            position: Vector2 = [0, 0], rotation: number = 0, scale: Vector2 = [1, 1]
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            const model = m3();
            m3.translate(model, position);
            m3.rotate(model, rotation);
            m3.scale(model, scale);

            const uv: Vector4 = v4(uvMin[0], uvMin[1], uvMax[0], uvMax[1]);

            const cmd: SpriteRenderCommand = { texture, uv, model };

            if (!this.commands.sprite[layer]) {
                this.commands.sprite[layer] = [cmd];
            } else {
                this.commands.sprite[layer].push(cmd);
            }
        },
        line: (
            p0: Vector2,
            p1: Vector2,
            color: Vector4 = [0.5, 0.5, 0.5, 1.0],
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            this.buffers.line.cpu.push(
                ...p0, ...color,
                ...p1, ...color
            );
        },
        point: (
            position: Vector2,
            color: Vector3 = [0.5, 0.5, 0.5],
        ) => {
            if (DEBUG && this.camera == null) {
                throw new Error(`Renderer has no bound camera`);
            }
            this.buffers.point.cpu.push(...position, ...color);
        }
    }

    flush() {
        if (DEBUG && this.camera == null) {
            throw new Error(`Renderer has no bound camera`);
        }

        GL.clearColor(...this.background);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        // setup common state
        GL.lineWidth(this.options.lineWidth ?? 2);
        GL.enable(GL.BLEND);
        GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);

        { // tiles
            // setup state
            const shader = this.shaders.tile;
            shader.bind();
            shader.uniforms.uVIEW.set(this.camera!.view);
            shader.uniforms.uPROJECTION.set(this.camera!.projection);
            // TODO(speed): multiple textures
            shader.uniforms.uATLAS.set(0);
            this.vao.quad.bind();
            const commands = this.commands.tile;

            // draw
            const layers = Object.keys(commands).sort((a, b) => +a - +b);
            for (let i = 0, len = layers.length; i < len; ++i) {
                const cmdList = commands[+layers[i]];
                for (let j = 0, len = cmdList.length; j < len; ++j) {
                    cmdList[j].texture && cmdList[j].texture.bind(0);
                    shader.uniforms.uTILE.set(cmdList[j].tile);
                    shader.uniforms.uMODEL.set(cmdList[j].model);
                    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_INT, 0);
                }
            }
        }
        { // sprites
            // setup state
            const shader = this.shaders.sprite;
            shader.bind();
            shader.uniforms.uVIEW.set(this.camera!.view);
            shader.uniforms.uPROJECTION.set(this.camera!.projection);
            // TODO(speed): multiple textures
            shader.uniforms.uTEXTURE.set(0);
            this.vao.quad.bind();
            const commands = this.commands.sprite;

            // draw
            const layers = Object.keys(commands).sort((a, b) => +a - +b);
            for (let i = 0, len = layers.length; i < len; ++i) {
                const cmdList = commands[+layers[i]];
                for (let j = 0, len = cmdList.length; j < len; ++j) {
                    cmdList[j].texture && cmdList[j].texture.bind(0);
                    shader.uniforms.uUV.set(cmdList[j].uv);
                    shader.uniforms.uMODEL.set(cmdList[j].model);
                    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_INT, 0);
                }
            }
        }
        { // lines
            // setup state
            this.shaders.line.bind();
            this.shaders.line.uniforms.uVIEW.set(this.camera!.view);
            this.shaders.line.uniforms.uPROJECTION.set(this.camera!.projection);
            this.vao.line.bind();

            // draw
            this.buffers.line.gpu.upload(new Float32Array(this.buffers.line.cpu), 0);
            GL.drawArrays(GL.LINES, 0, this.buffers.line.cpu.length / 6);
        }
        { // points
            // setup state
            this.shaders.point.bind();
            this.shaders.point.uniforms.uVIEW.set(this.camera!.view);
            this.shaders.point.uniforms.uPROJECTION.set(this.camera!.projection);
            this.vao.point.bind();

            // draw
            this.buffers.point.gpu.upload(new Float32Array(this.buffers.point.cpu), 0);
            GL.drawArrays(GL.POINTS, 0, this.buffers.point.cpu.length / 5);
        }

        // clear queues
        this.commands.tile = [];
        this.commands.sprite = [];
        this.buffers.line.cpu = [];
        this.buffers.point.cpu = [];
    }
}