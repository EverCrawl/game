
import { m4, Matrix4, v3, Vector3, v2, Vector2 } from "core/math";
import { Viewport } from "./Viewport";

export interface CameraOptions {
    eye?: Vector3;
    center?: Vector3;
    near?: number;
    far?: number;
    worldUp?: Vector3;
    zoom?: number;
}

function calcView(eye: Vector3, center: Vector3, worldUp: Vector3): Matrix4 {
    return m4.lookAt(eye, center, worldUp);
}

function calcProjection(viewport: Viewport, near: number, far: number, zoom: number): Matrix4 {
    const hw = (viewport.width / 2) / zoom;
    const hh = (viewport.height / 2) / zoom;
    return m4.orthographic(-hw, hw, -hh, hh, near, far);
}

export class Camera {
    private view_: Matrix4;
    private projection_: Matrix4;

    private eye_: Vector3;
    private center_: Vector3;
    private near_: number;
    private far_: number;
    private worldUp_: Vector3;
    private zoom_: number;

    constructor(
        public viewport: Viewport,
        options: CameraOptions = {}
    ) {
        this.eye_ = options.eye != null ? options.eye : v3(0, 0, -1);
        this.center_ = options.center != null ? options.center : v3(0, 0, 0);
        this.near_ = options.near != null ? options.near : -1;
        this.far_ = options.far != null ? options.far : 1;
        this.worldUp_ = options.worldUp != null ? options.worldUp : v3(0, 1, 0);
        this.zoom_ = options.zoom != null ? options.zoom : 1;

        this.projection_ = m4();
        this.view_ = m4();
        this.update();
        this.resize();

        window.addEventListener("resize", this.resize);
    }

    update() {
        this.view_ = calcView(this.eye_, this.center_, this.worldUp_);
        this.projection_ = calcProjection(this.viewport, this.near_, this.far_, this.zoom_);
    }

    public get view(): Matrix4 {
        return this.view_;
    }
    public get projection(): Matrix4 {
        return this.projection_;
    }
    public get position(): Vector2 {
        return v2(this.eye_[0], this.eye_[1]);
    }
    public set position(value: Vector2) {
        this.eye_ = v3(value[0], value[1], -1);
        this.center_ = v3(value[0], value[1], 0);
        this.update();
    }
    public get zoom(): number {
        return this.zoom_;
    }
    public set zoom(value: number) {
        this.zoom_ = value;
        this.update();
    }

    private resize = () => {
        this.projection_ = calcProjection(this.viewport, this.near_, this.far_, this.zoom_);
    }
}
