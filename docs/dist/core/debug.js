import {v2} from "../math/index.js";
import {CollisionKind, TILESIZE, TILESIZE_HALF} from "./map/index.js";
export function drawBorderAABB(lr, offset, aabb, color) {
  const top = offset[1] + aabb.top;
  const bottom = offset[1] + aabb.bottom;
  const left = offset[0] + aabb.left;
  const right = offset[0] + aabb.right;
  lr.command.line(v2(left, top), v2(right, top), color);
  lr.command.line(v2(right, top), v2(right, bottom), color);
  lr.command.line(v2(right, bottom), v2(left, bottom), color);
  lr.command.line(v2(left, bottom), v2(left, top), color);
}
const SlopeLeft = [CollisionKind.SlopeLeft, CollisionKind.SlopeLeftBottom, CollisionKind.SlopeLeftTop];
const SlopeFull = [CollisionKind.SlopeLeft, CollisionKind.SlopeRight];
const SlopeTop = [CollisionKind.SlopeLeftTop, CollisionKind.SlopeRightTop];
export function drawSlope(renderer, topLeft, kind, color) {
  let apex = v2();
  if (SlopeLeft.includes(kind)) {
    apex[0] = topLeft[0];
  } else {
    apex[0] = topLeft[0] + TILESIZE;
  }
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
  renderer.command.line(v2(topLeft[0], topLeft[1] + bottomOffsetY), v2(topLeft[0] + TILESIZE, topLeft[1] + bottomOffsetY), color);
  renderer.command.line(v2(topLeft[0], topLeft[1] + bottomOffsetY), apex, color);
  renderer.command.line(apex, v2(topLeft[0] + TILESIZE, topLeft[1] + bottomOffsetY), color);
}
