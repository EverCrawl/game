import { Reader } from "packet";
import * as Schema from "./schema";

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

    get id(): number {
        return this.header_.id;
    }

    get size(): number {
        return this.header_.size;
    }

    get payload(): Uint8Array {
        return this.payload_;
    }

    static parse(data: Uint8Array): Message {
        let reader = new Reader(data.buffer);
        let header = {
            id: reader.read_uint16(),
            size: reader.read_uint16(),
        };

        return new Message(header.id, data.slice(HEADER_SIZE, data.byteLength));
    }

    static verify(data: ArrayBuffer): boolean {
        if (data.byteLength < HEADER_SIZE) {
            return false;
        }

        let view = new Uint16Array(data);
        let id = view[0];
        let size = view[1];

        if (id >= Schema.ID_MAX) {
            return false;
        }

        if (data.byteLength - HEADER_SIZE != size) {
            return false;
        }

        return true;
    }

    static build(id: number, data: ArrayBuffer): ArrayBuffer {
        let out = new Uint8Array(HEADER_SIZE + data.byteLength);
        let view = new DataView(out.buffer);
        view.setUint16(0, id, true);
        view.setUint16(2, data.byteLength, true);
        out.set(new Uint8Array(data), 4);
        return out.buffer;
    }
}