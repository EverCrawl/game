
import { Renderer, Texture, TextureKind } from "client/core/gfx";
import { v2, v4, Vector2, Vector4 } from "common/math";
import { Path } from "common/utils";
import { LevelObject, TextObject } from "common/map/object";
import { Text } from "../gfx/text";

export const enum CollisionKind {
    None = 0,
    Full = 1,
    Ladder = 2,
    Platform = 3,
    SlopeLeft = 4,
    SlopeRight = 5,
    SlopeLeftBottom = 6,
    SlopeRightBottom = 7,
    SlopeLeftTop = 8,
    SlopeRightTop = 9,
}

export const TILESIZE = 16;
export const TILESIZE_HALF = TILESIZE / 2;
export const TILE_SCALE: Vector2 = [TILESIZE_HALF, TILESIZE_HALF];
export const TILESET_ID_MASK = 0b11111000_00000000;
export function TilesetId(value: number): number {
    return value & TILESET_ID_MASK;
}
export const TILE_ID_MASK = 0b00000111_11111111;
export function TileId(value: number): number {
    return value & TILE_ID_MASK;
}

interface TileData {
    [tileIndex: number]: { anim: number[], props: { [field: string]: any } }
}

interface TilesetData {
    image: string;
    tiles: TileData;
}

export class Tileset {
    ready: boolean = false;
    texture!: Texture;
    tiles!: TileData;

    constructor(
        public path: string
    ) {
        console.log(`Loading tileset '${this.path}'`);
        fetch(path)
            .then(data => data.json())
            .then(json => this.load(json));
    }

    onload: (() => void) | null = null;
    onerror: ((evt: string | Event) => void) = e => console.error(`Error while loading tileset '${this.path}': `, e);

    private load(data: TilesetData) {
        const path = Path.join(Path.dirname(this.path), data.image);
        const tex = Texture.create(TextureKind.Atlas, { path, tilesize: TILESIZE });
        tex.onload = () => {
            (<Texture>this.texture) = tex;
            (<TileData>this.tiles) = data.tiles;

            (<boolean>this.ready) = true;
            if (this.onload != null) this.onload();
            console.log(`Finished loading tileset '${this.path}': `, this);
        }
        tex.onerror = this.onerror;
    }
}

interface LevelData {
    width: number,
    height: number,
    background: string,
    tilesets: string[],
    /** 
     * Collision data stored in a grid
     * 
     * `collision = level.collision[tileX + tileY * level.width]`
     * 
     * Where `tileX < level.width`
     * and `tileY < level.height`
     * 
     * @see {CollisionKind}
     */
    collision: number[],
    /**
     * Array of tile layers
     * 
     * Each layer is an array of tiles
     * 
     * `tile = level.tiles[layer][tileX + tileY * level.width]`
     */
    tile: number[][],
    object: { [name: string]: LevelObject }
}

interface LoadedLevelData {
    width: number,
    height: number,
    background: Vector4,
    tilesets: Tileset[],
    /** 
     * Collision data stored in a grid
     * 
     * `collision = level.collision[tileX + tileY * level.width]`
     * 
     * Where `tileX < level.width` and `tileY < level.height`
     */
    collision: CollisionKind[],
    /**
     * Array of tile layers
     * 
     * Each layer is an array of tiles
     * 
     * `tile = level.tiles[layer][tileX + tileY * level.width]`
     */
    tile: number[][],
    object: { [name: string]: LevelObject },
    text: Text[]
}

export class Level {
    ready: boolean = false;
    data!: LoadedLevelData
    /**
     * Width/height in pixels
     */
    size!: { x: number, y: number };

    constructor(
        public path: string
    ) {
        console.log(`Loading level '${this.path}'`);
        fetch(path)
            .then(data => data.json())
            .then(json => this.load(json));
    }

    collisionKind(tx: number, ty: number): CollisionKind {
        return this.data.collision[tx + ty * this.data.width];
    }

    onload: (() => void) | null = null
    onerror: ((evt: string | Event) => void) = e => console.error(`Error while loading level '${this.path}': `, e);

    private animIndex = 0;
    private lastAnimStep = Date.now();
    render(renderer: Renderer, worldOffset: Vector2) {
        renderer.background = this.data.background;
        // render level tile layers
        let renderLayerId = -10;
        for (let idx = 0; idx < this.data.tile.length; ++idx) {
            for (let y = 0; y < this.data.height; ++y) {
                for (let x = 0; x < this.data.width; ++x) {
                    let tile = this.data.tile[idx][x + y * this.data.width];
                    if (tile === 0) continue;
                    // have to remove '1' to get the actual ID
                    // because all IDs are offset by '1' due to '0' having a special value
                    tile -= 1;
                    const tilesetIndex = tile & TILESET_ID_MASK;
                    const tileset = this.data.tilesets[tilesetIndex];
                    let tileId = tile & TILE_ID_MASK;
                    const anim = tileset.tiles[tileId]?.anim;
                    if (anim && anim.length > 0) {
                        // tile has animation
                        tileId = anim[this.animIndex % anim.length];
                    }
                    // tiles are rendered from the center
                    // so we add TILESIZE_HALF to offset it 
                    // to the top-left corner
                    const tilePos = v2(
                        TILESIZE_HALF + x * TILESIZE + worldOffset[0],
                        TILESIZE_HALF + y * TILESIZE + worldOffset[1]
                    );
                    renderer.command.tile(
                        tileset.texture, renderLayerId++, tileId,
                        tilePos, 0, TILE_SCALE);
                }
            }
        }

        // render text
        for (let i = 0; i < this.data.text.length; ++i) {
            const obj = this.data.text[i];
            const pos = v2(
                worldOffset[0] + obj.data.x + obj.data.width / 2,
                worldOffset[1] + obj.data.y + obj.data.height / 2
            );
            renderer.command.text(
                obj, pos, 0, [obj.data.width / 2, obj.data.height / 2]);
        }

        // TODO: per-animation step
        const now = Date.now();
        if (now - this.lastAnimStep >= 150 /*ms*/) {
            this.animIndex++;
            this.lastAnimStep = now;
        }
    }

    private load(data: LevelData) {
        // load tilesets first
        const promises = [];
        for (let tilesetIndex = 0; tilesetIndex < data.tilesets.length; ++tilesetIndex) {
            promises.push(new Promise<[number, Tileset]>((ok, err) => {
                const path = Path.join(Path.dirname(this.path), data.tilesets[tilesetIndex]);
                const tileset = new Tileset(path);
                tileset.onload = () => ok([tilesetIndex, tileset]);
                tileset.onerror = e => err(e);
            }));
        }

        Promise.all(promises).then(results => {
            // @ts-ignore |SAFETY| type-safe because we're
            // transforming `this.data` to be `LoadedLevelData`
            this.data = data;

            // use loaded tilesets
            for (const [index, tileset] of results) {
                this.data.tilesets[index] = tileset;
            }

            // load text objects
            this.data.text = [];
            const objects = Object.values(this.data.object);
            for (let i = 0; i < objects.length; ++i) {
                if (objects[i].type === "text") {
                    this.data.text.push(new Text(objects[i] as TextObject));
                }
            }

            // background RGBA hex -> RGBA Vector4
            this.data.background = v4.hex(data.background.substring(1));
            this.size = { x: this.data.width * TILESIZE, y: this.data.height * TILESIZE };

            if (this.onload != null) this.onload();
            this.ready = true;
            console.log(`Finished loading level '${this.path}': `, this);
        });
    }
}