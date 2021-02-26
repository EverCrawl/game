

import { m3, Matrix3, v2, Vector2 } from "./";

function computeNormals(polygon: Vector2[]): Vector2[] {
    if (polygon.length < 2) throw new Error(`Normal computation requires at least 2 points`);
    const normals: Vector2[] = [];
    for (let i1 = 0; i1 < polygon.length; i1++) {
        const i2 = (i1 + 1) % polygon.length;

        const p1 = polygon[i1];
        const p2 = polygon[i2];

        normals.push(v2.perp(v2.norm(v2.sub(v2.clone(p2), p1))));
    }
    return normals;
}

function computeMidpoint(a: Vector2, b: Vector2): Vector2 {
    return v2(
        a[0] + (b[0] - a[0]) * 0.5,
        a[1] + (b[1] - a[1]) * 0.5,
    );
}

function computeCentroid(polygon: Vector2[]): Vector2 {
    // https://stackoverflow.com/a/2792464/11953579
    const CG = v2();
    let Areasum2 = 0;
    for (let i = 1; i < polygon.length - 1; ++i) {
        const p1 = polygon[0], p2 = polygon[i], p3 = polygon[i + 1];
        const Cent3 = v2(p1[0] + p2[0] + p3[0], p1[1] + p2[1] + p3[1])
        const A2 = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
        CG[0] += A2 * Cent3[0];
        CG[1] += A2 * Cent3[1];
        Areasum2 += A2;
    }
    CG[0] /= 3 * Areasum2;
    CG[1] /= 3 * Areasum2;
    return CG;
}

function isConvex(polygon: Vector2[]): boolean {
    // https://stackoverflow.com/a/45372025/11953579
    let [old_x, old_y] = polygon[polygon.length - 2];
    let [new_x, new_y] = polygon[polygon.length - 1];
    let new_direction = Math.atan2(new_y - old_y, new_x - old_x);
    let angle_sum = 0.0;
    let orientation = 0;
    for (let ndx = 0; ndx < polygon.length; ++ndx) {
        const old_direction = new_direction; old_x = new_x, old_y = new_y;
        new_x = polygon[ndx][0]; new_y = polygon[ndx][1];
        new_direction = Math.atan2(new_y - old_y, new_x - old_x)
        if (old_x == new_x && old_y == new_y) return false;
        let angle = new_direction - old_direction;
        if (angle <= -Math.PI) angle += Math.PI * 2;
        else if (angle > Math.PI) angle -= Math.PI * 2;
        if (ndx === 0) {
            if (angle === 0.0) return false;
            orientation = angle > 0.0 ? 1.0 : -1.0;
        } else {
            if (orientation * angle <= 0.0) return false;
        }
        angle_sum += angle;
    }
    return Math.abs(Math.round(angle_sum / (Math.PI * 2))) === 1
}

/*

Shapes: Polygon, AABB, Line, Circle, Point

Polygon, AABB, Circle -> should all return MTV
Point, Line -> Only returns true/false

✅ Polygon  -> Polygon
✅ Polygon  -> AABB
✅ Polygon  -> Line
✅ Polygon  -> Circle
✅ Polygon  -> Point
✅ AABB     -> Polygon    (duplicate)
✅ AABB     -> AABB
✅ AABB     -> Line
✅ AABB     -> Circle
✅ AABB     -> Point
✅ Line     -> Polygon    (duplicate)
✅ Line     -> AABB       (duplicate)
✅ Line     -> Line
✅ Line     -> Circle
✅ Line     -> Point
✅ Circle   -> Polygon    (duplicate)
✅ Circle   -> AABB       (duplicate)
✅ Circle   -> Line       (duplicate)
✅ Circle   -> Circle
✅ Circle   -> Point
✅ Point    -> Polygon    (duplicate)
✅ Point    -> AABB       (duplicate)
✅ Point    -> Line       (duplicate)
✅ Point    -> Circle     (duplicate)
✅ Point    -> Point

*/

export class Point {
    readonly type: "point" = "point";

    public value: Vector2;

    constructor(
        value: Vector2 | Point
    ) {
        if (value instanceof Point) {
            this.value = value.value;
        } else {
            this.value = value;
        }
    }

    get center(): Vector2 { return this.value; }
    moveTo(value: Vector2) {
        this.value[0] = value[0];
        this.value[1] = value[1];
    }
    translate(value: Vector2) {
        v2.add(this.value, value);
    }
    static from(that: Vector2 | Point): Point {
        return new Point(that);
    }
}

export class Circle {
    readonly type: "circle" = "circle";

    constructor(
        private center_: Vector2,
        private radius_: number
    ) {
        if (this.radius_ <= 0) throw new Error(`Circle with radius <= 0 is invalid`);
    }

    public get center(): Vector2 {
        return this.center_;
    }

    public get radius(): number {
        return this.radius_;
    }

    public moveTo(value: Vector2) {
        this.center_ = value;
    }

    public translate(value: Vector2) {
        v2.add(this.center_, value);
    }
}

export class Line {
    readonly type: "line" = "line";

    private center_: Vector2;
    private length_: number;
    private dirty_ = false;

    constructor(
        private p0_: Vector2,
        private p1_: Vector2
    ) {
        this.center_ = computeMidpoint(this.p0_, this.p1_);
        this.length_ = v2.dist(p0_, p1_);
    }

    public get p0(): Vector2 {
        if (this.dirty_) this.update();
        return this.p0_;
    }

    public get p1(): Vector2 {
        if (this.dirty_) this.update();
        return this.p1_;
    }

    public get center(): Vector2 {
        if (this.dirty_) this.update();
        return this.center_;
    }

    public get length(): number {
        if (this.dirty_) this.update();
        return this.length_;
    }

    public moveTo(value: Vector2) {
        const delta = v2.sub(value, this.center);
        this.translate(delta);
    }

    public translate(value: Vector2) {
        v2.add(this.p0_, value);
        v2.add(this.p1_, value);
        this.dirty_ = true;
    }

    public rotate(value: number, pivot: Vector2) {
        const matrix = m3.translate(m3.rotate(m3.translate(m3(), pivot), value), v2.negate(pivot));
        v2.multMat3(this.p0_, matrix);
        v2.multMat3(this.p1_, matrix);
        this.dirty_ = true;
    }

    public scale(value: Vector2) {
        const matrix = m3.scale(m3(), value);
        v2.multMat3(this.p0_, matrix);
        v2.multMat3(this.p1_, matrix);
        this.dirty_ = true;
    }

    private update() {
        this.center_ = computeMidpoint(this.p0_, this.p1_);
        this.dirty_ = false;
    }
}

function computeAABBPoints(center: Vector2, half: Vector2): Vector2[] {
    const minX = center[0] - half[0];
    const maxX = center[0] + half[0];
    const minY = center[1] - half[1];
    const maxY = center[1] + half[1];
    return [
        v2(minX, minY),
        v2(maxX, minY),
        v2(maxX, maxY),
        v2(minX, maxY),
    ];
}

function updateAABBPoints(center: Vector2, half: Vector2, points: Vector2[]) {
    const minX = center[0] - half[0];
    const maxX = center[0] + half[0];
    const minY = center[1] - half[1];
    const maxY = center[1] + half[1];
    points[0][0] = minX; points[0][1] = minY;
    points[1][0] = maxX; points[1][1] = minY;
    points[2][0] = maxX; points[2][1] = maxY;
    points[3][0] = minX; points[3][1] = maxY;
}

interface RaycastResult {
    contact: Vector2,
    normal: Vector2,
    time: number
}

export class Ray {
    public origin: Vector2;
    public direction: Vector2;
    constructor(from: Vector2, to: Vector2) {
        this.origin = from;
        this.direction = v2.sub(to, from);
    }

    cast(target: AABB): RaycastResult | null {
        let rayInverseDir = v2.inverse(v2.clone(this.direction));
        let timeNear = v2(
            (target.center[0] - this.origin[0]) * rayInverseDir[0],
            (target.center[1] - this.origin[1]) * rayInverseDir[1]
        );
        let timeFar = v2(
            (target.center[0] + (target.half[0] * 2) - this.origin[0]) * rayInverseDir[0],
            (target.center[1] + (target.half[1] * 2) - this.origin[1]) * rayInverseDir[1],
        );
        if (Number.isNaN(timeFar[1]) || Number.isNaN(timeFar[0])) return null;
        if (Number.isNaN(timeNear[1]) || Number.isNaN(timeNear[0])) return null;
        if (timeNear[0] > timeFar[0]) {
            // swap(t_near[0], t_far[0])
            let temp = timeNear[0];
            timeNear[0] = timeFar[0];
            timeFar[0] = temp;
        }
        if (timeNear[1] > timeFar[1]) {
            // swap(t_near[1], t_far[1])
            let temp = timeNear[1];
            timeNear[1] = timeFar[1];
            timeFar[1] = temp;
        }
        if (timeNear[0] > timeFar[1] || timeNear[1] > timeFar[0]) return null;
        let hitNear = Math.max(timeNear[0], timeNear[1]);
        let hitFar = Math.min(timeFar[0], timeFar[1]);
        if (hitFar < 0)
            return null;
        let contact = v2(
            this.origin[0] + hitNear * this.direction[0],
            this.origin[1] + hitNear * this.direction[1]
        );
        let normal = v2()
        if (timeNear[0] > timeNear[1])
            if (rayInverseDir[0] < 0) normal = v2(1, 0);
            else normal = v2(-1, 0);
        else if (timeNear[0] < timeNear[1])
            if (rayInverseDir[1] < 0) normal = v2(0, 1);
            else normal = v2(0, -1);

        return {
            contact, normal,
            time: hitNear
        };
    }
}

export class AABB {
    readonly type: "aabb" = "aabb";

    private points_: Vector2[];
    private dirty_ = false;

    constructor(
        public center: Vector2,
        public half: Vector2
    ) {
        this.points_ = computeAABBPoints(this.center, this.half);
    }

    public clone(): AABB {
        return new AABB(v2.clone(this.center), v2.clone(this.half));
    }

    public get points(): Vector2[] {
        if (this.dirty_) updateAABBPoints(this.center, this.half, this.points_);
        return this.points_;
    }
    public get top(): number { return this.center[1] - this.half[1] }
    public get bottom(): number { return this.center[1] + this.half[1] }
    public get left(): number { return this.center[0] - this.half[0] }
    public get right(): number { return this.center[0] + this.half[0] }

    public translate(value: Vector2) { v2.add(this.center, value) }
    public scale(value: Vector2) { v2.add(this.half, value) }

    sweep(to: Vector2, that: AABB): RaycastResult | null {
        const inflated = that.clone();
        inflated.half[0] += this.half[0];
        inflated.half[1] += this.half[1];

        const ray = new Ray(this.center, to);
        return ray.cast(that);
    }

    static(that: AABB): Vector2 | null {
        const dx = that.center[0] - this.center[0];
        const px = that.half[0] + this.half[0] - Math.abs(dx);
        const dy = that.center[1] - this.center[1];
        const py = that.half[1] + this.half[1] - Math.abs(dy);
        if (px <= 0 || py <= 0) {
            return null;
        }

        if (px < py) {
            return v2(-px * Math.sign(dx), 0);
        } else {
            return v2(0, -py * Math.sign(dy));
        }
    }
}

export class Polygon {
    readonly type: "polygon" = "polygon";

    private points_: Vector2[];
    private normals_: Vector2[];
    private center_: Vector2;

    private position_: Vector2;
    private scale_: Vector2;
    private rotation_: number;
    private matrix_: Matrix3;

    constructor(
        points: Vector2[]
    ) {
        if (points.length < 3) throw new Error(`Polygon must have at least 3 vertices!`);
        if (!isConvex(points)) throw new Error(`Polygon must be convex!`);

        this.points_ = points;
        this.normals_ = computeNormals(this.points_);
        this.center_ = computeCentroid(this.points_);

        let furthestX = 0, furthestY = 0;
        for (const point of this.points_) {
            if (Math.abs(point[0]) > furthestX) {
                furthestX = Math.abs(point[0]);
            }
            if (Math.abs(point[1]) > furthestY) {
                furthestY = Math.abs(point[1]);
            }
        }

        this.position_ = v2();
        this.scale_ = v2(furthestX, furthestY);
        this.rotation_ = 0;
        this.matrix_ = m3.scale(m3.rotate(m3.translate(m3(), this.position_), this.rotation_), this.scale_);
    }

    /**
     * A **copy** of the polygon's points
     */
    get points(): Vector2[] {
        const points = new Array<Vector2>(this.points_.length);
        for (let i = 0, len = this.points_.length; i < len; ++i) {
            points[i] = v2.clone(this.points_[i]);
        }
        return points;
    }

    get length(): number {
        return this.points_.length;
    }

    movePoint(index: number, value: Vector2) {
        this.points_[index][0] = value[0];
        this.points_[index][1] = value[1];
        this.recalculateBounds();
    }

    /**
     * Equivalent to `Array.splice(index, 0, point)`.
     */
    addPoint(index: number, point: Vector2): void {
        this.points_.splice(index, 0, point);
        this.recalculateBounds();
    }

    /**
     * Equivalent to `Array.splice(index, 1)`.
     */
    removePoint(index: number): void {
        this.points_.splice(index, 1);
        this.recalculateBounds();
    }

    get center(): Vector2 {
        return this.center_;
    }

    get normals(): readonly Vector2[] {
        return this.normals_;
    }

    get position(): Vector2 {
        return this.position_;
    }
    set position(value: Vector2) {
        this.position_ = value;
        this.recalculatePoints();
    }

    get scale(): Vector2 {
        return this.scale_;
    }
    set scale(value: Vector2) {
        if (value[0] < 2) value[0] = 2;
        if (value[1] < 2) value[1] = 2;
        this.scale_ = value;
        this.recalculatePoints();
    }

    get rotation(): number {
        return this.rotation_;
    }
    set rotation(value: number) {
        this.rotation_ = value;
        this.recalculatePoints();
    }

    get matrix(): Matrix3 {
        return this.matrix_;
    }

    private recalculateBounds() {
        // TODO: mess with this to encapsulate the shape better
        const inverse = m3.invert(this.matrix_);
        const matrix = m3.scale(m3(), this.scale_);

        const farthest = v2();
        for (let i = 0, len = this.points_.length; i < len; ++i) {
            const point = v2.multMat3(v2.multMat3(v2.clone(this.points_[i]), inverse), matrix);
            if (Math.abs(point[0]) > farthest[0]) {
                farthest[0] = Math.abs(point[0]);
            }
            if (Math.abs(point[1]) > farthest[1]) {
                farthest[1] = Math.abs(point[1]);
            }
        }

        this.scale_ = v2(
            farthest[0],
            farthest[1]
        );
        this.matrix_ = m3.scale(m3.rotate(m3.translate(m3(), this.position_), this.rotation_), this.scale_);
        this.normals_ = computeNormals(this.points_);
        this.center_ = computeCentroid(this.points_);
    }

    private recalculatePoints() {
        const inverse = m3.invert(this.matrix_);
        this.matrix_ = m3.scale(m3.rotate(m3.translate(m3(), this.position_), this.rotation_), this.scale_);
        for (let i = 0, len = this.points_.length; i < len; ++i) {
            v2.multMat3(v2.multMat3(this.points_[i], inverse), this.matrix_);
        }
        this.normals_ = computeNormals(this.points_);
        this.center_ = computeCentroid(this.points_);
    }
}

export type Shape = Point | Line | Circle | AABB | Polygon;

export function polygon_polygon(first: Polygon, second: Polygon): Vector2 | null {
    const a = first.points;
    const b = second.points;
    const polygons = [a, b];

    let MTV = v2(Infinity, Infinity);
    for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        for (let i1 = 0; i1 < polygon.length; i1++) {
            const i2 = (i1 + 1) % polygon.length;

            const p1 = polygon[i1];
            const p2 = polygon[i2];

            const normal = v2.perp(v2.norm(v2.sub(v2.clone(p2), p1)));

            let minA!: number;
            let maxA!: number;
            let minB!: number;
            let maxB!: number;
            for (let n = 0; n < a.length; n++) {
                const projected = normal[0] * a[n][0] + normal[1] * a[n][1];
                if (minA === undefined || projected < minA) {
                    minA = projected;
                }
                if (maxA === undefined || projected > maxA) {
                    maxA = projected;
                }
            }
            for (let n = 0; n < b.length; n++) {
                const projected = normal[0] * b[n][0] + normal[1] * b[n][1];
                if (minB === undefined || projected < minB) {
                    minB = projected;
                }
                if (maxB === undefined || projected > maxB) {
                    maxB = projected;
                }
            }

            if ((minA < maxB && maxA > minB) ||
                (minB < maxA && maxB > minA)) {
                const overlap = Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
                const PV = v2.scale(normal, overlap);
                if (v2.len2(PV) < v2.len2(MTV)) {
                    MTV = PV;
                }
                continue;
            }

            return null;
        }
    }

    const direction = v2.sub(v2.clone(first.center), second.center);
    if (v2.dot(MTV, direction) < 0) v2.negate(MTV);

    return MTV;
}


export function polygon_aabb(first: Polygon, second: AABB): Vector2 | null {
    const second_poly = new Polygon(second.points);
    return polygon_polygon(first, second_poly);
}


export function aabb_polygon(first: AABB, second: Polygon): Vector2 | null {
    const result = polygon_aabb(second, first);
    if (!result) return null;
    return v2.negate(result);
}

export function polygon_line(first: Polygon, second: Line, epsilon = Math.EPSILON): boolean {
    const points = first.points;
    for (let i1 = 0; i1 < points.length; i1++) {
        const i2 = (i1 + 1) % points.length;

        const edge = new Line(points[i1], points[i2]);
        const hit = line_line(edge, second, epsilon);
        if (hit) return true;
    }
    return false;
}

export function line_polygon(first: Line, second: Polygon, epsilon = Math.EPSILON): boolean {
    return polygon_line(second, first, epsilon);
}

export function polygon_circle(first: Polygon, second: Circle): Vector2 | null {
    const polygon = first.points;
    const C = second.center;
    const R = second.radius;

    let MTV = v2(Infinity, Infinity);
    for (let i1 = 0; i1 < polygon.length; i1++) {
        const i2 = (i1 + 1) % polygon.length;

        const p1 = polygon[i1];
        const p2 = polygon[i2];

        const normal = v2.perp(v2.norm(v2.sub(v2.clone(p2), p1)));

        let minA!: number;
        let maxA!: number;
        let minB!: number;
        let maxB!: number;
        // polygon is A
        for (let n = 0; n < polygon.length; n++) {
            const projected = normal[0] * polygon[n][0] + normal[1] * polygon[n][1];
            if (minA === undefined || projected < minA) {
                minA = projected;
            }
            if (maxA === undefined || projected > maxA) {
                maxA = projected;
            }
        }
        // circle is B
        {
            const projected = normal[0] * C[0] + normal[1] * C[1];
            minB = projected - R;
            maxB = projected + R;
        }

        if ((minA < maxB && maxA > minB) ||
            (minB < maxA && maxB > minA)) {
            const overlap = Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
            const PV = v2.scale(normal, overlap);
            if (v2.len2(PV) < v2.len2(PV)) {
                MTV = PV;
            }
            continue;
        }

        return null;
    }

    const direction = v2.sub(v2.clone(first.center), C);
    if (v2.dot(MTV, direction) < 0) v2.negate(MTV);

    return MTV;
}

export function circle_polygon(first: Circle, second: Polygon): Vector2 | null {
    const result = polygon_circle(second, first);
    if (!result) return null;
    return v2.negate(result);
}

export function polygon_point(first: Polygon, second: Point): boolean {
    const points = first.points;
    const pX = second.value[0];
    const pY = second.value[1];
    let collision = false;

    for (let i1 = 0; i1 < points.length; i1++) {
        const i2 = (i1 + 1) % points.length;
        const A = points[i1];
        const B = points[i2];
        const aX = A[0];
        const aY = A[1];
        const bX = B[0];
        const bY = B[1];
        if (((aY >= pY && bY < pY) || (aY < pY && bY >= pY)) &&
            (pX < (bX - aX) * (pY - aY) / (bY - aY) + aX)) {
            collision = !collision;
        }
    }

    return !!collision;
}

export function aabb_aabb(first: AABB, second: AABB): Vector2 | null {
    const dx = second.center[0] - first.center[0];
    const px = second.half[0] + first.half[0] - Math.abs(dx);
    const dy = second.center[1] - first.center[1];
    const py = second.half[1] + first.half[1] - Math.abs(dy);
    if (px <= 0 || py <= 0) {
        return null;
    }

    if (px < py) {
        return v2(-px * Math.sign(dx), 0);
    } else {
        return v2(0, -py * Math.sign(dy));
    }
}

export function aabb_aabb_inverse(first: AABB, second: AABB): Vector2 | null {
    const dx = second.center[0] - first.center[0];
    const pen_x = second.half[0] + first.half[0] - Math.abs(dx);
    const dy = second.center[1] - first.center[1];
    const pen_y = second.half[1] + first.half[1] - Math.abs(dy);

    if (pen_x <= 0 || pen_y <= 0) {
        if (pen_x < pen_y) {
            return v2(-pen_x * Math.sign(dx), 0);
        } else {
            return v2(0, -pen_y * Math.sign(dy));
        }
    } else {
        return null;
    }

}

export function aabb_line(first: AABB, second: Line, epsilon = Math.EPSILON): boolean {
    if (!!aabb_point(first, Point.from(second.p0), epsilon) || !!aabb_point(first, Point.from(second.p1), epsilon)) {
        return true;
    }

    const points = first.points;

    for (let i1 = 0; i1 < points.length; ++i1) {
        const i2 = (i1 + 1) % points.length;
        const p1 = points[i1];
        const p2 = points[i2];

        const edge = new Line(p1, p2);
        if (line_line(edge, second, epsilon)) {
            return true;
        }
    }
    return false;
}

export function line_aabb(first: Line, second: AABB, epsilon = Math.EPSILON): boolean {
    return aabb_line(second, first, epsilon);
}

export function aabb_circle(first: AABB, second: Circle): Vector2 | null {
    const center = second.center;
    const aabb_half_extents = first.half;
    const aabb_center = first.center;

    const delta = v2.sub(v2.clone(center), aabb_center);
    const closest = v2.add(v2.clamp(delta, v2.negate(v2.clone(aabb_half_extents)), v2.clone(aabb_half_extents)), aabb_center);

    const difference = v2.sub(v2.clone(closest), center);
    const R = second.radius;
    const overlap = R - v2.len(difference);
    if (overlap > 0) {
        const MTV = v2.scale(v2.norm(difference), overlap);
        return MTV;
    }

    return null;
}

export function circle_aabb(first: Circle, second: AABB): Vector2 | null {
    const result = aabb_circle(second, first);
    if (!result) return null;
    return v2.negate(result);
}

export function aabb_point(first: AABB, second: Point, epsilon = Math.EPSILON): Vector2 | null {
    return aabb_circle(first, new Circle(second.value, epsilon));
}

export function line_line(first: Line, second: Line, epsilon = Math.EPSILON): boolean {
    // http://paulbourke.net/geometry/pointlineplane/pdb.c
    const A = first.p0;
    const B = first.p1;
    const C = second.p0;
    const D = second.p1;

    const denom = ((D[1] - C[1]) * (B[0] - A[0]) - (D[0] - C[0]) * (B[1] - A[1]));
    const denomABS = Math.abs(denom);
    const numerA = ((D[0] - C[0]) * (A[1] - C[1]) - (D[1] - C[1]) * (A[0] - C[0]));
    const numerB = ((B[0] - A[0]) * (A[1] - C[1]) - (B[1] - A[1]) * (A[0] - C[0]));

    // coincident
    if (Math.abs(numerA) < epsilon && Math.abs(numerB) < epsilon && denomABS < epsilon) {
        const delta = v2.norm(v2(B[0] - A[0], B[1] - A[1]));
        const A_dot = A[0] * delta[0] + A[1] * delta[1];
        const B_dot = B[0] * delta[0] + B[1] * delta[1];
        const C_dot = C[0] * delta[0] + C[1] * delta[1];
        const D_dot = D[0] * delta[0] + D[1] * delta[1];

        const minA = A_dot < B_dot ? A_dot : B_dot;
        const maxA = A_dot > B_dot ? A_dot : B_dot;

        const minB = C_dot < D_dot ? C_dot : D_dot;
        const maxB = C_dot > D_dot ? C_dot : D_dot;

        const overlap = Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
        if (overlap > 0) {
            return true;
        }
        return false;
    }

    // parallel
    if (denomABS < epsilon) {
        return false;
    }

    // intersecting
    const uA = numerA / denom;
    const uB = numerB / denom;
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        //const intersection = v2(
        //    A[0] + uA * (B[0] - A[0]),
        //    A[1] + uA * (B[1] - A[0])
        //);
        return true;
    }
    return false;
}

export function line_circle(first: Line, second: Circle, epsilon = Math.EPSILON): boolean {
    if (circle_point(second, Point.from(first.p0), epsilon) || circle_point(second, Point.from(first.p1), epsilon)) {
        return true;
    }

    const lineLen = first.length;

    const A = first.p0;
    const B = first.p1;
    const C = second.center;
    const dot = (((C[0] - A[0]) * (B[0] - A[0])) + ((C[1] - A[1]) * (B[1] - A[1]))) / (lineLen * lineLen);

    const closestX = A[0] + (dot * (B[0] - A[0]));
    const closestY = A[1] + (dot * (B[1] - A[1]));

    if (!line_point(first, new Point([closestX, closestY]), epsilon)) {
        return false;
    }

    const distX = closestX - C[0];
    const distY = closestY - C[1];
    const distanceSquared = (distX * distX) + (distY * distY);

    const R = second.radius;
    if (distanceSquared < (R * R)) {
        return true;
    }
    return false;
}

export function line_point(first: Line, second: Point, epsilon = Math.EPSILON): boolean {
    const d1X = second.value[0] - first.p0[0];
    const d1Y = second.value[1] - first.p0[1];
    const d1 = Math.sqrt((d1X * d1X) + (d1Y * d1Y));
    const d2X = second.value[0] - first.p1[0];
    const d2Y = second.value[1] - first.p1[1];
    const d2 = Math.sqrt((d2X * d2X) + (d2Y * d2Y));
    const lineLen = first.length;

    const d = d1 + d2;
    return d >= lineLen - epsilon && d <= lineLen + epsilon;
}

export function circle_line(first: Circle, second: Line, epsilon = Math.EPSILON): boolean {
    return line_circle(second, first, epsilon);
}

export function circle_circle(first: Circle, second: Circle): Vector2 | null {
    const p0 = first.center;
    const p1 = second.center;

    // distance between circle centers
    const deltaX = p1[0] - p0[0];
    const deltaY = p1[1] - p0[1];
    const distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);
    const R0 = first.radius;
    const R1 = second.radius;
    const totalRadius = R0 + R1;
    const totalRadiusSquared = totalRadius * totalRadius;

    // no collision
    if (distanceSquared > totalRadiusSquared) {
        return null;
    }

    // some collision occurred
    const distance = Math.sqrt(distanceSquared)
    const overlap = totalRadius - distance;
    const MTV = v2(
        -(deltaX / distance) * overlap,
        -(deltaY / distance) * overlap
    );
    // one circle entirely within the other
    if (distance < Math.abs(R0 - R1)) {
        return MTV;
    }

    // circle edges intersect
    //const a = ((R0 * R0) - (R1 * R1) + (distanceSquared)) / (2 * distance);
    //const p2x = p0[0] + (deltaX * (a / distance));
    //const p2y = p0[1] + (deltaY * (a / distance));
    //const h = Math.sqrt((R0 * R0) - (a * a));
    //const rx = -deltaY * (h / distance);
    //const ry = deltaX * (h / distance);
    //const intersection: [Vector2, Vector2] = [
    //    v2(p2x + rx, p2y + ry),
    //    v2(p2x - rx, p2y - ry),
    //];

    return MTV;
}

export function circle_point(first: Circle, second: Point, epsilon = Math.EPSILON): Vector2 | null {
    const deltaX = second.value[0] - first.center[0];
    const deltaY = second.value[1] - first.center[1];
    const distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);
    const totalRadius = first.radius + epsilon;
    const totalRadiusSquared = totalRadius * totalRadius;

    if (distanceSquared < totalRadiusSquared) {
        const distance = Math.sqrt(distanceSquared)
        const overlap = totalRadius - distance;
        const MTV = v2(
            -(deltaX / distance) * overlap,
            -(deltaY / distance) * overlap
        );
        //const intersection = second.clone();
        return MTV;
    }
    return null;
}

export function point_polygon(first: Point, second: Polygon): boolean {
    return polygon_point(second, first);
}

export function point_aabb(first: Point, second: AABB, epsilon = Math.EPSILON): Vector2 | null {
    const result = aabb_point(second, first, epsilon);
    if (!result) return null;
    return v2.negate(result);
}

export function point_line(first: Point, second: Line, epsilon = Math.EPSILON): boolean {
    return line_point(second, first, epsilon);
}

export function point_circle(first: Point, second: Circle, epsilon = Math.EPSILON): Vector2 | null {
    const result = circle_point(second, first, epsilon);
    if (!result) return null;
    return v2.negate(result);
}

export function point_point(first: Point, second: Point, epsilon = Math.EPSILON): boolean {
    const dX = Math.abs(first.value[0] - second.value[0]);
    const dY = Math.abs(first.value[1] - second.value[1]);
    return dX < epsilon && dY < epsilon;
}

export function intersect(this: any, first: Shape, second: Shape, epsilon = Math.EPSILON): boolean | Vector2 | null {
    return this[`${first.type}_${second.type}`](first, second, epsilon);
}

