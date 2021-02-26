// Generated by packetc v0.3.4 at Fri, 26 Feb 2021 10:28:17 +0000
import { Reader, Writer } from "packet";
export namespace Initial {
    export interface Position {
        x: number,
        y: number,
    }
    export interface Entity {
        id: number,
        position: Position,
    }
}
export class Initial {
    constructor(
        public player: Initial.Entity,
        public entities: Initial.Entity[],
    ) {}
    static read(data: ArrayBuffer): Initial | null {
        let reader = new Reader(data);
        let output = Object.create(Initial);
        let output_player: any = {};
        output_player.id = reader.read_uint32();
        let output_player_position: any = {};
        output_player_position.x = reader.read_float();
        output_player_position.y = reader.read_float();
        output_player.position = output_player_position;
        output.player = output_player;
        let output_entities_len = reader.read_uint32();
        output.entities = new Array(output_entities_len);
        for (let output_entities_index = 0; output_entities_index < output_entities_len; ++output_entities_index) {
            let output_entities_item: any = {};
            output_entities_item.id = reader.read_uint32();
            let output_entities_item_position: any = {};
            output_entities_item_position.x = reader.read_float();
            output_entities_item_position.y = reader.read_float();
            output_entities_item.position = output_entities_item_position;
            output.entities[output_entities_index] = output_entities_item;
        }
        if (reader.failed) return null;
        return output;
    }
    write(buffer?: ArrayBuffer): ArrayBuffer {
        let writer = buffer ? new Writer(buffer) : new Writer();
        writer.write_uint32(this.player.id);
        writer.write_float(this.player.position.x);
        writer.write_float(this.player.position.y);
        writer.write_uint32(this.entities.length);
        for (let this_entities_index = 0; this_entities_index < this.entities.length; ++this_entities_index) {
            let this_entities_item = this.entities[this_entities_index];
            writer.write_uint32(this_entities_item.id);
            writer.write_float(this_entities_item.position.x);
            writer.write_float(this_entities_item.position.y);
        }
        return writer.finish();
    }
}
