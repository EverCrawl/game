import { Message } from "common/net/message";
import { Constructor } from "common/utils";
import { NetWorker } from "./worker";
import Log from "server/util/log";

export class Socket {
    public state: "open" | "closed" = "open";

    constructor(
        public readonly id: number,
        private worker: NetWorker | null
    ) { }

    /**
     * Sends a message to the `Socket`.
     * 
     * After sending, `data` becomes unusable.
     */
    send(data: ArrayBuffer): void {
        if (this.state === "closed" || this.worker === null || !this.worker.running) {
            this.worker = null;
            return;
        }
        this.worker.send(this.id, data);
    }

    /**
     * Closes the `Socket`.
     */
    close(): void {
        if (this.state === "closed" || this.worker === null || !this.worker.running) {
            this.worker = null;
            return;
        }
        this.worker.close(this.id);
        this.state = "closed";
    }

    /**
     * User data
     */
    [key: string]: any;
}

export class SocketManager<TSocket extends Socket = Socket> {
    private worker: NetWorker | null = null;
    onopen: ((socket: TSocket) => void);
    onclose: ((socket: TSocket, code: CloseCode, msg: string) => void);
    onmessage: ((socket: TSocket, msg: Message) => void);
    onerror: ((error: ErrorEvent) => void);
    sockets: Map<number, TSocket> = new Map;

    constructor(
        public readonly port: number,
        public readonly maxSockets: number,
        private socketType = Socket as Constructor<TSocket>
    ) {
        const NOP = function () { };
        this.onopen = NOP;
        this.onclose = NOP;
        this.onmessage = NOP;
        this.onerror = err => Log.error(err);
    }

    get size() {
        return this.sockets.size;
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            Log.info(`Opening NetWorker on port ${this.port}`);
            this.worker = new NetWorker(this.port, this.maxSockets);
            this.worker.once("message", this.beforeReady.bind(this, resolve, reject));
        });
    }

    async stop() {
        return new Promise<void>((ok, err) => {
            this.worker!.postMessage([CommandKind.Shutdown]);
            this.worker!.removeAllListeners();
            const onExit = () => {
                this.worker!.removeAllListeners();
                this.worker = null;
                ok();
            };
            const onError = (event: ErrorEvent) => {
                this.worker!.removeAllListeners();
                this.worker = null;
                err(event);
            }
            this.worker!.on("exit", onExit);
            this.worker!.on("error", onError);
        });
    }

    /**
     * Send `data` to every socket expect for those in `exclude`.
     * 
     * This is faster than sending the data to one socket at a time.
     * 
     * `include === true` means the broadcast recipients will only include sessions from `ids`.
     */
    broadcast(data: ArrayBuffer, include: true, ids: number[]): void;
    /**
     * Send `data` to every socket expect for those in `exclude`.
     * 
     * This is faster than sending the data to one socket at a time.
     * 
     * `include === false` means the broadcast recipient will be every session,
     * expect for those in `ids`.
     */
    broadcast(data: ArrayBuffer, include: false, ids?: number[]): void;
    /** @internal implementation */
    broadcast(data: ArrayBuffer, include: boolean, ids?: number[]) {
        if (this.worker === null || !this.worker.running) {
            return;
        }
        this.worker.broadcast(data, include as any, ids);
    }

    private onSocketEvent = (event: Event) => {
        switch (event[0]) {
            case EventKind.Failed: {
                this.onerror(new ErrorEvent("error", { message: event[1] }));
            } break;
            case EventKind.SocketOpen: {
                const socket = new this.socketType(event[1], this.worker);
                this.sockets.set(socket.id, socket);
                this.onopen(socket);
            } break;
            case EventKind.SocketClose: {
                this.onclose(
                    this.sockets.get(event[1])!,
                    event[2],
                    Buffer.from(event[3]).toString("utf-8"));
            } break;
            case EventKind.SocketData: {
                this.onmessage(
                    this.sockets.get(event[1])!,
                    Message.parse(event[2]));
            } break;
            default: {
                this.worker!.postMessage([CommandKind.Shutdown]);
                this.worker = null;
                Log.error(`Invalid socket event while SocketListener->NetWorker is running: `, event);
            } break;
        }
    }

    private onSocketError = (error: ErrorEvent) => {
        this.onerror(error);
    }

    private beforeReady(resolve: () => void, reject: (reason: string) => void, event: any) {
        Log.info(event);
        let sEvent = event as Event;
        switch (sEvent[0]) {
            case EventKind.Ready: {
                Log.info(`NetWorker ready`);
                this.worker!.on("message", this.onSocketEvent);
                this.worker!.on("error", this.onSocketError);
                resolve();
                break;
            }
            case EventKind.Failed: {
                reject(sEvent[1]);
                break;
            }
            default: {
                this.worker!.postMessage([CommandKind.Shutdown]);
                this.worker = null;
                reject(`Invalid socket event while starting SocketListener->NetWorker`);
            } break;
        }
    }
}


export const enum CloseCode {
    Normal = 1000,
    GoingAway = 1001,
    ProtocolError = 1002,
    Unsupported = 1003,
    NoStatus = 1005,
    Abnormal = 1006,
    UnsupportedPayload = 1007,
    PolicyViolation = 1008,
    FrameTooLarge = 1009,
    MissingExtension = 1010,
    ServerError = 1011,
    ServiceRestart = 1012,
    TryAgainLater = 1013,
    BadGateway = 1014,
    TLSHandshakeFail = 1015
}

export const CloseCodeMessage = Object.freeze({
    [CloseCode.Normal]: "Regular socket shutdown",
    [CloseCode.GoingAway]: "Client is gracefully closing the socket",
    [CloseCode.ProtocolError]: "Endpoint received a malformed frame",
    [CloseCode.Unsupported]: "Endpoint received an unsupported frame",
    [CloseCode.NoStatus]: "Expected close status, received none",
    [CloseCode.Abnormal]: "Connection closed without a close frame",
    [CloseCode.UnsupportedPayload]: "Endpoint received a malformed payload",
    [CloseCode.PolicyViolation]: "Client violated server policy",
    [CloseCode.FrameTooLarge]: "Endpoint received a frame which exceeds the maximum size",
    [CloseCode.MissingExtension]: "Client wanted an extension which server did not negotiate",
    [CloseCode.ServerError]: "Internal server error",
    [CloseCode.ServiceRestart]: "Service is restarting",
    [CloseCode.TryAgainLater]: "Requests are temporarily blocked",
    [CloseCode.BadGateway]: "Server acting as a gateway received an invalid response",
    [CloseCode.TLSHandshakeFail]: "Transport Layer Security handshake failure",
});

// TODO: instead of sending arrays, try serializing/deserializing into ArrayBuffers
// they are transfered directly without copying, which should mean extra performance
export const enum EventKind {
    Ready = 0,
    Failed = 1,
    SocketOpen = 2,
    SocketClose = 3,
    SocketData = 4,
}
export type ReadyEvent = [kind: EventKind.Ready];
export type FailedEvent = [kind: EventKind.Failed, reason: string];
export type OpenEvent = [kind: EventKind.SocketOpen, id: number];
export type CloseEvent = [kind: EventKind.SocketClose, id: number, code: CloseCode, message: ArrayBuffer];
export type MessageEvent = [kind: EventKind.SocketData, id: number, message: ArrayBuffer];
export type Event =
    | ReadyEvent
    | FailedEvent
    | OpenEvent
    | CloseEvent
    | MessageEvent
    ;
export const enum CommandKind {
    Send = 0,
    Close = 1,
    Broadcast = 2,
    Shutdown = 3,
}
export type SendCommand = [kind: CommandKind.Send, id: number, data: ArrayBuffer];
export type CloseCommand = [kind: CommandKind.Close, id: number];
export type BroadcastCommand = [kind: CommandKind.Broadcast, ids: Uint32Array, include: boolean, data: ArrayBuffer];
export type ShutdownCommand = [kind: CommandKind.Shutdown];
export type Command =
    | SendCommand
    | CloseCommand
    | BroadcastCommand
    | ShutdownCommand
    ;