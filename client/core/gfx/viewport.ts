


export class Viewport {
    public readonly canvas: HTMLCanvasElement;

    constructor() {
        this.canvas = GL.canvas as HTMLCanvasElement;

        this.resize();
        window.addEventListener("resize", this.resize);
    }

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }

    resize = () => {
        this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
        GL.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
}