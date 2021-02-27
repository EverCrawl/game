import OverlayContainer from "client/app/overlay";
import { Null, World } from "uecs";
import * as Runtime from "common/runtime";
import { InitGL, Viewport, Camera, Renderer, Sprite } from "client/core/gfx";
import * as System from "./system";
import * as Entity from "./entity";
import * as Net from "./net";
import { AABB, v2, v3, v4 } from "common/math";
import { NetPos, RigidBody } from "common/component";
import {
    Level,
    TILESET_ID_MASK, TILE_ID_MASK,
    TILESIZE, TILESIZE_HALF,
    TILE_SCALE,
    CollisionKind
} from "client/core/map";
import { drawBorderAABB, drawSlope } from "client/core/debug";

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
        this.socket = new Net.Socket("127.0.0.1:8888", "test", 1000);

        // TEMP
        /* this.tilemap = new TileMap("assets/maps/template.tmx"); */
        /* this.world = new World("assets/lmaps/test.ldtk"); */
        this.level = new Level("assets/maps/test.amt");

        // TEMP
        this.player = Null;

        if (DEBUG) {
            // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
            window.Game = this;
        }
    }

    run() {
        Runtime.start({
            update: () => this.update(),
            render: (frameTime) => this.draw(this.renderer, this.camera, frameTime),
            rate: 30
        });
    }

    update() {
        System.network(this, this.socket);
        System.physics(this.world, this.player, this.level);
        System.animation(this.world, this.player);
    }

    draw(
        renderer: Renderer,
        camera: Camera,
        frameTime: number
    ) {
        if (this.player === Null || this.level == null || !this.level.ready) {
            // render loading screen
        } else {
            renderer.camera = camera;
            // world offset is the opposite of the player's position
            // e.g. if we're moving right (+x), the world should move left (-x)
            // to create the illusion of the player moving
            const worldOffset = v2.negate(
                this.world.get(this.player, RigidBody)!
                    .position.get(frameTime));

            renderer.background = this.level.data.background;
            // render level tile layers
            let renderLayerId = -10;
            for (let layerIndex = 0; layerIndex < this.level.data.tile.length; ++layerIndex) {
                for (let y = 0; y < this.level.data.height; ++y) {
                    for (let x = 0; x < this.level.data.width; ++x) {
                        let tile = this.level.data.tile[layerIndex][x + y * this.level.data.width];
                        if (tile === 0) continue;
                        // have to remove '1' to get the actual ID
                        // because all IDs are offset by '1' due to '0' having a special value
                        tile -= 1;
                        const tilesetIndex = tile & TILESET_ID_MASK;
                        const tileset = this.level.data.tilesets[tilesetIndex];
                        const tileId = tile & TILE_ID_MASK;
                        // tiles are rendered from the center
                        // so we add TILESIZE_HALF to offset it 
                        // to the top-left corner
                        const tilePos = v2(
                            TILESIZE_HALF + x * TILESIZE + worldOffset[0],
                            TILESIZE_HALF + y * TILESIZE + worldOffset[1]
                        );
                        renderer.command.tile(
                            tileset.texture, renderLayerId++, tileId,
                            tilePos, 0, TILE_SCALE);
                    }
                }
            }

            // draw all sprites except for entity
            this.world.view(Sprite, NetPos).each((entity, sprite, position) => {
                if (entity === this.player) return;

                const interpolatedPosition = position.get(frameTime);
                sprite.draw(renderer, 0, v2(
                    worldOffset[0] + interpolatedPosition[0],
                    worldOffset[1] + interpolatedPosition[1] + 8
                ), 0, v2(0.5, 0.5));
            });

            // draw player
            this.world.get(this.player, Sprite)!
                .draw(renderer, 0, v2(0, 8), 0, v2(0.5, 0.5));

            renderer.flush();
        }
    }
}
