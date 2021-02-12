
// TODO: finish and test this

import { Texture, TextureKind } from "core/gfx";
import { v2, v4, Vector2, Vector4 } from "core/math";
import { Path } from "core/utils";

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
    [tileIndex: number]: { [field: string]: any }
}

interface TilesetData {
    image: string;
    tiles: TileData;
}

export class Tileset {
    readonly ready: boolean = false;
    readonly texture!: Readonly<Texture>;
    readonly tiles!: Readonly<TileData>;

    constructor(
        readonly path: string
    ) {
        console.log(`Loading tileset '${this.path}'`);
        fetch(path)
            .then(data => data.json())
            .then(json => this.load(json));
    }

    onload: (() => void) | null = null;
    onerror: ((evt: string | Event) => void) = e => console.error(`Error while loading tileset '${this.path}': `, e);

    private load(data: TilesetData) {
        console.log(data);
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

interface EllipseObject {
    id: number,
    type: "ellipse",
    x: number,
    y: number,
    width: number,
    height: number,
    props: { [field: string]: any }
}

interface PointObject {
    id: number,
    type: "point",
    x: number,
    y: number,
    props: { [field: string]: any }
}

interface PolygonObject {
    id: number,
    type: "polygon",
    x: number,
    y: number,
    points: [number, number][],
    props: { [field: string]: any }
}

interface PolylineObject {
    id: number,
    type: "polyline",
    x: number,
    y: number,
    points: [number, number][],
    props: { [field: string]: any }
}

interface TextObject {
    id: number,
    type: "text",
    x: number,
    y: number,
    width: number,
    height: number,
    text: {
        size: number,
        wrap: boolean,
        content: string
    },
    props: { [field: string]: any }
}

interface TileObject {
    id: number,
    type: "tile",
    tileId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    props: { [field: string]: any }
}

interface RectangleObject {
    id: number,
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number,
    props: { [field: string]: any }
}

type LevelObject =
    | EllipseObject
    | PointObject
    | PolygonObject
    | PolylineObject
    | TextObject
    | TileObject
    | RectangleObject

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
    readonly width: number,
    readonly height: number,
    readonly background: Vector4,
    readonly tilesets: readonly Readonly<Tileset>[],
    /** 
     * Collision data stored in a grid
     * 
     * `collision = level.collision[tileX + tileY * level.width]`
     * 
     * Where `tileX < level.width` and `tileY < level.height`
     */
    readonly collision: readonly CollisionKind[],
    /**
     * Array of tile layers
     * 
     * Each layer is an array of tiles
     * 
     * `tile = level.tiles[layer][tileX + tileY * level.width]`
     */
    readonly tile: readonly number[][],
    readonly object: { readonly [name: string]: Readonly<LevelObject> }
}

export class Level {
    readonly ready: boolean = false;
    readonly data!: LoadedLevelData
    /**
     * Width/height in pixels
     */
    readonly size!: { x: number, y: number };

    constructor(
        readonly path: string
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
                (<Tileset[]>this.data.tilesets)[index] = tileset;
            }

            // background RGBA hex -> RGBA Vector4
            (<Vector4>this.data.background) = v4.hex(data.background.substring(1));
            (<{ x: number, y: number }>this.size) = { x: this.data.width * TILESIZE, y: this.data.height * TILESIZE };

            if (this.onload != null) this.onload();
            (<boolean>this.ready) = true;
            console.log(`Finished loading level '${this.path}': `, this);
        });
    }
}