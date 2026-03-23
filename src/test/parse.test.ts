import { expect, test } from "vitest";
import { make_parser, STITCH_LIST, calculateInputStitches, calculateOutputStitches } from "../parse";
import type { Parser } from "parsimmon";

const stitch = (name: string, count: number = 1) => ({ name, count });
function parse_test<T>(parser: Parser<T>, text: string, output: T) {
    expect(parser.parse(text)).deep.equals({ status: true, value: output });
}

test("basic stitches", () => {
    let parser = make_parser().Any;
    expect(make_parser().PreMultiply.parse("2")).deep.equal({ status: true, value: 2 });
    expect(make_parser().PreMultiply.parse("3*")).deep.equal({ status: true, value: 3 });
    expect(make_parser().Any.parse("sc x3")).deep.equal({ status: true, value: { count: 3, name: "sc" } });
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
    let parser = make_parser().Any;
    parse_test(parser, "sc3together", { together: true, count: 3, name: "sc" });
    parse_test(parser, "3sc in same", { in_name: { begin: { base: "same" }, end: undefined }, count: 3, name: "sc" });
    parse_test(parser, "(3sc,dc) together", { together: true, count: 1, pieces: [stitch("sc", 3), stitch("dc")] });
    parse_test(parser, "(3sc,dc) * 3", { count: 3, pieces: [stitch("sc", 3), stitch("dc")] });
    parse_test(parser, "(3sc,dc) * 150 together", { together: true, count: 150, pieces: [stitch("sc", 3), stitch("dc")] });
    parse_test(parser, "sc3#red", { marking: "red", count: 3, name: "sc" });
});

test("stitch counts", () => {
    const { ItemList } = make_parser();
    const calculate = (text: string) => {
        const row = ItemList.tryParse(text);
        return {
            in: calculateInputStitches(row),
            out: calculateOutputStitches(row)
        };
    };

    expect(calculate("sc")).deep.equal({ in: 1, out: 1 });
    expect(calculate("6sc")).deep.equal({ in: 6, out: 6 });
    expect(calculate("2sc in same")).deep.equal({ in: 1, out: 2 });
    expect(calculate("6x(2 sc in same)")).deep.equal({ in: 6, out: 12 });
    expect(calculate("sc3together")).deep.equal({ in: 3, out: 1 });
    expect(calculate("6x(sc, 2 sc together)")).deep.equal({ in: 18, out: 12 }); // sc consumes 1, 2sc tog consumes 2. Total 3 in, 2 out per repeat. 6 * 3 = 18, 6 * 2 = 12.
    expect(calculate("(sc, dc) together")).deep.equal({ in: 2, out: 1 });
    expect(calculate("3(sc, 2sc in same)")).deep.equal({ in: 6, out: 9 });

    expect(calculate("ch")).deep.equal({ in: 0, out: 1 });
    expect(calculate("5ch")).deep.equal({ in: 0, out: 5 });
    expect(calculate("sk")).deep.equal({ in: 1, out: 0 });
    expect(calculate("3sk")).deep.equal({ in: 3, out: 0 });
    expect(calculate("inc")).deep.equal({ in: 1, out: 2 });
    expect(calculate("dec")).deep.equal({ in: 2, out: 1 });
});

test("marks and complex aliases", () => {
    const { ItemList, Row } = make_parser();

    let res = ItemList.tryParse("sc#red, 2inc, dec#blue");
    expect(res[0].marking).equals("red");
    expect(res[res.length - 1].marking).equals("blue");

    let res2 = Row.tryParse("ch#start, 5ch, join");
    expect(res2.pieces[0].marking).equals("start");
    expect(res2.pieces[0].name).equals("ch");
    expect(res2.pieces[1].name).equals("ch");
    expect(res2.pieces[1].count).equals(5);
    expect(res2.join).equals(true);
    expect(res2.turn).equals(undefined);

    let res3 = ItemList.tryParse("sc#red, dc in red-2, sc in start+1");
    expect(res3[0].marking).equals("red");
    expect(res3[1].in_name).deep.equals({ begin: { base: "red", offset: -2 }, end: undefined });
    expect(res3[2].in_name).deep.equals({ begin: { base: "start", offset: 1 }, end: undefined });
});

test("together", () => {
    //let parser = make_line_parser().Any;
    //expect(parser.parse("tog(sc,2dc)")).deep.equal({ status: true, value: { together: true, pieces: [{ count: 1, name: "sc" }, { count: 2, name: "dc" }] } })

});

test("Location and LocationRange parsing", () => {
    const { Location, LocationRange } = make_parser();

    // Basic locations
    parse_test(Location, "next", { base: "next" });
    parse_test(Location, "start", { base: "start" });
    parse_test(Location, "hook", { base: "hook" });

    // Locations with offset
    parse_test(Location, "start+1", { base: "start", offset: 1 });
    parse_test(Location, "start-2", { base: "start", offset: -2 });

    // Locations with row
    parse_test(Location, "piece[0]", { base: "piece", row: 0 });
    parse_test(Location, "piece[5]+1", { base: "piece", row: 5, offset: 1 });

    // Location ranges
    parse_test(LocationRange, "start", { begin: { base: "start" }, end: undefined });
    parse_test(LocationRange, "start:end", { begin: { base: "start" }, end: { base: "end" } });
    parse_test(LocationRange, "piece[0]+1:piece[0]+5", {
        begin: { base: "piece", row: 0, offset: 1 },
        end: { base: "piece", row: 0, offset: 5 }
    });
});
