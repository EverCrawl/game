import { v2 } from "common/math";
import { Renderer } from "./renderer";
import { Texture, TextureKind } from "./texture";

// TODO: fix sprite edge bleeding

export const enum Direction {
    Left = -1,
    Right = 1,
}

export interface AnimationMap {
    [name: string]: AnimationDesc;
}

export interface LayerMap {
    [name: string]: Layer;
}

export class Sprite {
    private spritesheet: Spritesheet_Friend;

    // current animation
    private animation_: string;
    private frameIndex: number;
    private lastAnimationStep: number;

    direction: Direction;
    lastDirection: Direction;
    moving: boolean;

    constructor(
        spritesheet: Spritesheet,
    ) {
        this.spritesheet = spritesheet as unknown as Spritesheet_Friend;
        this.animation_ = "Idle";
        this.direction = Direction.Right;
        this.lastDirection = Direction.Right;
        this.moving = false;

        this.frameIndex = 0;
        this.lastAnimationStep = Date.now();
    }

    get animations(): Readonly<AnimationMap> | null {
        return this.spritesheet.animations;
    }

    set animation(value: string) {
        if (DEBUG && this.spritesheet.ready && (this.spritesheet.animations == null || this.spritesheet.animations[value] == null)) {
            console.warn(`Animation ${value} does not exist on spritesheet ${this.spritesheet.path}`);
        }

        if (this.animation_ !== value) {
            this.frameIndex = 0;
            this.lastAnimationStep = Date.now();
            this.animation_ = value;
        }
    }

    get animation(): string {
        return this.animation_;
    }

    get width() {
        return (this.spritesheet.maxSize?.w ?? 0) / 2;
    }

    get height() {
        return (this.spritesheet.maxSize?.h ?? 0) / 2;
    }

    draw(renderer: Renderer, layer: number, pos = v2(), rot = 0, scale = v2(1, 1)) {
        if (!this.spritesheet.loaded_) return;

        const anim = this.spritesheet.animations![this.animation_];
        if (!anim) return;

        const now = Date.now();
        if (now - this.lastAnimationStep > anim.frames[this.frameIndex].delay) {
            this.lastAnimationStep = now;
            this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
        }

        for (const spriteLayer of Object.keys(this.spritesheet.layers!)) {
            const anim = this.spritesheet.layers![spriteLayer][this.animation_];
            if (!anim) continue;

            const uv = anim.frames[this.frameIndex].uv;
            const size = anim.frames[this.frameIndex].size;
            renderer.command.quad(this.spritesheet.texture!, layer,
                [uv.x, uv.y], [uv.w, uv.h],
                [pos[0], pos[1] - size.h / 2],
                rot,
                [size.w * scale[0] * this.direction, size.h * scale[1]]);
        }
    }
}


interface Size {
    w: number, h: number;
}

interface UV {
    x: number, y: number, w: number, h: number
}

interface Frame {
    uv: UV;
    size: Size;
    delay: number;
}

interface Animation {
    frames: Frame[];
    direction: string;
}

interface Layer {
    [name: string]: Animation
}

interface FrameDesc {
    delay: number;
}

interface AnimationDesc {
    frames: FrameDesc[];
    duration: number;
}

interface Spritesheet_Friend {
    readonly path: string
    loaded_: boolean;
    animations: AnimationMap | null;
    layers: LayerMap | null;
    texture: Texture | null;
    maxSize: Size | null;
    readonly ready: boolean;
    load(json: any): void;
}

export class Spritesheet {
    private static cache: Map<string, Spritesheet> = new Map();

    public readonly path: string
    private loaded_: boolean;

    private animations: AnimationMap | null = null;
    private layers: LayerMap | null = null;
    private texture: Texture | null = null;
    private maxSize: Size | null = null;

    constructor(
        path: string
    ) {
        this.path = path;
        this.loaded_ = false;

        if (Spritesheet.cache.has(path)) return Spritesheet.cache.get(path)!;
        else {
            fetch(path)
                .then(it => it.json())
                .then(it => this.load(it));
            Spritesheet.cache.set(path, this)
        }
    }

    get ready() {
        return this.loaded_;
    }

    private load(json: any) {
        const transformed = parseSpriteData(json, this.path.substr(0, this.path.lastIndexOf("/")));
        this.animations = transformed.animations;
        this.layers = transformed.layers;
        this.texture = Texture.create(TextureKind.Image2D, { path: transformed.spritesheet, mipmap: false });
        this.maxSize = transformed.maxSize;
        this.loaded_ = true;
        console.log(`Finished loading ${this.path}`, this);
    }
}

function parseSpriteData(json: any, dir: string): any {
    let animations: { [name: string]: any } = {};
    let layers: { [name: string]: any } = {};
    let maxSize = { w: 0, h: 0 };

    const jmeta = json["meta"]
    const jmeta_w = jmeta["size"]["w"];
    const jmeta_h = jmeta["size"]["h"];
    const frameTags = jmeta["frameTags"];

    for (const layer of jmeta["layers"]) {
        layers[layer["name"]] = {};
        let n = 0;
        nextAnimation: while (n < frameTags.length) {
            const animation = frameTags[n];
            const animationName = animation["name"];
            const length = parseInt(animation["to"]) - parseInt(animation["from"]) + 1;
            let totalDuration = 0.0;
            let frames: any[] = [];
            for (let i = 0; i < length; ++i) {
                const frameName = `${layer["name"]} ${animationName} ${i}`;
                if (!json["frames"][frameName]) continue nextAnimation;

                const raw_frame = json["frames"][frameName];
                const info = raw_frame["frame"];
                const fx = parseFloat(info["x"]);
                const fy = parseFloat(info["y"]);
                const fw = parseFloat(info["w"]);
                const fh = parseFloat(info["h"]);

                const duration = parseFloat(raw_frame["duration"]);
                totalDuration += duration;
                if (maxSize.w < fw * 2) maxSize.w = fw * 2;
                if (maxSize.h < fh * 2) maxSize.h = fh * 2;

                const uv = {
                    x: fx / jmeta_w,
                    y: fy / jmeta_h,
                    w: fw / jmeta_w,
                    h: fh / jmeta_h
                };
                const size = { w: fw, h: fh };
                frames.push({
                    uv: uv,
                    size: size,
                    delay: duration
                });
            }
            animations[animationName] = {
                frames: frames.map((f: any): any => ({ delay: f.delay })),
                duration: totalDuration
            };
            layers[layer["name"]][animationName] = {
                frames: frames,
                duration: totalDuration
            };
            n += 1;
        }
    }

    let spritesheet = dir + "/" + jmeta["image"];
    return {
        animations: animations,
        layers: layers,
        spritesheet: spritesheet,
        maxSize: maxSize
    };
}