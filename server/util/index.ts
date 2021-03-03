
export * from "./worker";

import { resolve, extname } from "path";
import { readdirSync } from "fs";

/** 
 * Recursively searches through a directory, optionally including only files with `ext`
 */
export function* walk(dir: string, ext?: string): Generator<string> {
    const subdirs = readdirSync(dir, { withFileTypes: true });
    for (let i = 0; i < subdirs.length; ++i) {
        const resolved = resolve(dir, subdirs[i].name);
        if (subdirs[i].isDirectory()) {
            yield* walk(resolved);
        } else {
            if (ext !== undefined) {
                if (extname(resolved) === ext)
                    yield resolved;
            } else {
                yield resolved;
            }
        }
    }
}