import { App, DISABLED, WebSocket, us_listen_socket, HttpResponse, HttpRequest, us_socket_context_t, us_listen_socket_close } from "uWebSockets.js"
import { MessagePort, parentPort, workerData, isMainThread } from "worker_threads";
import { CloseCode, EventKind, Command, CommandKind } from "server/net/socket";
import { FileWorker } from "server/util";
import { Message } from "common/net/message";

export class NetWorker extends FileWorker {
    running = false;
    constructor(port: number, maxSockets: number) {
        super(__filename, { workerData: { port, maxSockets } });

        this.once("online", () => this.running = true);
        this.once("exit", () => this.running = false);
    }

    send(id: number, data: ArrayBuffer) {
        this.postMessage([CommandKind.Send, id, data], [data]);
    }
    close(id: number) {
        this.postMessage([CommandKind.Close, id]);
    }
    broadcast(data: ArrayBuffer, exclude: number[] = []) {
        const excludeBuf = new Uint32Array(exclude);
        this.postMessage([CommandKind.Broadcast, excludeBuf, data], [excludeBuf.buffer, data]);
    }
}

function workerMain(parent: MessagePort, port: number, maxSockets: number) {

    let listen_socket: us_listen_socket | null = null;
    let socketId = 0;
    let numSockets = 0;
    let sockets: Record<number, WebSocket> = {};

    const onUpgrade = async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
        if (numSockets >= maxSockets) {
            res.writeStatus("503 Service Unavailable").end();
            return;
        }

        const url = req.getUrl();
        const headers: Record<string, string> = {};
        req.forEach((key, value) => headers[key] = value);

        res.aborted = false;
        res.onAborted(() => res.aborted = true);
        // check `res.aborted` after each async operation

        // TODO: authentication, fetching player data here
        // await new Promise(resolve => setTimeout(resolve, 1000));

        if (res.aborted) return;
        res.upgrade(
            { url },
            headers["sec-websocket-key"],
            headers["sec-websocket-protocol"],
            headers["sec-websocket-extensions"],
            context
        );
    }

    const onOpen = (ws: WebSocket) => {
        numSockets++;
        ws.id = socketId++;
        sockets[ws.id] = ws;
        parent.postMessage([EventKind.SocketOpen, ws.id]);
    }

    const onClose = (ws: WebSocket, code: CloseCode, message: ArrayBuffer) => {
        numSockets--;
        delete sockets[ws.id];
        const data = message.slice(0);
        parent.postMessage([EventKind.SocketClose, ws.id, code, data], [data]);
    }

    const onMessage = (ws: WebSocket, message: ArrayBuffer) => {
        if (Message.verify(message)) {
            // TODO: investigate if this copy is necessary
            // if uWS doesn't manually free the ArrayBuffer, then this copy isn't required
            let data = message.slice(0);
            parent.postMessage([EventKind.SocketData, ws.id, data], [data]);

            // legitimate clients won't send non-binary data,
            // and they won't send invalid messages.
        } else ws.close();
    }

    const onCommand = (cmd: Command) => {
        switch (cmd[0]) {
            case CommandKind.Close: {
                const id = cmd[1];
                const socket = sockets[id];
                if (socket !== undefined) {
                    socket.close();
                    delete sockets[id];
                }
            } break;
            case CommandKind.Send: {
                const id = cmd[1];
                const socket = sockets[id];
                if (socket !== undefined) {
                    socket.send(cmd[2], true);
                }
            } break;
            case CommandKind.Broadcast: {
                const exclude = cmd[1];
                const data = cmd[2];

                const slist = Object.values(sockets);
                next: for (let i = 0; i < slist.length; ++i) {
                    const socket = slist[i];
                    for (let j = 0; j < exclude.length; ++j) {
                        if (socket.id === exclude[j]) continue next;
                    }
                    socket.send(data, true);
                }
            } break;
            case CommandKind.Shutdown: {
                for (const id of Object.keys(sockets)) {
                    sockets[id as any].close();
                    delete sockets[id as any];
                }
                sockets = {};
                if (listen_socket !== null) us_listen_socket_close(listen_socket);
                listen_socket = null;
                parent.off("message", onCommand);
            }
        }
    }

    App().ws("/*", {
        compression: DISABLED,
        // TODO: is this a good max backpressure?
        idleTimeout: 0, maxBackpressure: 1024, maxPayloadLength: 512,
        upgrade: onUpgrade, open: onOpen, close: onClose, message: onMessage
    }).listen(port, (result: false | us_listen_socket) => {
        if (result === false) {
            throw new Error(`Failed to listen on port ${port}`);
        }
        else {
            listen_socket = result;
            parent.on("message", onCommand);
            parent.postMessage([EventKind.Ready]);
        }
    });
}

if (!isMainThread) {
    if (parentPort === null) {
        throw new Error(`Parent port doesn't exist`);
    }
    const port = workerData.port as number | undefined;
    if (typeof port !== "number") {
        throw new Error(`Required WorkerData field 'port' not found`);
    }
    const maxSockets = workerData.maxSockets as number | undefined;
    if (typeof maxSockets !== "number") {
        throw new Error(`Required WorkerData field 'maxSockets' not found`);
    }

    workerMain(parentPort, port, maxSockets);
}