import { Vector4 } from "common/math";
import { Texture, TextureKind } from "./texture";
import { TextObject } from "common/map/object";

// Static text rendering:
// * Use a secondary 2D canvas to draw text (white on black background) with a specific font
// * Extract the drawn text into a WebGL Texture
// * Draw the texture onto a quad

// the above is ideal for Tiled text objects, which don't change,
// and because dynamic text isn't used anywhere in the game

const HelperCtx: CanvasRenderingContext2D = (() => {
    const canvas = document.createElement("canvas")!;
    return canvas.getContext("2d")!;
})();

export class Text {
    readonly texture: Texture;

    constructor(
        readonly data: TextObject
    ) {
        HelperCtx.canvas.width = data.width * 4;
        HelperCtx.canvas.height = data.height * 4;
        HelperCtx.font = `${data.text.size * 4}px ${data.text.font}`;
        HelperCtx.textAlign = data.text.align;
        HelperCtx.textBaseline = data.text.baseline;
        HelperCtx.fillStyle = data.text.color;

        let y = 0;
        for (const line of data.text.content.split('\n')) {
            HelperCtx.fillText(line, 0, y);
            const measurement = HelperCtx.measureText(line);
            y += measurement.fontBoundingBoxAscent + measurement.fontBoundingBoxDescent;
        }

        this.texture = Texture.create(TextureKind.Image2D, {
            path: HelperCtx.canvas.toDataURL(),
            premultiplyAlpha: true
        });
    }
}