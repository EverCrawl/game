
import { v2, Vector2, Vector4, AABB } from "core/math";
import { Renderer } from "./gfx";
import { CollisionKind, TILESIZE, TILESIZE_HALF } from "./map";

export function drawBorderAABB(lr: Renderer, offset: Vector2, aabb: AABB, color: Vector4) {
    const top = offset[1] + aabb.top;
    const bottom = offset[1] + aabb.bottom;
    const left = offset[0] + aabb.left;
    const right = offset[0] + aabb.right;
    lr.command.line(
        v2(left, top),
        v2(right, top),
        color
    );
    lr.command.line(
        v2(right, top),
        v2(right, bottom),
        color
    );
    lr.command.line(
        v2(right, bottom),
        v2(left, bottom),
        color
    );
    lr.command.line(
        v2(left, bottom),
        v2(left, top),
        color
    );
}

const SlopeLeft = [CollisionKind.SlopeLeft, CollisionKind.SlopeLeftBottom, CollisionKind.SlopeLeftTop];
const SlopeFull = [CollisionKind.SlopeLeft, CollisionKind.SlopeRight];
const SlopeTop = [CollisionKind.SlopeLeftTop, CollisionKind.SlopeRightTop];

type SlopeKind =
    | CollisionKind.SlopeLeft
    | CollisionKind.SlopeRight
    | CollisionKind.SlopeLeftBottom
    | CollisionKind.SlopeRightBottom
    | CollisionKind.SlopeLeftTop
    | CollisionKind.SlopeRightTop

export function drawSlope(renderer: Renderer, topLeft: Vector2, kind: SlopeKind, color: Vector4) {
    // find the top-most vertex
    let apex = v2();
    // x-axis
    if (SlopeLeft.includes(kind)) {
        apex[0] = topLeft[0];
    }
    else {
        apex[0] = topLeft[0] + TILESIZE;
    }

    // y-axis
    if (SlopeFull.includes(kind)) {
        apex[1] = topLeft[1];
    } else {
        apex[1] = topLeft[1] + TILESIZE_HALF;
    }

    let bottomOffsetY = TILESIZE;
    if (SlopeTop.includes(kind)) {
        bottomOffsetY -= TILESIZE_HALF;
        apex[1] -= TILESIZE_HALF;
    }

    // bottom
    renderer.command.line(
        v2(topLeft[0], topLeft[1] + bottomOffsetY),
        v2(topLeft[0] + TILESIZE, topLeft[1] + bottomOffsetY),
        color);
    // left
    renderer.command.line(
        v2(topLeft[0], topLeft[1] + bottomOffsetY),
        apex,
        color);
    // right
    renderer.command.line(
        apex,
        v2(topLeft[0] + TILESIZE, topLeft[1] + bottomOffsetY),
        color);
}