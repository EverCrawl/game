
import { loadSync } from "tiled-loader";
// TODO: fix this jank import
import { CollisionKind } from "tiled-loader/dist/core";
import path from "path";
import { walk } from "server/util";
import Log from "server/util/log";
import { World } from "uecs";

export interface Destination {
    level: string,
    x: number,
    y: number
}

export class LevelStorage {
    levels: Record<string, Level>;

    constructor(
        public readonly root: string
    ) {
        this.levels = {};
        for (const file of walk(path.resolve(process.cwd(), root), ".xml")) {
            const name = path.basename(path.relative(root, file), ".xml");
            this.levels[name] = new Level(name, file);
        }
        Log.info(`Level storage initialized with ${Object.keys(this.levels).length} levels`);
    }

    destination(portal: PortalObject): Destination {
        const dest = portal.props.to.split(".");

        const destLevel = this.levels[dest[0]];
        const destPortal = destLevel.data.object[dest[1]] as PortalObject;

        const direction = destPortal.props.direction === "left" ? -1 : 1;
        const offset = 2 * TILESIZE * direction;
        return {
            level: dest[0],
            x: destPortal.x + offset,
            y: destPortal.y
        }
    }
}

export const TILESIZE = 16;

interface TileData {
    [tileIndex: number]: { anim: number[], props: { [field: string]: any } }
}

interface TilesetData {
    image: string;
    tiles: TileData;
}

export class Tileset {
    tiles!: TileData;

    constructor(
        public path: string
    ) {
        const data = loadSync({ filePath: path })![".amt"];
        this.load(JSON.parse(data));
    }

    private load(data: TilesetData) {
        this.tiles = data.tiles;
        Log.info(`Loaded tileset '${this.path}'`);
    }
}

type Props = { [field: string]: any };

interface BaseObject {
    id: number,
    x: number,
    y: number,
    props?: Props
}

interface EllipseObject extends BaseObject {
    type: "ellipse",
    width: number,
    height: number,
}

interface PointObject extends BaseObject {
    type: "point",
}

interface PolygonObject extends BaseObject {
    type: "polygon",
    points: [number, number][],
}

interface PolylineObject extends BaseObject {
    type: "polyline",
    points: [number, number][],
}

interface TextObject extends BaseObject {
    type: "text",
    width: number,
    height: number,
    text: {
        size: number,
        wrap: boolean,
        content: string
    },
}

interface TileObject extends BaseObject {
    type: "tile",
    tileId: number,
    width: number,
    height: number,
}

interface RectangleObject extends BaseObject {
    type: "rect",
    width: number,
    height: number,
}

interface PortalObject extends BaseObject {
    type: "portal",
    width: number,
    height: number,
    props: Props & {
        to: string,
        direction: "left" | "right"
    }
}

type LevelObject =
    | EllipseObject
    | PointObject
    | PolygonObject
    | PolylineObject
    | TextObject
    | TileObject
    | RectangleObject
    | PortalObject

interface LevelData {
    width: number,
    height: number,
    tilesets: Tileset[],
    /** 
     * Collision data stored in a grid
     * 
     * `collision = level.collision[tileX + tileY * level.width]`
     * 
     * Where `tileX < level.width` and `tileY < level.height`
     */
    collision: CollisionKind[],
    object: { [name: string]: LevelObject }
}

export class Level {
    data!: LevelData
    /**
     * Width/height in pixels
     */
    size!: { x: number, y: number };

    constructor(
        public name: string,
        public file: string
    ) {
        const data = loadSync({ filePath: path.resolve(file) })![".amt"];
        this.load(JSON.parse(data));
    }

    collisionKind(tx: number, ty: number): CollisionKind {
        return this.data.collision[tx + ty * this.data.width];
    }

    private load(data: any) {
        this.data = data;
        this.size = { x: this.data.width * TILESIZE, y: this.data.height * TILESIZE };
        // load tilesets
        const tilesets = [];
        for (let i = 0; i < data.tilesets.length; ++i) {
            const tpath = path.join(path.dirname(this.file), data.tilesets[i]).replace(".amt", ".xml");
            tilesets.push(new Tileset(tpath))
        }
        Log.info(`Loaded level '${this.file}'`);
    }
}

