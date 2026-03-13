import { expect, test } from "vitest";
import { make_line_parser, STITCH_LIST } from "../parse";
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

test("together", () => {
    //let parser = make_line_parser().Any;
    //expect(parser.parse("tog(sc,2dc)")).deep.equal({ status: true, value: { together: true, pieces: [{ count: 1, name: "sc" }, { count: 2, name: "dc" }] } })

});