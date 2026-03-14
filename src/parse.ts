import * as P from "parsimmon";

const STITCH_LIST = ["sc", "hdc", "dc", "htc", "tc"];


// (sc, dc) together --> like a decrease
// (sc, dc) in same st --> like an increase
// Marks:     sc mark red, 
// In: sc in red

//Marks:
// Making a mark with the mark command (eg. sc mark red)
// Access a mark with it's name and offset (eg. sc in red+1)
// Special marks: "hook" always points to current stitch




interface RowPiece {
    count: number,
    name?: string,
    together?: boolean,
    in_name?: string,
    pieces?: RowPiece[],
    marking?: string,
}
function make_line_parser() {
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

export { make_line_parser, STITCH_LIST };
export type { RowPiece };