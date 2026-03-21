import * as P from "parsimmon";

export const STITCH_LIST = ["sc", "hdc", "dc", "htc", "tc", "ch", "sk", "join", "turn"];

export const ALIAS_MAP: Record<string, RowPiece[]> = {
    "inc": [{ count: 2, name: "sc", in_name: "next" }],
    "dec": [{ count: 2, name: "sc", together: true }],
};


// Stitch list: sc, hdc, dc, htc, tc, ch, sk, join
// Alias list: "inc" means (2sc in same st), "dec" means (sc2together)

// Special stitches:
//      ch --> create a stitch, but do not consume a stitch from the input layer.
//      sk --> Consume a stitch from the input layer but do not make a new stitch.

// Marks: "sc#red" marks that stitch with the tag "red"
// Special marks: "next" always points to the next stitch to be worked in. "xth from hook" means the stitch going back x positions.
// In: sc in red --> Makes a stitch in that marker, continues after. Use "2sc in next" to make an increase
// Together: 2sc together --> Means all stitches are combined into one. Use "sc2together" to make a simple decrease
// Join: join red --> Immediately connects to that stitch, continues from the stitches after
// Marks can also be referenced like "red+1" for the stitch after red
// Example ring: ch#start, 15 ch, join start




export interface RowValidation {
    inputStitches: number;
    outputStitches: number;
    isValid: boolean;
    expectedInput?: number;
}



export interface RowPiece {
    count: number,
    name?: string,
    together?: boolean,
    in_name?: string,
    pieces?: RowPiece[],
    marking?: string,
}
export function make_line_parser() {
    return P.createLanguage<{
        PreMultiply: number,
        PostMultiply: number,
        Stitch: RowPiece | RowPiece[],
        Suffixes: RowPiece,
        List: RowPiece,
        Any: RowPiece | RowPiece[],
        ItemList: RowPiece[]
    }>({
        PreMultiply: function () {
            return P.digits.skip(P.oneOf("x*").fallback(null).trim(P.optWhitespace)).assert(v => (v != "0"), "Multiplier cannot be zero").map(v => Number(v) || 1).fallback(1);
        },
        PostMultiply: function () {
            return P.oneOf("x*").fallback(null).trim(P.optWhitespace).then(P.digits).assert(v => (v != "0"), "Multiplier cannot be zero").map(v => Number(v) || 1).fallback(1);
        },
        Stitch: function (r) {
            let stitches_list = new Set(STITCH_LIST);
            let aliases = Object.keys(ALIAS_MAP);
            let stitch_names_parser = P.letters.chain(s => {
                if (stitches_list.has(s) || aliases.includes(s)) return P.succeed(s);
                return P.fail("Not a stitch or alias");
            });
            return P.seq(
                r.PreMultiply,
                stitch_names_parser,
                r.PostMultiply,
                P.string("#").then(P.regexp(/[a-zA-Z0-9_]+/)).fallback(""),
                r.Suffixes,
            ).map(([count1, name, count2, hash_mark, suffixes]) => {
                const count = count1 * count2;
                if (ALIAS_MAP[name]) {
                    // For aliases, we replicate the alias content 'count' times
                    let base = ALIAS_MAP[name];
                    let result: RowPiece[] = [];
                    for (let i = 0; i < count; i++) {
                        result.push(...JSON.parse(JSON.stringify(base)));
                    }
                    if (hash_mark) result[result.length - 1].marking = hash_mark;
                    if (suffixes.together) result.forEach(p => p.together = true);
                    if (suffixes.in_name) result.forEach(p => p.in_name = suffixes.in_name);
                    if (suffixes.marking) result[result.length - 1].marking = suffixes.marking;
                    return result;
                }
                let item: RowPiece = { ...suffixes, name, count };
                if (hash_mark) item.marking = hash_mark;
                return item;
            }) as P.Parser<RowPiece | RowPiece[]>;
        },
        Suffixes: function () {
            return P.seq(
                P.alt(P.string("together"), P.string("tog")).trim(P.optWhitespace).fallback(""),
                P.string("in").trim(P.optWhitespace).then(P.regexp(/[a-zA-Z0-9+_\- ]+/)).fallback(""),
            ).map(([tog, in_name]) => {
                let item = { count: 1 } as RowPiece;
                if (tog === "together" || tog === "tog") {
                    item.together = true;
                }
                if (in_name.length != 0) {
                    item.in_name = in_name.trim();
                }
                return item;
            });
        },
        List: function (r) {
            return P.seq(
                r.PreMultiply,
                P.string("(").then(r.ItemList).skip(P.string(")")),
                r.PostMultiply,
                P.string("#").then(P.regexp(/[a-zA-Z0-9_]+/)).fallback(""),
                r.Suffixes,
            ).map(([count1, pieces, count2, hash_mark, suffixes]) => {
                let item: RowPiece = { ...suffixes, pieces, count: count1 * count2 };
                if (hash_mark) item.marking = hash_mark;
                return item;
            }) as P.Parser<RowPiece>;
        },
        Any: function (r) {
            return P.alt(r.List, r.Stitch);
        },
        ItemList: function (r) {
            return r.Any.sepBy(P.string(",").trim(P.optWhitespace)).map(items => {
                let result: RowPiece[] = [];
                for (let item of items) {
                    if (Array.isArray(item)) {
                        result.push(...item);
                    } else {
                        result.push(item);
                    }
                }
                return result;
            });
        }
    })
}

export function parseRows(text: string): { rows: RowPiece[][], errors: boolean[], validation: RowValidation[] } {
    const parser = make_line_parser();
    const lines = text.split("\n");
    const errors: boolean[] = [];
    const rows = lines
        .map(line => line.trim())
        .map((line, i) => {
            if (line.length === 0) {
                errors[i] = false;
                return [];
            }
            try {
                // Each line is a row: parse as ItemList
                const res = parser.ItemList.tryParse(line);
                errors[i] = false;
                return res;
            } catch (e) {
                errors[i] = true;
                return [];
            }
        });

    const validation: RowValidation[] = rows.map((row, i) => {
        const inputStitches = calculateInputStitches(row);
        const outputStitches = calculateOutputStitches(row);
        let isValid = true;
        let expectedInput: number | undefined = undefined;

        // If row contains 'turn', it's always valid in terms of input count (it doesn't consume)
        // Actually, turn should be treated like ch/join in terms of input/output count
        if (i > 0) {
            // Find the last non-empty row to get expected input
            for (let j = i - 1; j >= 0; j--) {
                if (rows[j].length > 0 && !errors[j]) {
                    expectedInput = calculateOutputStitches(rows[j]);
                    break;
                }
            }

            if (expectedInput !== undefined && row.length > 0 && !errors[i]) {
                isValid = inputStitches === expectedInput;
            }
        }

        return { inputStitches, outputStitches, isValid, expectedInput };
    });

    return { rows, errors, validation };
}

export function calculateInputStitches(pieces: RowPiece[]): number {
    let inputStitches = 0;
    for (const piece of pieces) {
        if (piece.name === "ch") {
            // ch does not consume a stitch
            continue;
        }
        if (piece.pieces) {
            const subInput = calculateInputStitches(piece.pieces);
            if (piece.together) {
                inputStitches += subInput * piece.count;
            } else if (piece.in_name) {
                inputStitches += 1 * piece.count;
            } else {
                inputStitches += subInput * piece.count;
            }
        } else {
            // Basic stitch
            if (piece.together) {
                inputStitches += piece.count;
            } else if (piece.in_name) {
                inputStitches += 1;
            } else {
                inputStitches += piece.count;
            }
        }
    }
    return inputStitches;
}

export function calculateOutputStitches(pieces: RowPiece[]): number {
    let outputStitches = 0;
    for (const piece of pieces) {
        if (piece.name === "sk") {
            // sk does not produce a stitch
            continue;
        }
        if (piece.pieces) {
            const subOutput = calculateOutputStitches(piece.pieces);
            if (piece.together) {
                outputStitches += 1 * piece.count;
            } else {
                outputStitches += subOutput * piece.count;
            }
        } else {
            // Basic stitch
            if (piece.together) {
                outputStitches += 1;
            } else if (piece.name === "join" || piece.name === "turn") {
                outputStitches += 0;
            } else {
                outputStitches += piece.count;
            }
        }
    }
    return outputStitches;
}
