
interface Time {
    now(): number;
}

type FrameFn = (callback: () => void) => void;

interface StartOptions {
    /** Update function. Called at `rate` Hz */
    update: () => void,
    /** Updates per second */
    rate: number,
    /** Render function. Called as much as possible (usually at monitor refresh rate) */
    render?: (now: number) => void,
    /** Timer used to query current time */
    time?: Time,
    /** Frame generating function. Use `requestAnimationFrame` or `setImmediate`. */
    frame?: FrameFn
}

let running = false;
export function start(options: StartOptions) {
    const update = options.update,
        render = options.render,
        rate = options.rate,
        time = options.time ?? globalThis.performance,
        frame = options.frame ?? globalThis.requestAnimationFrame;

    const TARGET_UPDATE_MS = 1000 / rate;

    // how this works:
    // 1. accumulate how much time has passed since the last frame
    // 2. if the accumulated time is greater than the update interval, call update
    // 3. calculate frame weight = a value between 0 and 1, which determines how
    //    far inbetween updates we are
    // 4. pass frame weight into render call
    //
    // This achieves two things
    // 1. frame-independent physics 
    //    - deterministic and all the nice things that come with it:
    //    - consistent, predictable, more easily synchronized with an authoritative server (!)
    // 2. smooth rendering at maximum framerate
    //    - achieved by interpolating positions inbetween frames (based on frame weight)

    let last = time.now();
    let lag = 0.0;
    const loop = render !== undefined
        ? () => {
            if (!running) return;
            const now = time.now();
            lag += now - last;
            last = now;
            while (lag >= TARGET_UPDATE_MS) {
                update();
                lag -= TARGET_UPDATE_MS;
            }
            render(lag / TARGET_UPDATE_MS);
            frame(loop);
        }
        : () => {
            if (!running) return;
            const now = time.now();
            lag += now - last;
            last = now;
            while (lag >= TARGET_UPDATE_MS) {
                update();
                lag -= TARGET_UPDATE_MS;
            }
            frame(loop);
        }
    running = true;
    frame(loop);
}
export function stop() {
    running = false;
}