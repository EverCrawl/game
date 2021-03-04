

type Props = { [field: string]: any };

export interface BaseObject {
    id: number,
    x: number,
    y: number,
    props?: Props
}

export interface EllipseObject extends BaseObject {
    type: "ellipse",
    width: number,
    height: number,
}

export interface PointObject extends BaseObject {
    type: "point",
}

export interface PolygonObject extends BaseObject {
    type: "polygon",
    points: [number, number][],
}

export interface PolylineObject extends BaseObject {
    type: "polyline",
    points: [number, number][],
}

export interface TextObject extends BaseObject {
    type: "text",
    width: number,
    height: number,
    text: {
        size: number,
        wrap: boolean,
        content: string
    },
}

export interface TileObject extends BaseObject {
    type: "tile",
    tileId: number,
    width: number,
    height: number,
}

export interface RectangleObject extends BaseObject {
    type: "rect",
    width: number,
    height: number,
}

export interface PortalObject extends BaseObject {
    type: "portal",
    width: number,
    height: number,
    props: Props & {
        to: string,
        direction: "left" | "right"
    }
}

export type LevelObject =
    | EllipseObject
    | PointObject
    | PolygonObject
    | PolylineObject
    | TextObject
    | TileObject
    | RectangleObject
    | PortalObject