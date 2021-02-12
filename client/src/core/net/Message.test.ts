// not available in node (v15.6.0) global by default
//@ts-ignore |SAFETY| polyfill
globalThis.TextEncoder = require("util").TextEncoder;
//@ts-ignore |SAFETY| polyfill
globalThis.TextDecoder = require("util").TextDecoder;

import { Message } from "./Message";

console.log(process.version);

describe("Message", function () {
    it("serialize", function () {
        let msg = Message.build(0, new Uint8Array);
        expect(msg).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it("deserialize", function () {
        let msg = Message.parse(new Uint8Array([0, 0, 0, 0]));
        expect(msg.id()).toEqual(0);
        expect(msg.size()).toEqual(0);
        expect(msg.payload()).toEqual(new Uint8Array);
    });
});