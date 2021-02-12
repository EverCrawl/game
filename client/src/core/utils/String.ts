
declare global {
    interface String {
        hash(): number;
        /* startsWith(it: string): boolean; */
    }
}

if (String.prototype.hash == null) {
    // Credit: https://github.com/garycourt/murmurhash-js
    window.String.prototype.hash = function (seed: number = 0) {
        let k1;
        let i = 0;
        while (i < this.length - (this.length & 3)) {
            k1 =
                ((this.charCodeAt(i) & 0xff)) |
                ((this.charCodeAt(++i) & 0xff) << 8) |
                ((this.charCodeAt(++i) & 0xff) << 16) |
                ((this.charCodeAt(++i) & 0xff) << 24);
            ++i;

            k1 = ((((k1 & 0xffff) * 0xcc9e2d51) + ((((k1 >>> 16) * 0xcc9e2d51) & 0xffff) << 16))) & 0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = ((((k1 & 0xffff) * 0x1b873593) + ((((k1 >>> 16) * 0x1b873593) & 0xffff) << 16))) & 0xffffffff;

            seed ^= k1;
            seed = (seed << 13) | (seed >>> 19);
            const seedb = ((((seed & 0xffff) * 5) + ((((seed >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
            seed = (((seedb & 0xffff) + 0x6b64) + ((((seedb >>> 16) + 0xe654) & 0xffff) << 16));
        }

        k1 = 0;

        switch (this.length & 3) {
            case 3: k1 ^= (this.charCodeAt(i + 2) & 0xff) << 16;
            case 2: k1 ^= (this.charCodeAt(i + 1) & 0xff) << 8;
            case 1: k1 ^= (this.charCodeAt(i) & 0xff);

                k1 = (((k1 & 0xffff) * 0xcc9e2d51) + ((((k1 >>> 16) * 0xcc9e2d51) & 0xffff) << 16)) & 0xffffffff;
                k1 = (k1 << 15) | (k1 >>> 17);
                k1 = (((k1 & 0xffff) * 0x1b873593) + ((((k1 >>> 16) * 0x1b873593) & 0xffff) << 16)) & 0xffffffff;
                seed ^= k1;
        }

        seed ^= this.length;

        seed ^= seed >>> 16;
        seed = (((seed & 0xffff) * 0x85ebca6b) + ((((seed >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
        seed ^= seed >>> 13;
        seed = ((((seed & 0xffff) * 0xc2b2ae35) + ((((seed >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
        seed ^= seed >>> 16;

        return seed >>> 0;
    }
}

/* if (String.prototype.startsWith == null) {
    String.prototype.startsWith = function (it: string): boolean {
        for (let i = 0, len = it.length; i < len; ++i) {
            if (this[i] !== it[i]) return false;
        }
        return true;
    }
} */

export function splitByUpperCase(value: string): string[] {
    const originalCase = value;
    const lowerCase = value.toLowerCase();

    let split_name = "";
    for (let i = 0, len = value.length; i < len; ++i) {
        if (originalCase[i] === lowerCase[i]) split_name += lowerCase[i];
        else split_name += ` ${lowerCase[i]}`;
    }
    return split_name.trim().split(" ");
}