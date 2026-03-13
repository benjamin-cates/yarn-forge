// Example leaf chain
//  ch 4
// in 4 st from hook: (2 ch, 6dc, tc, 2ch, tc, 6dc, 2ch, sl st, ch 14)
// in 4 st from hook: (2 ch, 6dc, tc, 2ch, tc, 6dc, 2ch, sl st, ch 14)


// Example sphere




interface Stitch {
    render: () => void,
    to_base_elements: () => string[],
    to_string: () => string,
}

class BasicStitch implements Stitch {
    type: string;
    count: number;
    constructor(type: string, count: number) {
        this.type = type;
        this.count = count;
    }
    render() {
        return
    }
    to_base_elements() {
        return Array(this.count).fill(this.type);
    }
    to_string() {
        return this.count.toString() + this.type;
    }
}
class Repeat implements Stitch {
    stitches: Stitch[];
    count: number;
    constructor(stitches: Stitch[], count: number) {
        this.stitches = stitches;
        this.count = count;
    }
    render() {
        return
    }
    to_base_elements() {
        let out = [];
        for (let i = 0; i < this.count; i++) {
            for (let j = 0; j < this.stitches.length; j++) {
                out.push(...(this.stitches[j].to_base_elements()));
            }
        }
        return out;
    }
    to_string() {
        return "[" + this.stitches.map(v => v.to_string()).join(", ") + "]*" + this.count;
    }
}