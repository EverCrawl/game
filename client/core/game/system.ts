import { World, Entity, Null } from "uecs";
import { LerpPos, RigidBody } from 'common/component';
import { Sprite, Direction } from "client/core/gfx";
import { CollisionKind, Level, TILESIZE, TILESIZE_HALF, TILE_SCALE } from "client/core/map";
import { AABB, v2 } from 'common/math';
import * as Input from "./input";
import * as Net from "./net";
import { Player } from "./entity";
import { Game } from "./game";
import { Message, Schema } from "common/net";

function handle(game: Game, message: Message) {
    switch (message.id) {
        case Schema.Id.Initial: {
            const packet = Schema.Initial.read(message.payload.buffer)!;
            console.log("Initial", packet.player.id, packet.player.position);
            game.player = Player.self(game.world,
                packet.player.id,
                "assets/sprites/mushroom.json",
                v2(packet.player.position.x, packet.player.position.y));

            for (let i = 0; i < packet.entities.length; ++i) {
                const entity = packet.entities[i];
                Player.insert(game.world,
                    entity.id,
                    "assets/sprites/mushroom.json",
                    v2(entity.position.x, entity.position.y));
            }
        } break;
        case Schema.Id.Create: {
            const packet = Schema.Create.read(message.payload.buffer)!;
            console.log("Create", packet.id, packet.position);
            Player.insert(game.world,
                packet.id,
                "assets/sprites/mushroom.json",
                v2(packet.position.x, packet.position.y));
        } break;
        case Schema.Id.Delete: {
            const packet = Schema.Delete.read(message.payload.buffer)!;
            console.log("Delete", packet.id);
            game.world.destroy(packet.id);
        } break;
        case Schema.Action.Id.Move: {
            const packet = Schema.Action.Move.read(message.payload.buffer)!;
            console.log("Move", packet.entities.length);
            for (let i = 0, len = packet.entities.length; i < len; ++i) {
                const entity = packet.entities[i];
                if (entity.id === game.player) continue;
                game.world.get(entity.id, LerpPos)?.update([entity.x, entity.y]);
            }
        }
    }
}

export function network(game: Game, socket: Net.Socket) {
    if (socket.state === Net.Socket.OPEN) {
        game.world.view(LerpPos).each((_, p) => p.update(v2.clone(p.current)));

        if (!socket.empty) {
            let packet;
            while (packet = socket.read()) {
                handle(game, Message.parse(new Uint8Array(packet)));
            }
        }

        if (game.player !== Null) {
            // position changed => send packet
            const body = game.world.get(game.player, RigidBody)!;
            if (body.position.current[0] !== body.position.previous[0] ||
                body.position.current[1] !== body.position.previous[1]) {
                const packet = new Schema.Position(
                    body.position.current[0],
                    body.position.current[1]);
                console.log("sent:", "Move", body.position.current);
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
export function physics(world: World, player: Entity, level?: Level) {
    if (player === Null || level == null || !level.ready) return;
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
    if (body.cstate !== "ladder" &&
        // if both 'left' and 'right' keys are pressed,
        // don't move in either direction
        !(Input.isPressed("KeyA") && Input.isPressed("KeyD"))) {

        if (Input.isPressed("KeyA")) direction = -1;
        if (Input.isPressed("KeyD")) direction = 1;
    }

    if (direction !== 0) {
        // apply accelaration
        body.velocity[0] = Math.clamp(
            body.velocity[0] + (body.acceleration * direction),
            -body.speed, body.speed);
    } else {
        let direction = Math.sign(body.velocity[0]);

        let decelaration = body.friction;
        if (body.cstate === "air") decelaration = body.drag;

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
        case "air": {
            // if we're in the air, that's gravity
            body.velocity[1] += GRAVITY;
            body.velocity[1] = Math.min(body.velocity[1], TERMINAL_VELOCITY);
            break;
        }
        case "ground": {
            // if we're on the ground, that's jumping
            body.velocity[1] = 0;
            if (Input.isPressed("Space")) {
                body.cstate = "air";
                body.velocity[1] = -body.jumpSpeed;
            }
            break;
        }
        case "ladder": {
            // TODO: decide if you should be able to jump off a ladder
            //      - maybe just the top/bottom tiles?
            body.velocity[1] = 0;
            // if we're on a ladder, that's the 'up' and 'down' keys
            if (Input.isPressed("KeyW")) body.velocity[1] -= body.ladderSpeed;
            if (Input.isPressed("KeyS")) body.velocity[1] += body.ladderSpeed;
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
    if (body.cstate !== "ladder") {
        if (Input.isPressed("KeyW")) {
            // if there's a ladder tile on the entity
            if (level.collisionKind(centerTX, centerTY) === CollisionKind.Ladder) {
                // grab onto it
                body.cstate = "ladder";
                // snap the entity to the ladder on the x-axis
                entityBox.center[0] = centerTX * TILESIZE + TILESIZE_HALF;
                body.velocity[0] = 0;
            }
        }
        else if (Input.isPressed("KeyS")) {
            // the ladder tile may also be below the entity
            if (level.collisionKind(centerTX, centerTY + 1) === CollisionKind.Ladder) {
                body.cstate = "ladder";
                entityBox.center[0] = centerTX * TILESIZE + TILESIZE_HALF;
                // give the player a little downward boost
                entityBox.center[1] += 1;
                body.velocity[0] = 0;
            }
        }
    } else {
        if (Input.isPressed("KeyX")) {
            body.cstate = "air";
        }
    }

    switch (body.cstate) {
        case "air": {
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
                            if (!Input.isPressed("KeyS") &&
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
                body.cstate = "ground";
                body.velocity[1] = 0;
            }

            break;
        }
        case "ground": {
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
                    body.cstate = "air";
                }
                // if the "down" key is pressed, entity wants to
                // jump down from the platform
                if (Input.isPressed("KeyS") &&
                    level.collisionKind(groundTileXLeft, groundTileY) === CollisionKind.Platform &&
                    level.collisionKind(groundTileXRight, groundTileY) === CollisionKind.Platform) {
                    body.cstate = "air";
                    // give the entity a little boost
                    // if this wasn't here, you could spam the down arrow key 
                    // and never actually leave the platform
                    body.velocity[1] = 5;
                }
            }
            break;
        }
        case "ladder": {
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
                    body.cstate = "ground";
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
                        body.cstate = "ground";
                    }
                } else if (
                    // if both the tile we're on and the one below
                    // are empty tiles, fall off the ladder
                    belowTileCK === CollisionKind.None &&
                    level.collisionKind(tx, ty) === CollisionKind.None) {
                    body.cstate = "air";
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

export function animation(world: World, player: Entity) {
    // animate entities
    world.view(Sprite, LerpPos).each((_, sprite, pos) => {
        let direction = sprite.direction;
        const velocity = [
            pos.current[0] - pos.previous[0],
            pos.current[1] - pos.previous[1]
        ];
        if (velocity[0] < 0) direction = Direction.Left;
        else if (velocity[0] > 0) direction = Direction.Right;

        sprite.direction = direction;
        sprite.moving = velocity[0] !== 0;
        const jumping = velocity[1] !== 0;

        if (sprite.moving && (sprite.lastDirection != sprite.direction)) {
            sprite.lastDirection = sprite.direction;
        }

        // TODO: send cstate
        let animation;
        if (jumping) {
            animation = "Jump";
        } else {
            if (sprite.moving) {
                animation = "Walk";
            } else {
                animation = "Idle";
            }
        }

        sprite.animation = animation;
    });

    if (player !== Null) {
        // animate player
        const sprite = world.get(player, Sprite)!;
        const body = world.get(player, RigidBody)!;

        let direction = sprite.direction;
        if (body.velocity[0] < 0) direction = Direction.Left;
        else if (body.velocity[0] > 0) direction = Direction.Right;

        sprite.direction = direction;
        sprite.moving = body.velocity[0] !== 0 || body.velocity[1] !== 0;

        if (sprite.moving && (sprite.lastDirection != sprite.direction)) {
            sprite.lastDirection = sprite.direction;
        }

        let animation;
        if (body.cstate !== "ground") {
            animation = "Jump";
        }
        else {
            if (sprite.moving) {
                animation = "Walk";
            } else {
                animation = "Idle";
            }
        }

        sprite.animation = animation;
    }
}