
import { Schema } from "common/net";
import { Game } from "client/core/game";
import { Player } from "client/core/game/entity";
import { NetPos } from "common/component";
import { v2 } from "common/math";

export const HandlerTable = {
    [Schema.Id.Initial]: [
        Schema.Initial,
        function (game: Game, packet: Schema.Initial) {
            game.player = Player.self(game.world,
                packet.player.id,
                "assets/sprites/mushroom.json",
                v2(packet.player.position.x, packet.player.position.y));

            for (let i = 0; i < packet.entities.length; ++i) {
                const entity = packet.entities[i];
                if (entity.id === game.player) continue;
                Player.insert(game.world,
                    entity.id,
                    "assets/sprites/mushroom.json",
                    v2(entity.position.x, entity.position.y));
            }
        }
    ],
    [Schema.Id.Create]: [
        Schema.Create,
        function (game: Game, packet: Schema.Create) {
            console.log("Create", packet.id, packet.position);
            Player.insert(game.world,
                packet.id,
                "assets/sprites/mushroom.json",
                v2(packet.position.x, packet.position.y));
        }
    ],
    [Schema.Id.Delete]: [
        Schema.Delete,
        function (game: Game, packet: Schema.Delete) {
            console.log("Delete", packet.id);
            game.world.destroy(packet.id);
        }
    ],
    [Schema.Action.Id.Move]: [
        Schema.Action.Move,
        function (game: Game, packet: Schema.Action.Move) {
            for (let i = 0, len = packet.entities.length; i < len; ++i) {
                const entity = packet.entities[i];
                if (entity.id === game.player) continue;
                const pos = game.world.get(entity.id, NetPos)!;
                pos.update([entity.x, entity.y]);
                pos.cstate = entity.cstate;
                console.log(entity.id, entity.x, entity.y);
            }
        }
    ],
} as const;
export type HandlerTable = typeof HandlerTable;