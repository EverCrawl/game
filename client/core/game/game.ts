import OverlayContainer from "client/app/overlay";
import { Null, World } from "uecs";
import * as Runtime from "common/runtime";
import { InitGL, Viewport, Camera, Renderer, Sprite } from "client/core/gfx";
import * as System from "./system";
import * as Net from "./net";
import * as Input from "./input";
import { v2 } from "common/math";
import { NetTransform, RigidBody } from "common/component";
import { Level } from "client/core/map";
import { Player } from "./entity";

// @ts-ignore
if (DEBUG) {
    // @ts-ignore
    window.Input = Input;
}

/*
// TODO: client/server/assets/schemas monorepo!!
// TODO: platformer physics
// TODO: scale viewport according to window size
// run
// jump
// slope - 2X and 1X
// one-way collision
TODO: (client) memory usage/leak audit
    - caching should have some limit
    - when loading assets, ensure that only the required information is kept around
    - break references by cloning via JSON.stringify and JSON.parse, allow GC to drop
TODO: (client + server) swept AABB
TODO: (client) particle system
TODO: (client) soft shadow under entities
TODO: (client) animated tiles
    - turn tile layers into chunked images
TODO: (client) UI
TODO: (client) loading screen
TODO: (server) collisions
TODO: (server) authentication with DB
TODO: (client + server) TLS for transport
TODO: (client + server) basic gameplay
     - move, attack (slash), attack (dash), attack (spell)
TODO: (client) prediction + reconciliation
TODO: playtest deployment
*/

export type ReadyGame = Game & {
    level: Level
}

export class Game {
    overlay: OverlayContainer;
    canvas: HTMLCanvasElement;

    camera: Camera;
    renderer: Renderer;

    level?: Level;
    world: World;
    socket: Net.Socket;
    player: number;

    constructor(
        canvas: HTMLCanvasElement,
        overlay: OverlayContainer
    ) {
        this.overlay = overlay;
        this.canvas = canvas;
        InitGL(this.canvas, {
            alpha: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: true,
        });
        this.camera = new Camera(new Viewport(), { zoom: 4 });
        this.renderer = new Renderer();
        this.world = new World();

        const url = DEBUG ? "localhost:8888" : "protected-springs-02493.herokuapp.com";
        this.socket = new Net.Socket("protected-springs-02493.herokuapp.com", "test");
        this.socket.open(1000, () => (console.log("timeout"), this.overlay.error = "Connection failed."));
        this.socket.onclose = _ => (this.overlay.error = "Connection dropped.");

        this.player = Null;

        if (DEBUG) {
            // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
            window.Game = this;
        }
    }

    ready(): this is ReadyGame {
        return (
            this.player !== Null &&
            this.level !== undefined &&
            this.level.ready &&
            this.socket.state === Net.Socket.OPEN
        );
    }

    run() {
        Runtime.start({
            update: () => this.update(),
            render: (frameTime) => this.draw(this.renderer, this.camera, frameTime),
            rate: 30
        });
    }

    update() {
        Input.update();
        /* System.shoot(this); */
        System.use(this);
        System.network(this);
        System.physics(this);
        System.animation(this);
    }

    draw(
        renderer: Renderer,
        camera: Camera,
        frameTime: number
    ) {
        if (this.player === Null || !this.level || !this.level.ready) {
            // render loading screen
            if (!this.overlay.loading) this.overlay.loading = true;
        } else {
            if (this.overlay.loading) this.overlay.loading = false;
            renderer.camera = camera;
            // world offset is the opposite of the player's position
            // e.g. if we're moving right (+x), the world should move left (-x)
            // to create the illusion of the player moving
            const worldOffset = v2.negate(
                this.world.get(this.player, RigidBody)!
                    .position.get(frameTime));

            this.level.render(renderer, worldOffset);

            // during rendering, order in the same layer is maintained
            // so the player is drawn last, to ensure it's drawn on top
            // of every other entity
            this.world.view(Sprite, NetTransform).each((entity, sprite, transform) => {
                if (entity === this.player) return;

                const lt = transform.get(frameTime);
                if (this.world.has(entity, Player.TAG)) {
                    sprite.draw(renderer, 0, v2(
                        worldOffset[0] + lt.position[0],
                        worldOffset[1] + lt.position[1] + 8
                    ), 0, v2(0.5, 0.5));
                } else {
                    sprite.draw(renderer, 0, v2(
                        worldOffset[0] + lt.position[0],
                        worldOffset[1] + lt.position[1]
                    ), lt.rotation, lt.scale);
                }
            });
            this.world.get(this.player, Sprite)!
                .draw(renderer, 0, v2(0, 8), 0, v2(0.5, 0.5));

            renderer.flush();
        }
    }
}
