import * as P from "parsimmon";

export const STITCH_LIST = ["sc", "hdc", "dc", "htc", "tc"];


// (sc, dc) together --> like a decrease
// (sc, dc) in same st --> like an increase
// Marks:     sc mark red, 
// In: sc in red

//Marks:
// Making a mark with the mark command (eg. sc mark red)
// Access a mark with it's name and offset (eg. sc in red+1)
// Special marks: "hook" always points to current stitch



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
    return P.createLanguage<{ PreMultiply: number, PostMultiply: number, Stitch: RowPiece, Suffixes: RowPiece, List: RowPiece, Any: RowPiece, ItemList: RowPiece[] }>({
        PreMultiply: function () {
            return P.digits.skip(P.oneOf("x*").fallback(null).trim(P.optWhitespace)).assert(v => (v != "0"), "Multiplier cannot be zero").map(v => Number(v) || 1);
        },
        PostMultiply: function () {
            return P.oneOf("x*").fallback(null).trim(P.optWhitespace).then(P.digits).assert(v => (v != "0"), "Multiplier cannot be zero").map(v => Number(v) || 1);
        },
        Stitch: function (r) {
            let stitches_list = new Set(STITCH_LIST);
            let stitch_names_parser = P.letters.chain(s => {
                if (stitches_list.has(s)) return P.succeed(s);
                return P.fail("");
            });
            return P.seq(
                r.PreMultiply,
                stitch_names_parser,
                r.PostMultiply,
                r.Suffixes,
            ).map(([count1, name, count2, suffixes]) => {
                if (count1 != 1 && count2 != 1) {
                    return P.fail("Cannot provide list multiplier on both sides");
                }
                return { ...suffixes, name, count: count1 * count2 };
            }) as P.Parser<RowPiece>;
        },
        Suffixes: function () {
            return P.seq(
                P.string("together").trim(P.optWhitespace).fallback(""),
                P.string("in").trim(P.optWhitespace).then(P.regexp(/[^,()]+/,)).fallback(""),
                P.string("mark").trim(P.optWhitespace).then(P.regexp(/[^,()]+/,)).fallback(""),
            ).map(([tog, in_name, mark_name]) => {
                let item = { count: 1 } as RowPiece;
                if (tog === "together") {
                    item.together = true;
                }
                if (in_name.length != 0) {
                    item.in_name = in_name;
                }
                if (mark_name.length != 0) {
                    item.marking = mark_name;
                }
                return item;
            });
        },
        List: function (r) {
            return P.seq(
                r.PreMultiply,
                P.string("(").then(r.ItemList).skip(P.string(")")),
                r.PostMultiply,
                r.Suffixes,
            ).map(([count1, pieces, count2, suffixes]) => {
                if (count1 != 1 && count2 != 1) {
                    return P.fail("Cannot provide list multiplier on both sides");
                }
                return { ...suffixes, pieces, count: count1 * count2 };
            }) as P.Parser<RowPiece>;
        },
        Any: function (r) {
            return P.alt(r.List, r.Stitch);
        },
        ItemList: function (r) {
            return r.Any.sepBy(P.string(",").trim(P.optWhitespace));
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
        if (piece.pieces) {
            const subInput = calculateInputStitches(piece.pieces);
            if (piece.together) {
                // If the whole group is worked "together", it consumes all sub-stitches
                // but usually "together" on a group means it's a decrease.
                // However, based on the parser, it seems it multiplies the count.
                inputStitches += subInput * piece.count;
            } else if (piece.in_name) {
                // If worked "in same st", the whole group consumes only 1 stitch (times count)
                inputStitches += 1 * piece.count;
            } else {
                inputStitches += subInput * piece.count;
            }
        } else {
            // Basic stitch
            if (piece.together) {
                // e.g., "sc3together" consumes 3 stitches
                inputStitches += piece.count;
            } else if (piece.in_name) {
                // e.g., "3sc in same st" consumes 1 stitch
                inputStitches += 1;
            } else {
                // e.g., "3sc" consumes 3 stitches
                inputStitches += piece.count;
            }
        }
    }
    return inputStitches;
}

export function calculateOutputStitches(pieces: RowPiece[]): number {
    let outputStitches = 0;
    for (const piece of pieces) {
        if (piece.pieces) {
            const subOutput = calculateOutputStitches(piece.pieces);
            if (piece.together) {
                // If worked "together", it results in 1 stitch (times count)
                outputStitches += 1 * piece.count;
            } else {
                outputStitches += subOutput * piece.count;
            }
        } else {
            // Basic stitch
            if (piece.together) {
                // e.g., "sc3together" results in 1 stitch
                outputStitches += 1;
            } else {
                // e.g., "3sc" results in 3 stitches, "3sc in same st" results in 3 stitches
                outputStitches += piece.count;
            }
        }
    }
    return outputStitches;
}