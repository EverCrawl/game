
declare global {
    interface Array<T> {
        equals(that: Array<T>): boolean;
        front(): T;
        back(): T;
        swap(a: number, b: number): void;
        empty(): boolean;
    }
}

if (Array.prototype.equals == null) {
    window.Array.prototype.equals = function <T>(this: Array<T>, that: Array<T>): boolean {
        if (this === that) return true;
        if (this == null || that == null) return false;
        if (this.length != that.length) return false;

        for (let i = 0; i < this.length; ++i) {
            if (this[i] !== that[i]) return false;
        }
        return true;
    }
}
if (Array.prototype.front == null) {
    window.Array.prototype.front = function <T>(this: Array<T>): T | undefined {
        return this[0];
    }
}
if (Array.prototype.back == null) {
    window.Array.prototype.back = function <T>(this: Array<T>): T | undefined {
        return this[this.length - 1];
    }
}
if (Array.prototype.swap == null) {
    window.Array.prototype.swap = function <T>(this: Array<T>, a: number, b: number): void {
        const temp = this[a];
        this[a] = this[b];
        this[b] = temp;
    }
}
if (Array.prototype.empty == null) {
    window.Array.prototype.empty = function <T>(this: Array<T>): boolean {
        return this.length === 0;
    }
}

export { }