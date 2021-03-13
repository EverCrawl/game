export * from "./handle";

async function connect(address: string, options: {
    timeout?: number,
    credentials?: string,
} = {}): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${address}/`, options.credentials);
        ws.binaryType = "arraybuffer";
        let opened = false;
        ws.onopen = _ => {
            opened = true;
            ws.onclose = null;
            ws.onerror = null;
            resolve(ws);
        }
        ws.onclose = _ => {
            if (!opened) ws.close();
            reject("Closed");
        }
        ws.onerror = (err) => {
            if (!opened) ws.close();
            reject(err);
        }
        if (options.timeout) {
            setTimeout(_ => {
                if (!opened) ws.close();
                reject("Timed out");
            }, options.timeout);
        }
    });
}

export class Socket {
    /**
     * The socket is in the process of connecting.
     * 
     * It is possible to close the socket.
     */
    public static readonly CONNECTING = 0;
    /**
     * The socket has established a connection.
     * 
     * It is possible to close the socket, or send and receive data.
     */
    public static readonly OPEN = 1;
    /**
     * The socket is closing an established connection.
     * 
     * No interaction is possible with the socket.
     */
    public static readonly CLOSING = 2;
    /**
     * The socket has no established connection.
     * 
     * It is possible to attempt a reconnection.
     */
    public static readonly CLOSED = 3;

    private packets_: ArrayBuffer[];
    private ws_?: WebSocket;

    /**
     * @param address 
     * @param credentials login credentials in the form `username:password`
     * @param timeout in milliseconds
     */
    constructor(
        public readonly address: string,
        private credentials?: string,
    ) {
        this.packets_ = [];
    }

    get state(): number {
        return this.ws_?.readyState ?? Socket.CLOSED;
    }

    get empty(): boolean {
        return this.packets_.empty();
    }

    async open(timeout?: number) {
        this.ws_ = await connect(this.address, { timeout, credentials: this.credentials });
        this.ws_.onerror = this._onerror;
        this.ws_.onmessage = this._onmessage;
        this.ws_.onclose = this._onclose;
    }

    close(): void {
        if (this.state !== Socket.CONNECTING && this.state !== Socket.OPEN) return;
        this.ws_!.close();
    }

    send(data: ArrayBuffer): void {
        if (this.state !== Socket.OPEN) return;
        this.ws_!.send(data);
    }

    read(): ArrayBuffer | undefined {
        return this.packets_.shift();
    }

    readAll(): Generator<ArrayBuffer> {
        let self = this;
        return (function* () {
            while (!self.empty) yield self.read()!;
        })();
    }

    /**
     * Error handler
     */
    onerror?: ((event: Event) => void);
    /**
     * Disconnection handler
     * This will be called when the socket fully closes a connection.
     */
    onclose?: ((event: CloseEvent) => void);
    /**
     * Connection handler
     * This will be called when the socket successfully establishes a connection.
     */
    onconnect?: ((event: Event) => void);

    private _onerror = (event: Event): void => {
        if (this.onerror) this.onerror(event);
        else console.error(event);
    }
    private _onclose = (event: CloseEvent): void => {
        if (this.onclose) this.onclose(event);
        else console.log(`Disconnected from ${this.address}`);
    }
    private _onmessage = (event: MessageEvent<any>): void => {
        this.packets_.push(event.data);
    }
}


// All this stuff is from the first attempt at implementing reconnections
// I didn't want to completely lose all progress, so I put it here :)
/**
 * @param reconnectPolicy what action the Socket should take when the connection is closed
 * @param reconnectAttempts if reconnectPolicy is BOUNDED, specifies how many times the Socket should attempt to reconnect in a row.
 * @param reconnectInterval if reconnectPolicy is BOUNDED, specifies the base interval between reconnection attempts.
 * @param reconnectIntervalScale if reconnectPolicy is BOUNDED, specifies how much the interval grows between attempts.
 */
/*
private reconnectPolicy: SocketReconnectPolicy = SocketReconnectPolicy.NEVER,
private reconnectAttempts: number = 3,
private reconnectInterval: number = 1000,
private reconnectIntervalScale: number = 3, */

/* export const enum SocketReconnectPolicy {
    // Never attempt to reconnect
    NEVER = 0,
    // Attempt to reconnect `Socket.retryCount` times.
    BOUNDED = 1,
    // Attempt to reconnect forever.
    ALWAYS = 2
} */

/**
 * The socket has no established connection, but is in the process of
 * re-establishing it's previously established connection.
 *
 * It is possible to close the socket.
 */
/* RECONNECTING = 4, */
/**
 * Reconnecting handler
 * This will be called only whenever a reconnection attempt begins, if the policy allows reconnecting.
 *
 * By default just logs disconnections
 */
/* onreconnecting?: ((event: Event) => void); */
/**
 * Reconnection handler.
 * This will be called when the socket successfully re-establishes a connection.
 *
 * By default just logs reconnections
 */
/* onreconnect?: ((event: Event) => void); */
