import * as Action from "./action";
export * as Action from "./action";
export { Create } from "./create";
export { Delete } from "./delete";
export { Initial } from "./initial";
export { Position } from "./position";
export { Transfer } from "./transfer";
export const enum Id {
    Create = 2,
    Delete = 3,
    Initial = 4,
    Position = 5,
    Transfer = 6,
}
export const ID_MAX = 7;
export const Name = Object.freeze({
    [Action.Id.Move]: "Move",
    [Action.Id.Use]: "Use",
    [Id.Create]: "Create",
    [Id.Delete]: "Delete",
    [Id.Initial]: "Initial",
    [Id.Position]: "Position",
    [Id.Transfer]: "Transfer",
});
export type Name = typeof Name;
