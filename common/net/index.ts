

// NOTE: Adding new Message type checklist:
// [1] Write <name>.pkt, save it under './schema'
// [2] Run the 'update-schema.py' script
// [3] Handle it on the server and client

export * from "./message";
export * as Schema from "./schema";