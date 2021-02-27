import { Message } from "./message";
import * as Schema from "./schema";
import { TextEncoder, TextDecoder } from "util";

function u8(view: ArrayLike<number> = []): Uint8Array {
    let buffer = new ArrayBuffer(view.length);
    let v = new DataView(buffer);
    for (let i = 0; i < view.length; ++i) {
        v.setUint8(i, view[i]);
    }
    return new Uint8Array(buffer);
}
function u16(view: ArrayLike<number> = []): Uint8Array {
    let buffer = new ArrayBuffer(view.length * 2);
    let v = new DataView(buffer);
    for (let i = 0; i < view.length; ++i) {
        v.setUint8(i * 2, view[i]);
    }
    return new Uint8Array(buffer);
}

describe("Message", function () {
    it("serialize", function () {
        let msg = Message.build(0, new ArrayBuffer(0));
        expect(new Uint8Array(msg)).toEqual(u16([0, 0]));
    });

    it("deserialize", function () {
        let msg = Message.parse(u16([0, 0]).buffer);
        expect(msg.id).toEqual(0);
        expect(msg.size).toEqual(0);
        expect(msg.payload).toEqual(new ArrayBuffer(0));
    });

    it("verify no header", function () {
        let data = u16();
        // no header = invalid message
        expect(Message.verify(data.buffer)).toEqual(false);
    });

    it("verify bad header.id", function () {
        let data = u16([Schema.ID_MAX, 0]);
        // header.id > ID_MAX = invalid message
        expect(Message.verify(data.buffer)).toEqual(false);
    });

    it("verify wrong header.size", function () {
        let data = u16([Schema.ID_MAX, 65535]);
        // header.size !== payload.size = invalid message
        expect(Message.verify(data.buffer)).toEqual(false);
    });

    it("verify valid message", function () {
        let data = u16([Schema.Id.Position, 0]);
        expect(Message.verify(data.buffer)).toEqual(true);
    });
});