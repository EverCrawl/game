import * as Action from "./action";
export * as Action from "./action";
export { Create } from "./create";
export { Delete } from "./delete";
export { Initial } from "./initial";
export { Position } from "./position";
export const enum Id {
    Create = 1,
    Delete = 2,
    Initial = 3,
    Position = 4,
}
export const ID_MAX = 5;
export const Name = Object.freeze({
    [Action.Id.Move]: "Move",
    [Id.Create]: "Create",
    [Id.Delete]: "Delete",
    [Id.Initial]: "Initial",
    [Id.Position]: "Position",
});
export type Name = typeof Name;
