import OverlayContainer from "app/Overlay";
import { ECS, Runtime, Socket } from "core";
import { InitGL, Viewport, Camera, Renderer, Sprite } from "core/gfx";
import * as System from "./System";
import * as Entity from "./Entity";
import { AABB, v2, v3, v4 } from "core/math";
import { RigidBody } from "./Component";
import {
    Level,
    TILESET_ID_MASK, TILE_ID_MASK,
    TILESIZE, TILESIZE_HALF,
    TILE_SCALE,
    CollisionKind
} from "core/map";
import { drawBorderAABB, drawSlope } from "core/Debug";

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
    registry: ECS.Registry;
    socket: Socket;
    player: ECS.Entity;

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
        this.registry = new ECS.Registry();
        this.socket = new Socket("127.0.0.1:9002", "test", 1000);

        // TEMP
        /* this.tilemap = new TileMap("assets/maps/template.tmx"); */
        /* this.world = new World("assets/lmaps/test.ldtk"); */
        this.level = new Level("assets/maps/test.amt");

        // TEMP
        this.player = Entity.Player.create(this.registry,
            "assets/sprites/mushroom.json",
            v2(424, 90));

        if (DEBUG) {
            // @ts-ignore |SAFETY| available globally for debugging purposes in devtools console
            window.Game = this;
        }
    }

    run() {
        Runtime.start(
            () => this.update(),
            (frameTime) => this.draw(this.renderer, this.camera, frameTime),
            1000 / 30
        );
    }

    update() {
        System.network(this.registry, this.socket);
        System.physics(this.registry, this.level);
        System.animation(this.registry);
    }

    draw(
        renderer: Renderer,
        camera: Camera,
        frameTime: number
    ) {
        if (this.level == null || !this.level.ready) {
            // render loading screen
        } else {
            renderer.camera = camera;
            // world offset is the opposite of the player's position
            // e.g. if we're moving right (+x), the world should move left (-x)
            // to create the illusion of the player moving
            const worldOffset = v2.negate(
                this.registry.get(this.player, RigidBody)!
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
            this.registry.group(Sprite, RigidBody).each((entity, sprite, body) => {
                if (entity === this.player) return;

                const interpolatedPosition = body.position.get(frameTime);
                sprite.draw(renderer, 0, v2(
                    worldOffset[0] + interpolatedPosition[0],
                    worldOffset[1] + interpolatedPosition[1]
                ), 0, v2(0.5, 0.5));
            });

            // debug drawing tiles
            const pbody = this.registry.get(this.player, RigidBody)!;

            const tileBox = new AABB(v2(), TILE_SCALE);

            let minTX = Math.floor((pbody.position.current[0] - TILESIZE_HALF) / TILESIZE);
            let maxTX = Math.floor((pbody.position.current[0] + TILESIZE_HALF) / TILESIZE);
            let minTY = Math.floor((pbody.position.current[1] - TILESIZE_HALF) / TILESIZE);
            let maxTY = Math.floor((pbody.position.current[1] + TILESIZE_HALF) / TILESIZE);
            for (let ty = minTY; ty <= maxTY; ++ty) {
                for (let tx = minTX; tx <= maxTX; ++tx) {
                    // CollisionKind.Full means solid tile
                    switch (this.level.collisionKind(tx, ty)) {
                        case CollisionKind.Full: {
                            drawBorderAABB(this.renderer, v2(
                                worldOffset[0] + tx * TILESIZE + TILESIZE_HALF,
                                worldOffset[1] + ty * TILESIZE + TILESIZE_HALF
                            ), tileBox, v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                        case CollisionKind.SlopeLeft: {
                            drawSlope(this.renderer,
                                v2(worldOffset[0] + tx * TILESIZE, worldOffset[1] + ty * TILESIZE),
                                CollisionKind.SlopeLeft,
                                v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                        case CollisionKind.SlopeRight: {
                            drawSlope(this.renderer,
                                v2(worldOffset[0] + tx * TILESIZE, worldOffset[1] + ty * TILESIZE),
                                CollisionKind.SlopeRight,
                                v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                        case CollisionKind.SlopeLeftBottom: {
                            drawSlope(this.renderer,
                                v2(worldOffset[0] + tx * TILESIZE, worldOffset[1] + ty * TILESIZE),
                                CollisionKind.SlopeLeftBottom,
                                v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                        case CollisionKind.SlopeRightBottom: {
                            drawSlope(this.renderer,
                                v2(worldOffset[0] + tx * TILESIZE, worldOffset[1] + ty * TILESIZE),
                                CollisionKind.SlopeRightBottom,
                                v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                        case CollisionKind.SlopeLeftTop: {
                            drawSlope(this.renderer,
                                v2(worldOffset[0] + tx * TILESIZE, worldOffset[1] + ty * TILESIZE),
                                CollisionKind.SlopeLeftTop,
                                v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                        case CollisionKind.SlopeRightTop: {
                            drawSlope(this.renderer,
                                v2(worldOffset[0] + tx * TILESIZE, worldOffset[1] + ty * TILESIZE),
                                CollisionKind.SlopeRightTop,
                                v4(1.0, 0.5, 1.0, 1.0));
                            break;
                        }
                    }
                }
            }

            // draw player
            this.registry.get(this.player, Sprite)!
                .draw(renderer, 0, v2(0, 8), 0, v2(0.5, 0.5));
            // draw player AABB
            drawBorderAABB(renderer,
                v2(),
                new AABB(v2(), v2(8, 8)),
                v4(1.0, 0.5, 1.0, 1.0));

            renderer.flush();
        }
    }
}
