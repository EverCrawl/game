
export function nhash(values: number[]) {
    //let hash = 0 | 0;
    let hash = 0;
    for (const value of values) {
        hash = ((hash << 5) - hash) + (value & 0b1111000000000000);
        //hash |= 0;
        hash = ((hash << 5) - hash) + (value & 0b0000111100000000);
        //hash |= 0;
        hash = ((hash << 5) - hash) + (value & 0b0000000011110000);
        //hash |= 0;
        hash = ((hash << 5) - hash) + (value & 0b0000000000001111);
        //hash |= 0;
    }
    return hash;
}
