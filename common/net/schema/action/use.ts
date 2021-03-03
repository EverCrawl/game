// Generated by packetc v0.3.4 at Mon, 01 Mar 2021 17:54:33 +0000
import { Reader, Writer } from "packet";
export namespace Use {
}
export class Use {
    constructor(
        public which: string,
    ) {}
    static read(data: ArrayBuffer): Use | null {
        let reader = new Reader(data);
        let output = Object.create(Use);
        let output_which_len = reader.read_uint32();
        output.which = reader.read_string(output_which_len);
        if (reader.failed) return null;
        return output;
    }
    write(buffer?: ArrayBuffer): ArrayBuffer {
        let writer = buffer ? new Writer(buffer) : new Writer();
        writer.write_uint32(this.which.length);
        writer.write_string(this.which);
        return writer.finish();
    }
}
