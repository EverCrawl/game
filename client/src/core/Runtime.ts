
let raf: number;
/**
 * 
 * @param update called at regular intervals
 * @param render called as much as possible, usually at monitor refresh interval
 * @param TARGET_UPDATE_MS 
 */
export function start(
    update: () => void,
    render: (t: number) => void,
    TARGET_UPDATE_MS: number
) {
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

    let last = window.performance.now();
    let lag = 0.0;
    const loop = (now: number) => {
        let dt = now - last;
        last = now;

        lag += dt;
        while (lag >= TARGET_UPDATE_MS) {
            update();
            lag -= TARGET_UPDATE_MS;
        }

        render(lag / TARGET_UPDATE_MS);
        raf = window.requestAnimationFrame(loop);
    }
    raf = window.requestAnimationFrame(loop);
}
export function stop() {
    if (raf) {
        window.cancelAnimationFrame(raf);
    }
}