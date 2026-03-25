import * as P from "parsimmon";
import type { Header } from "./elements/PieceEditor";

export const STITCH_LIST = ["sc", "hdc", "dc", "htc", "tc", "ch", "sk"];

export const ALIAS_MAP: Record<string, PatternPiece[]> = {
    "inc": [{ count: 2, name: "sc", in_name: { begin: { base: "next" } } }],
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
// Marks can also be referenced like "red+1" for the stitch after red
// Example ring: ch#start, 15 ch, join start



export interface Pattern {
    name: string,
    rows: Row[],
    autoJoin: boolean,
    autoTurn: boolean,
}

export interface RowValidation {
    inputStitches: number;
    outputStitches: number;
    isValid: boolean;
    expectedInput?: number;
}

// Representation of a marker or location within a piece
// Can either be "piece_name[row]+offset" or "marker+offset"
export interface Location {
    // The base name of a location
    base: string,
    // The offset in stitch ids. For example: start-2 has offset of -2
    // Offset is optional and defaults to undefined instead of zero.
    offset?: number,
    // The row of the location. If base is the name of a piece, then base[row]+offset will point to the offset'th stitch in row. If base is a marker, then this is meaningless.
    row?: number,
}

// A range between two locations.
// Represented as "begin:end" in text, where begin and end are both representations of Location.
// If end is ommitted, then "begin" is the representation and the range only holds one stitch.
export interface LocationRange {
    begin: Location,
    end?: Location,
}

export interface PatternPiece {
    count: number,
    name?: string,
    together?: boolean,
    in_name?: LocationRange,
    pieces?: PatternPiece[],
    marking?: string,
}

export interface Row {
    pieces: PatternPiece[];
    join?: boolean;
    turn?: boolean;
}

export function make_parser() {
    return P.createLanguage<{
        PreMultiply: number,
        PostMultiply: number,
        Stitch: PatternPiece | PatternPiece[],
        Suffixes: PatternPiece,
        List: PatternPiece,
        Any: PatternPiece | PatternPiece[],
        Row: Row,
        ItemList: PatternPiece[],
        Location: Location,
        LocationRange: LocationRange,
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
                    let result: PatternPiece[] = [];
                    for (let i = 0; i < count; i++) {
                        result.push(...JSON.parse(JSON.stringify(base)));
                    }
                    if (hash_mark) result[result.length - 1].marking = hash_mark;
                    if (suffixes.together) result.forEach(p => p.together = true);
                    if (suffixes.in_name) result.forEach(p => p.in_name = suffixes.in_name);
                    if (suffixes.marking) result[result.length - 1].marking = suffixes.marking;
                    return result;
                }
                let item: PatternPiece = { ...suffixes, name, count };
                if (hash_mark) item.marking = hash_mark;
                return item;
            }) as P.Parser<PatternPiece | PatternPiece[]>;
        },
        Location: function () {
            return P.seq(
                P.regexp(/[a-zA-Z0-9_]+/),
                P.string("[").then(P.digits).skip(P.string("]")).map(Number).fallback(undefined),
                P.seq(P.alt(P.string("+"), P.string("-")), P.digits).map(([sign, v]) => parseInt(sign + v)).fallback(undefined)
            ).map(([base, row, offset]) => {
                let res: Location = { base };
                if (row !== undefined) res.row = row;
                if (offset !== undefined) res.offset = offset;
                return res;
            });
        },
        LocationRange: function (r) {
            return P.seq(
                r.Location,
                P.string(":").then(r.Location).fallback(undefined)
            ).map(([begin, end]) => {
                return { begin, end };
            });
        },
        Suffixes: function (r) {
            return P.seq(
                P.alt(P.string("together"), P.string("tog")).trim(P.optWhitespace).fallback(""),
                P.string("in").trim(P.optWhitespace).then(r.LocationRange).fallback(undefined),
            ).map(([tog, in_range]) => {
                let item = { count: 1 } as PatternPiece;
                if (tog === "together" || tog === "tog") {
                    item.together = true;
                }
                if (in_range) {
                    item.in_name = in_range;
                }
                return item;
            });
        },
        Row: function (r) {
            return P.seq(r.ItemList, P.string(",").trim(P.optWhitespace).then(P.alt(P.string("turn"), P.string("join"))).fallback(null).trim(P.optWhitespace)).map(([pieces, jointurn]) => {
                return { pieces, join: jointurn == "join" ? true : undefined, turn: jointurn == "turn" ? true : undefined } satisfies Row;
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
                let item: PatternPiece = { ...suffixes, pieces, count: count1 * count2 };
                if (hash_mark) item.marking = hash_mark;
                return item;
            }) as P.Parser<PatternPiece>;
        },
        Any: function (r) {
            return P.alt(r.List, r.Stitch);
        },
        ItemList: function (r) {
            return r.Any.sepBy(P.string(",").trim(P.optWhitespace)).map(items => {
                let result: PatternPiece[] = [];
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

export function parseRows(text: string, options: Header): {
    pattern: Pattern,
    errors: boolean[],
    validation: RowValidation[],
} {
    const parser = make_parser();
    const lines = text.split("\n");
    const errors: boolean[] = [];

    let pattern: Pattern = { rows: [], ...options };

    const rows = lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed.length === 0) {
            errors[i] = false;
            const row = { pieces: [] };
            pattern.rows.push(row);
            return row;
        }

        try {
            const res = parser.Row.tryParse(trimmed);
            errors[i] = false;
            pattern.rows.push(res);
            return res;
        } catch (e) {
            errors[i] = true;
            const row = { pieces: [] };
            pattern.rows.push(row);
            return row;
        }
    });

    const validation: RowValidation[] = rows.map((row, i) => {
        const inputStitches = calculateInputStitches(row.pieces);
        const outputStitches = calculateOutputStitches(row.pieces);
        let isValid = true;
        let expectedInput: number | undefined = undefined;

        if (expectedInput !== undefined && row.pieces.length > 0 && !errors[i]) {
            isValid = inputStitches === expectedInput;
        }
        // TODO: Fix!

        return { inputStitches, outputStitches, isValid, expectedInput };
    });

    return { pattern, errors, validation };
}

export function calculateInputStitches(pieces: PatternPiece[]): number {
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

export function calculateOutputStitches(pieces: PatternPiece[]): number {
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
