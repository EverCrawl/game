
export function filter<T>(array: T[], check: (item: T, index: number, array: T[]) => boolean): T[] {
    const newArray = [];
    for (let i = 0, len = array.length; i < len; ++i) {
        if (!check(array[i], i, array)) {
            newArray.push(array[i]);
        }
    }
    return newArray;
}