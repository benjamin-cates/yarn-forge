import { expect, test } from "vitest";
import { make_line_parser, STITCH_LIST, calculateInputStitches, calculateOutputStitches } from "../parse";
import type { Parser } from "parsimmon";

const stitch = (name: string, count: number = 1) => ({ name, count });
function parse_test<T>(parser: Parser<T>, text: string, output: T) {
    expect(parser.parse(text)).deep.equals({ status: true, value: output });
}

test("basic stitches", () => {
    let parser = make_line_parser().Any;
    expect(make_line_parser().PreMultiply.parse("2")).deep.equal({ status: true, value: 2 });
    expect(make_line_parser().PreMultiply.parse("3*")).deep.equal({ status: true, value: 3 });
    expect(make_line_parser().Any.parse("sc x3")).deep.equal({ status: true, value: { count: 3, name: "sc" } });
    for (let stitch of STITCH_LIST) {
        for (let count = 1; count < 110; count++) {
            let types = [
                count + "*" + stitch,
                count + " x " + stitch,
                stitch + " x " + count,
                stitch + "*" + count,
                stitch + " \t *" + count,
            ];
            for (let type of types) {
                expect(parser.parse(type)).deep.equal({ status: true, value: { count, name: stitch } });
            }
        }
        expect(parser.parse(stitch)).deep.equal({ status: true, value: { count: 1, name: stitch } });
    }
})



test("suffixes", () => {
    let parser = make_line_parser().Any;
    parse_test(parser, "sc3together", { together: true, count: 3, name: "sc" });
    parse_test(parser, "3sc in same st", { in_name: "same st", count: 3, name: "sc" });
    parse_test(parser, "(3sc,dc) together", { together: true, count: 1, pieces: [stitch("sc", 3), stitch("dc")] });
    parse_test(parser, "(3sc,dc) * 3", { count: 3, pieces: [stitch("sc", 3), stitch("dc")] });
    parse_test(parser, "(3sc,dc) * 150 together", { together: true, count: 150, pieces: [stitch("sc", 3), stitch("dc")] });
    parse_test(parser, "sc3 mark red", { marking: "red", count: 3, name: "sc" });
    parse_test(parser, "sc3 mark same st", { marking: "same st", count: 3, name: "sc" });
    console.log(parser.parse("3(3sc together, 2*dc, hdc, (hdc,dc)*2)"));

});

test("stitch counts", () => {
    const { ItemList } = make_line_parser();
    const calculate = (text: string) => {
        const row = ItemList.tryParse(text);
        return {
            in: calculateInputStitches(row),
            out: calculateOutputStitches(row)
        };
    };

    expect(calculate("sc")).deep.equal({ in: 1, out: 1 });
    expect(calculate("6sc")).deep.equal({ in: 6, out: 6 });
    expect(calculate("2sc in same st")).deep.equal({ in: 1, out: 2 });
    expect(calculate("6x(2 sc in same st)")).deep.equal({ in: 6, out: 12 });
    expect(calculate("sc3together")).deep.equal({ in: 3, out: 1 });
    expect(calculate("6x(sc, 2 sc together)")).deep.equal({ in: 18, out: 12 }); // sc consumes 1, 2sc tog consumes 2. Total 3 in, 2 out per repeat. 6 * 3 = 18, 6 * 2 = 12.
    expect(calculate("(sc, dc) together")).deep.equal({ in: 2, out: 1 });
    expect(calculate("3(sc, 2sc in same st)")).deep.equal({ in: 6, out: 9 });
});

test("together", () => {
    //let parser = make_line_parser().Any;
    //expect(parser.parse("tog(sc,2dc)")).deep.equal({ status: true, value: { together: true, pieces: [{ count: 1, name: "sc" }, { count: 2, name: "dc" }] } })

});