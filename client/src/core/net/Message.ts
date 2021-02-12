import { Reader, Writer } from "packet";
import * as Schema from "schemas";

export interface Header {
    id: number,
    size: number,
}
const HEADER_SIZE: number = /* u16 */ 2 + /* u16 */ 2;

export class Message {
    private header_: Header;
    private payload_: Uint8Array;

    private constructor(id: number, payload: Uint8Array) {
        this.header_ = { id, size: payload.byteLength };
        this.payload_ = payload;
    }

    static parse(data: Uint8Array): Message {
        let reader = new Reader(data.buffer);
        let header = {
            id: reader.read_uint16(),
            size: reader.read_uint16(),
        };

        if (data.byteLength - HEADER_SIZE != header.size) {
            throw new Error("header.length does not match data.length");
        }

        return new Message(header.id, data.slice(HEADER_SIZE, data.byteLength));
    }

    static build(id: number, data: Uint8Array): Uint8Array {
        let writer = new Writer(HEADER_SIZE + data.byteLength);
        writer.write_uint16(id);
        writer.write_uint16(data.byteLength);
        writer.write_bytes(data);
        return new Uint8Array(writer.finish());
    }

    id(): number {
        return this.header_.id;
    }

    size(): number {
        return this.header_.size;
    }

    payload(): Uint8Array {
        return this.payload_;
    }
}