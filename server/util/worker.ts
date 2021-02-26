import { Worker, WorkerOptions } from "worker_threads";
import path from "path";

// ".ts" or ".js", depending on if this file has been transpiled by TSC
const ext = path.extname(__filename);

function startsWithSingleDot(file: string) {
    var first2chars = file.slice(0, 2);
    return first2chars === '.' + path.sep || first2chars === './';
}
function replaceExt(file: string, ext: string) {
    const fileExt = path.extname(file);
    if (fileExt === ext) return file;

    var outFile = path.basename(file, fileExt) + ext;
    var outPath = path.join(path.dirname(file), outFile);

    // Because `path.join` removes the head './' from the given path.
    // This removal can cause a problem when passing the result to `require` or
    // `import`.
    if (startsWithSingleDot(file)) {
        return '.' + path.sep + outPath;
    }

    return outPath;
}

let workerSetupCode = "";
// for running .ts files in ts-node, some extra setup is required
if (ext === ".ts") {
    // this registers the absolute path resolution and the TS 
    // transpilation settings, according to `tsconfig.json`
    workerSetupCode += `require("tsconfig-paths/register");\n`
    workerSetupCode += `require("ts-node/register");\n`
}
workerSetupCode += `require(require("worker_threads").workerData.$FILE);`;

export class FileWorker extends Worker {
    constructor(
        public readonly filePath: string,
        opts: WorkerOptions = { workerData: {} }
    ) {
        super(workerSetupCode, {
            ...opts,
            eval: true,
            workerData: {
                ...opts.workerData,
                $FILE: (ext === ".js") ? replaceExt(filePath, ext) : filePath
            }
        });
    }
}