import { Null } from "uecs";
import { CollisionState, NetTransform, RigidBody, Transform, Velocity } from 'common/component';
import { Sprite, Direction } from "client/core/gfx";
import { CollisionKind, TILESIZE, TILESIZE_HALF, TILE_SCALE } from "client/core/map";
import { AABB, v2, Vector2 } from 'common/math';
import * as Input from "./input";
import * as Net from "./net";
import { Game } from "./game";
import { Message, Schema } from "common/net";
import { Bullet, Player } from "./entity";

let lastShot = Date.now();
const SHOT_CD = 150 /*ms*/;
const BULLET_TTL = 1000 /*ms*/;
export function shoot(game: Game) {
    if (game.player === Null || !game.level || !game.level.ready) return;
    const playerPos = game.world.get(game.player, RigidBody)!.position;

    const now = Date.now();
    if (Input.mouse.isPressed(Input.Button.Left) && (now - lastShot) > SHOT_CD) {
        console.log("shoot!");
        lastShot = now;

        const dir = v2(Input.mouse.current.x - (game.canvas.width / 2), Input.mouse.current.y - (game.canvas.height / 2));

        Bullet.shoot(game.world, 0, v2(playerPos.current[0], playerPos.current[1] + 8), dir, BULLET_TTL);
    }

    // update bullet position
    game.world.view(NetTransform, Velocity, Bullet.TAG).each((_, transform, velocity) => {
        transform.update(new Transform(
            v2(
                transform.current.position[0] + velocity.value[0],
                transform.current.position[1] + velocity.value[1]
            ),
            transform.current.rotation,
            transform.current.scale
        ))
    });
}

let lastUse = Date.now();
const USE_CD = 250 /*ms*/;
export function use(game: Game) {
    if (game.player === Null || !game.level || !game.level.ready) return;

    const body = game.world.get(game.player, RigidBody)!;

    const portalAABB = new AABB(v2(), v2());
    const playerAABB = new AABB(body.position.current, TILE_SCALE);

    // TODO: generalize this to 'use' any object
    // TODO: store object name in object (because Object.values is faster)
    for (const key of Object.keys(game.level.data.object)) {
        const object = game.level.data.object[key];
        switch (object.type) {
            case "portal": {
                const portal = object;
                portalAABB.half = v2(portal.width / 2, portal.height / 2);
                portalAABB.center = v2(portal.x + portalAABB.half[0], portal.y + portalAABB.half[1]);

                const now = Date.now();
                if ((now - lastUse >= USE_CD) && Input.key.isPressed("KeyF") && playerAABB.static(portalAABB)) {
                    console.log(`use portal '${key}'`);

                    const use = new Schema.Action.Use(key);
                    game.socket.send(Message.build(Schema.Action.Id.Use, use.write()));

                    lastUse = now;
                }
                break;
            }
        }
    }
}

export function network(game: Game) {
    const socket = game.socket;
    if (socket.state === Net.Socket.OPEN) {
        game.world.view(NetTransform).each((_, p) => p.update(Transform.clone(p.current)));

        if (!socket.empty) {
            let packet;
            while (packet = socket.read()) {
                const message = Message.parse(packet);
                const type = Net.HandlerTable[message.id as keyof Net.HandlerTable][0];
                const handleFn = Net.HandlerTable[message.id as keyof Net.HandlerTable][1];
                handleFn(game, type.read(message.payload) as any);
            }
        }

        if (game.player !== Null) {
            // position changed => send packet
            const body = game.world.get(game.player, RigidBody)!;
            if (body.position.current[0] !== body.position.previous[0] ||
                body.position.current[1] !== body.position.previous[1]) {
                const packet = new Schema.Position(
                    body.cstate,
                    body.position.current[0],
                    body.position.current[1]);
                socket.send(Message.build(Schema.Id.Position, packet.write()));
            }
        }
    }

}

type Slopes =
    | CollisionKind.SlopeLeft
    | CollisionKind.SlopeRight
    | CollisionKind.SlopeLeftBottom
    | CollisionKind.SlopeRightBottom
    | CollisionKind.SlopeLeftTop
    | CollisionKind.SlopeRightTop

function SlopeY_Formula(slopeBase: number, weight: number, kind: Slopes): number {
    switch (kind) {
        case CollisionKind.SlopeLeft:
            return slopeBase - (TILESIZE * weight);
        case CollisionKind.SlopeRight:
            return slopeBase - (TILESIZE * (1 - weight));
        case CollisionKind.SlopeLeftBottom:
            return slopeBase - (TILESIZE_HALF * weight);
        case CollisionKind.SlopeRightBottom:
            return slopeBase - (TILESIZE_HALF * (1 - weight));
        case CollisionKind.SlopeLeftTop:
            return slopeBase - (TILESIZE_HALF * weight) - TILESIZE_HALF;
        case CollisionKind.SlopeRightTop:
            return slopeBase - (TILESIZE_HALF * (1 - weight)) - TILESIZE_HALF;
    }
}

function SlopeCollision(tx: number, ty: number, worldX: number, tileBox: AABB, entityBox: AABB, kind: Slopes): boolean {
    let tileRightEdgeX = TILESIZE + tx * TILESIZE;
    let weight = (tileRightEdgeX - worldX) / TILESIZE;
    let slopeBase = TILESIZE_HALF + ty * TILESIZE;
    tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
    tileBox.center[1] = TILESIZE + SlopeY_Formula(slopeBase, weight, kind);
    const result = entityBox.static(tileBox);
    let hitGround = false;
    if (result != null) {
        if (result[1] < 0) hitGround = true
        entityBox.center[1] += result[1];
    }
    return hitGround;
}

// TODO: DRY 
//   - make physics system more readable by splitting it up?
//   - not too much though, it makes sense to separate it into "steps"
//     such as "set velocity" step, the "collisionX" step, etc.
// TODO(?): should "lone slopes" have bottom collision?

const GRAVITY = 0.69;
const TERMINAL_VELOCITY = GRAVITY * 10;
export function physics(game: Game) {
    if (!game.ready()) return;
    const world = game.world, player = game.player, level = game.level;

    const body = world.get(player, RigidBody)!;
    /// The physics system is a big bulky beast.
    /// The reason for this is that platformer physics
    /// cannot be implemented cleanly with just simple 2D physics,
    /// things like ladders, slopes, one-way platforms all don't
    /// work especially well together with that approach.
    /// The approach I take is to hard-code all behavior into a
    /// state machine. What you see below is said state machine.
    /// It's complex, because it considers a lot of different cases.

    // TODO(?): when travelling on a slope, lower horizontal velocity based on the angle
    //      - maybe not? since velocity is applied first, it'd require checking
    //        if the player was on a slope last update... which means another
    //        state variable...

    // check for things that modify x-velocity
    // ATM we can only move left/right if we're not on a ladder
    let direction = 0;
    if (body.cstate !== CollisionState.Ladder &&
        // if both 'left' and 'right' keys are pressed,
        // don't move in either direction
        !(Input.key.isPressed("KeyA") && Input.key.isPressed("KeyD"))) {

        if (Input.key.isPressed("KeyA")) direction = -1;
        if (Input.key.isPressed("KeyD")) direction = 1;
    }

    if (direction !== 0) {
        // apply accelaration
        body.velocity[0] = Math.clamp(
            body.velocity[0] + (body.acceleration * direction),
            -body.speed, body.speed);
    } else {
        let direction = Math.sign(body.velocity[0]);

        let decelaration = body.friction;
        if (body.cstate === CollisionState.Air) decelaration = body.drag;

        let nextVelocity = body.velocity[0] - (decelaration * direction);
        if (nextVelocity * direction < 0) {
            nextVelocity = 0;
        }
        // decelerate
        body.velocity[0] = Math.clamp(
            nextVelocity,
            -body.speed, body.speed);
    }

    // check for things that modify y-velocity
    switch (body.cstate) {
        case CollisionState.Air: {
            // if we're in the air, that's gravity
            body.velocity[1] += GRAVITY;
            body.velocity[1] = Math.min(body.velocity[1], TERMINAL_VELOCITY);
            break;
        }
        case CollisionState.Ground: {
            // if we're on the ground, that's jumping
            body.velocity[1] = 0;
            if (Input.key.isPressed("Space")) {
                body.cstate = CollisionState.Air;
                body.velocity[1] = -body.jumpSpeed;
            }
            break;
        }
        case CollisionState.Ladder: {
            // TODO: decide if you should be able to jump off a ladder
            //      - maybe just the top/bottom tiles?
            body.velocity[1] = 0;
            // if we're on a ladder, that's the 'up' and 'down' keys
            if (Input.key.isPressed("KeyW")) body.velocity[1] -= body.ladderSpeed;
            if (Input.key.isPressed("KeyS")) body.velocity[1] += body.ladderSpeed;
            break;
        }
    }

    // these AABBs are re-used for all collisions by moving/scaling them as needed
    let entityBox = new AABB(v2(
        body.position.current[0] + body.velocity[0],
        body.position.current[1] + body.velocity[1]
    ), TILE_SCALE);
    let tileBox = new AABB(v2(), TILE_SCALE);

    const centerWX = entityBox.center[0];
    const centerWY = entityBox.center[0];
    const centerTX = Math.floor(entityBox.center[0] / TILESIZE);
    const centerTY = Math.floor(entityBox.center[1] / TILESIZE);

    // climbing ladders
    if (body.cstate !== CollisionState.Ladder) {
        if (Input.key.isPressed("KeyW")) {
            // if there's a ladder tile on the entity
            if (level.collisionKind(centerTX, centerTY) === CollisionKind.Ladder) {
                // grab onto it
                body.cstate = CollisionState.Ladder;
                // snap the entity to the ladder on the x-axis
                entityBox.center[0] = centerTX * TILESIZE + TILESIZE_HALF;
                body.velocity[0] = 0;
            }
        }
        else if (Input.key.isPressed("KeyS")) {
            // the ladder tile may also be below the entity
            if (level.collisionKind(centerTX, centerTY + 1) === CollisionKind.Ladder) {
                body.cstate = CollisionState.Ladder;
                entityBox.center[0] = centerTX * TILESIZE + TILESIZE_HALF;
                // give the player a little downward boost
                entityBox.center[1] += 1;
                body.velocity[0] = 0;
            }
        }
    } else {
        if (Input.key.isPressed("KeyX")) {
            body.cstate = CollisionState.Air;
        }
    }

    switch (body.cstate) {
        case CollisionState.Air: {
            // calculate 2D tile range we need to check for collisions
            let minTX = Math.floor((entityBox.center[0] - TILESIZE_HALF) / TILESIZE);
            let maxTX = Math.floor((entityBox.center[0] + TILESIZE_HALF - 1) / TILESIZE);
            let minTY = Math.floor((entityBox.center[1] - TILESIZE_HALF) / TILESIZE);
            let maxTY = Math.floor((entityBox.center[1] + TILESIZE_HALF - 1) / TILESIZE);

            let hitGround = false;

            // resolve y-axis first
            for (let ty = minTY; ty <= maxTY; ++ty) {
                for (let tx = minTX; tx <= maxTX; ++tx) {
                    // CollisionKind.Full means solid tile
                    const ck = level.collisionKind(tx, ty);
                    switch (ck) {
                        case CollisionKind.None: break;
                        case CollisionKind.Full: {
                            // move the tile AABB into the tile's position
                            tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                            tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;

                            // perform a static collision check between
                            // entity and tile AABB

                            // this returns the minimum translation vector
                            // which can be used to resolve the collision
                            const result = entityBox.static(tileBox);
                            if (result != null) {
                                // if the MTV is pointing up (-y),
                                // it means we hit the ground
                                if (result[1] < 0) hitGround = true;
                                entityBox.center[1] += result[1];
                            }
                            break;
                        }
                        case CollisionKind.Ladder: {
                            // falling onto a ladder is the same as a platform
                            // ONLY if the tile above the ladder is an air tile

                            if (level.collisionKind(tx, ty - 1) === CollisionKind.None &&
                                body.position.previous[1] < body.position.current[1]) {
                                // move the tile AABB into the tile's position
                                tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                                tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;
                                // check for collision
                                const result = entityBox.static(tileBox);
                                if (result != null && result[1] < 0) {
                                    hitGround = true
                                    entityBox.center[1] += result[1];
                                }
                            }
                            break;
                        }
                        case CollisionKind.Platform: {
                            // platforms are special in that they only
                            // collide when the normal === -y and
                            // we were previously moving down
                            // AND the down key is not pressed
                            if (!Input.key.isPressed("KeyS") &&
                                body.position.previous[1] < body.position.current[1]) {
                                // move the tile AABB into the tile's position
                                tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                                tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;
                                // check for collision
                                const result = entityBox.static(tileBox);
                                if (result != null && result[1] < 0) {
                                    hitGround = true
                                    entityBox.center[1] += result[1];
                                }
                            }
                            break;
                        }
                        case CollisionKind.SlopeLeft:
                        case CollisionKind.SlopeRight:
                        case CollisionKind.SlopeLeftBottom:
                        case CollisionKind.SlopeRightBottom:
                        case CollisionKind.SlopeLeftTop:
                        case CollisionKind.SlopeRightTop: {
                            hitGround = SlopeCollision(tx, ty, centerWX, tileBox, entityBox, ck);
                            break;
                        }
                    }
                }
            }

            // resolve x-axis AFTER y-axis has been resolved
            minTX = Math.floor((entityBox.center[0] - TILESIZE_HALF) / TILESIZE);
            maxTX = Math.floor((entityBox.center[0] + TILESIZE_HALF) / TILESIZE);
            minTY = Math.floor((entityBox.center[1] - TILESIZE_HALF) / TILESIZE);
            maxTY = Math.floor((entityBox.center[1] + TILESIZE_HALF) / TILESIZE);
            for (let ty = minTY; ty <= maxTY; ++ty) {
                for (let tx = minTX; tx <= maxTX; ++tx) {
                    // CollisionKind.Full means solid tile
                    switch (level.collisionKind(tx, ty)) {
                        case CollisionKind.None: break;
                        case CollisionKind.Full: {
                            // move the tile AABB into the tile's position
                            tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                            tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;

                            // perform a static collision check between
                            // entity and tile AABB

                            // this returns the minimum translation vector
                            // which can be used to resolve the collision
                            const result = entityBox.static(tileBox);
                            if (result != null && result[0] !== 0) {
                                entityBox.center[0] += result[0];
                            }
                        }
                    }
                }
            }

            // we've fully resolved collision now- if what's
            // under us is not an air tile, then we've
            // **really** hit the ground.
            if (hitGround &&
                level.collisionKind(
                    Math.floor(entityBox.center[0] / TILESIZE),
                    Math.floor(entityBox.center[1] / TILESIZE) + 1
                ) !== CollisionKind.None) {
                body.cstate = CollisionState.Ground;
                body.velocity[1] = 0;
            }

            break;
        }
        case CollisionState.Ground: {
            // are we on a slope?
            const bottomTY = Math.floor((entityBox.center[1] + TILESIZE_HALF - 1) / TILESIZE);
            let bottomCK = level.collisionKind(centerTX, bottomTY);
            const belowTY = Math.floor((entityBox.center[1] + TILESIZE) / TILESIZE);
            let belowCK = level.collisionKind(centerTX, belowTY);

            if (bottomCK >= CollisionKind.SlopeLeft) {
                let tileRightEdgeX = TILESIZE + centerTX * TILESIZE;
                let weight = (tileRightEdgeX - centerWX) / TILESIZE;
                let slopeBase = TILESIZE_HALF + bottomTY * TILESIZE;
                entityBox.center[1] = SlopeY_Formula(slopeBase, weight, bottomCK as Slopes);
            }
            // is there a slope below?
            else if (belowCK >= CollisionKind.SlopeLeft) {
                // snap to it
                // x-collision is disabled
                // y-position is controlled by the same formula
                let tileRightEdgeX = TILESIZE + centerTX * TILESIZE;
                let entityMidX = entityBox.center[0];
                let weight = (tileRightEdgeX - entityMidX) / TILESIZE;
                let slopeBase = TILESIZE_HALF + belowTY * TILESIZE;
                entityBox.center[1] = SlopeY_Formula(slopeBase, weight, belowCK as Slopes);
            }
            else {
                // we're not on a slope

                // always snap to center tile Y - this means some slope 
                // edge cases don't have to be handled
                entityBox.center[1] = centerTY * TILESIZE + TILESIZE_HALF;

                // moving left
                if (body.velocity[0] < 0) {
                    // collide with left tile
                    let tx = centerTX - 1;
                    let ty = centerTY;
                    if (level.collisionKind(tx, ty) === CollisionKind.Full) {
                        tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                        tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;

                        const result = entityBox.static(tileBox);
                        if (result != null) {
                            entityBox.center[0] += result[0];
                        }
                    }
                }
                // moving right
                else if (body.velocity[0] > 0) {
                    // collide with right tile
                    let tx = centerTX + 1;
                    let ty = centerTY;
                    if (level.collisionKind(tx, ty) === CollisionKind.Full) {
                        tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                        tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;

                        const result = entityBox.static(tileBox);
                        if (result != null) {
                            entityBox.center[0] += result[0];
                        }
                    }
                }

                // falling off a cliff
                const groundTileXLeft = Math.floor((entityBox.center[0] - TILESIZE_HALF) / TILESIZE);
                const groundTileXRight = Math.floor((entityBox.center[0] + TILESIZE_HALF) / TILESIZE);
                const groundTileY = Math.floor((entityBox.center[1]) / TILESIZE) + 1;
                // check tiles under the two bottom corners of the entity
                if (level.collisionKind(groundTileXLeft, groundTileY) === CollisionKind.None &&
                    level.collisionKind(groundTileXRight, groundTileY) === CollisionKind.None) {
                    body.cstate = CollisionState.Air;
                }
                // if the "down" key is pressed, entity wants to
                // jump down from the platform
                if (Input.key.isPressed("KeyS") &&
                    level.collisionKind(groundTileXLeft, groundTileY) === CollisionKind.Platform &&
                    level.collisionKind(groundTileXRight, groundTileY) === CollisionKind.Platform) {
                    body.cstate = CollisionState.Air;
                    // give the entity a little boost
                    // if this wasn't here, you could spam the down arrow key 
                    // and never actually leave the platform
                    body.velocity[1] = 5;
                }
            }
            break;
        }
        case CollisionState.Ladder: {
            // while climbing a ladder, we're only moving vertically
            // and we only check for collisions on the top and bottom

            // moving up
            if (body.velocity[1] < 0) {
                // collide against top tile
                let tx = centerTX;
                let ty = centerTY - 1;
                if (level.collisionKind(tx, ty) === CollisionKind.Full) {
                    tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                    tileBox.center[1] = ty * TILESIZE + TILESIZE_HALF;

                    const result = entityBox.static(tileBox);
                    if (result != null) {
                        entityBox.center[1] += result[1];
                    }
                }

                // "top of the ladder" means that the 
                // top AND bottom of the entity's bounding box 
                // collide with an 'air' tile
                const movedTopTY = Math.floor((entityBox.center[1] - TILESIZE_HALF) / TILESIZE);
                const movedBottomTY = Math.floor((entityBox.center[1] + TILESIZE_HALF) / TILESIZE);
                if (level.collisionKind(tx, movedTopTY) === CollisionKind.None &&
                    level.collisionKind(tx, movedBottomTY) === CollisionKind.None) {
                    // then snap entity to the 'air' tile Y 
                    entityBox.center[1] = movedBottomTY * TILESIZE + TILESIZE_HALF;
                    // and set collision state to 'ground'
                    body.cstate = CollisionState.Ground;
                }
            }
            // moving down
            else if (body.velocity[1] > 0) {
                let tx = centerTX;
                let ty = centerTY;
                let belowTileCK = level.collisionKind(tx, ty + 1);
                if (belowTileCK === CollisionKind.Full) {
                    tileBox.center[0] = tx * TILESIZE + TILESIZE_HALF;
                    tileBox.center[1] = (ty + 1) * TILESIZE + TILESIZE_HALF;

                    const result = entityBox.static(tileBox);
                    if (result != null) {
                        entityBox.center[1] += result[1];
                        // if we hit something below while on a ladder
                        // exit the climbing state
                        body.cstate = CollisionState.Ground;
                    }
                } else if (
                    // if both the tile we're on and the one below
                    // are empty tiles, fall off the ladder
                    belowTileCK === CollisionKind.None &&
                    level.collisionKind(tx, ty) === CollisionKind.None) {
                    body.cstate = CollisionState.Air;
                }
            }
            break;
        }
    }

    // always check against level bounds
    if (/* left edge */ entityBox.center[0] - TILESIZE_HALF < 0)
        entityBox.center[0] = TILESIZE_HALF;
    else if (/* right edge */ entityBox.center[0] + TILESIZE_HALF > level.size.x)
        entityBox.center[0] = level.size.x - TILESIZE_HALF;
    if (/* top edge */ entityBox.center[1] - TILESIZE_HALF < 0)
        entityBox.center[1] = TILESIZE_HALF;
    else if (/* bottom edge */ entityBox.center[1] + TILESIZE_HALF > level.size.y)
        entityBox.center[1] = level.size.y - TILESIZE_HALF;

    body.position.update(entityBox.center);
}

function animateHumanoid(sprite: Sprite, dpos: Vector2, cstate: CollisionState) {
    let direction = sprite.direction;
    if (dpos[0] < 0)
        direction = Direction.Left,
            sprite.moving = true;
    else if (dpos[0] > 0)
        direction = Direction.Right,
            sprite.moving = true;
    else
        sprite.moving = false;

    sprite.direction = direction;
    sprite.jumping = dpos[1] !== 0;

    if (sprite.moving && (sprite.lastDirection != sprite.direction)) {
        sprite.lastDirection = sprite.direction;
    }

    let animation = "Idle";
    if (cstate !== CollisionState.Ground) {
        animation = "Jump"
    } else {
        if (sprite.moving) {
            animation = "Walk";
        }
    }

    sprite.animation = animation;
}

export function animation(game: Game) {
    if (!game.ready()) return;
    const world = game.world, player = game.player;
    // animate humanoids
    world.view(Sprite, NetTransform, Player.TAG).each((_, sprite, pos) => {
        const p0 = pos.previous.position;
        const p1 = pos.current.position;
        const dpos = v2(p1[0] - p0[0], p1[1] - p0[1]);
        animateHumanoid(sprite, dpos, pos.cstate);
    });

    // animate player
    if (player !== Null) {
        const sprite = world.get(player, Sprite)!;
        const body = world.get(player, RigidBody)!;
        animateHumanoid(sprite, body.velocity, body.cstate);
    }
}