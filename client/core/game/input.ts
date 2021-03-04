import { RigidBody } from "common/component";
import { v2, Vector2 } from "common/math";
import { Game } from "./game";

let keys: { [name: string]: boolean } = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

export const key = {
    isPressed: (key: string) => keys[key] ?? false
} as const;
export type key = typeof key;

export const enum Button {
    Left = 0,
    Middle = 1,
    Right = 2,
    Back = 3,
    Forward = 4
}

let buttons: {
    [Button.Left]: boolean,
    [Button.Middle]: boolean,
    [Button.Right]: boolean,
    [Button.Back]: boolean,
    [Button.Forward]: boolean,
    [other: number]: boolean,
} = {
    [Button.Left]: false,
    [Button.Middle]: false,
    [Button.Right]: false,
    [Button.Back]: false,
    [Button.Forward]: false,
};
let current = {
    x: 0,
    y: 0
};
let previous = {
    x: 0,
    y: 0
};

window.addEventListener("mousedown", e => (
    buttons[e.button] = true,
    previous.x = current.x,
    previous.y = current.y,
    current.x = e.clientX,
    current.y = e.clientY
));
window.addEventListener("mouseup", e => (
    buttons[e.button] = false,
    previous.x = current.x,
    previous.y = current.y,
    current.x = e.clientX,
    current.y = e.clientY
));
window.addEventListener("mousemove", e => (
    previous.x = current.x,
    previous.y = current.y,
    current.x = e.clientX,
    current.y = e.clientY
));
// TODO: wheel event

export const mouse = {
    /**
     * Current mouse position
     */
    current,
    /**
     * Returns true if `button` is held down
     */
    isPressed: (button: number) => buttons[button] ?? false,
    /**
     * Returns true if the mouse has moved during the previous frame
     */
    moved: () => (previous.x !== current.x || previous.y !== current.y),
    /**
     * Returns the mouse world position
     */
    world: (game: Game) => {
        const worldOffset = v2.clone(
            game.world.get(game.player, RigidBody)!
                .position.current);

        // TODO: more may be needed if zoom is ever properly implemented.
        return {
            x: current.x + worldOffset[0],
            y: current.y + worldOffset[1]
        }
    }
} as const;
export type mouse = typeof mouse;

export function update() {
    previous.x = current.x;
    previous.y = current.y;
}