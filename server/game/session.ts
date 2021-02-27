import { Socket, SocketManager } from "server/net";
import { Entity, Null } from "uecs";

export class Session extends Socket {
    entity: Entity = Null
}
export class SessionManager extends SocketManager<Session> {

    constructor(
        port: number,
        maxSockets: number,
    ) {
        super(port, maxSockets, Session);
    }
}