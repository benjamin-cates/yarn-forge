import { expect, test } from "vitest";
import { crochet } from "../simulation/crochet";
import type { RowPiece } from "../parse";

const sc = (count = 1): RowPiece => ({ name: "sc", count });
const ch = (count = 1): RowPiece => ({ name: "ch", count });
const sk = (count = 1): RowPiece => ({ name: "sk", count });

test("crochet basic chain", () => {
    const rounds: RowPiece[][] = [[ch(5)]];
    const [stitches, row_indices, is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(5);
    expect(row_indices).toEqual([0]);
    expect(is_reversed).toEqual([false]);
    stitches.forEach((s, i) => {
        expect(s.name).toBe("ch");
        if (i === 0) {
            expect(s.prev).toBe(undefined);
        } else {
            expect(s.prev?.id).toBe(i - 1);
        }
        expect(s.below.length).toBe(0);
    });
});

test("crochet sc on chain", () => {
    const rounds: RowPiece[][] = [
        [ch(5)],
        [sc(5)]
    ];
    const [stitches, row_indices, is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(10);
    expect(row_indices).toEqual([0, 5]);
    expect(is_reversed).to.deep.equal([false, false]);

    // Check sc stitches (ids 5 to 9)
    for (let i = 5; i < 10; i++) {
        expect(stitches[i].name).toBe("sc");
        expect(stitches[i].below.length).toBe(1);
        expect(stitches[i].below[0].id).toBe(i - 5);
    }
});

test("crochet with autoTurn", () => {
    const rounds: RowPiece[][] = [
        [ch(2)],
        [sc(2)],
        [sc(2)]
    ];
    const [stitches, row_indices, is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: true });

    expect(is_reversed).toEqual([false, true, false]);
    expect(row_indices).to.deep.equal([0, 2, 4]);

    expect(stitches[2].below[0].id).toBe(1);
    expect(stitches[3].below[0].id).toBe(0);

    expect(stitches[4].below[0].id).toBe(3);
    expect(stitches[5].below[0].id).toBe(2);
});

test("crochet with marking and resolve_in_name", () => {
    const rounds: RowPiece[][] = [
        [{ name: "ch", count: 1, marking: "start" }, ch(2)],
        [{ name: "sc", count: 1, in_name: "start" }]
    ];
    const [stitches, _row_indices, _is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches[0].marking).toBe("start");
    expect(stitches[3].name).toBe("sc");
    expect(stitches[3].below[0].id).toBe(0); // Should be connected to the marked stitch
});

test("crochet increase (2 sc in same st)", () => {
    const rounds: RowPiece[][] = [
        [ch(1)],
        [{ name: "sc", count: 2, in_name: "next" }]
    ];
    // "next" resolve_in_name will shift from prev_row
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(3); // 1 ch + 2 sc
    expect(stitches[1].below[0].id).toBe(0);
    expect(stitches[2].below[0].id).toBe(0);
});

test("crochet decrease (sc2together)", () => {
    const roundsDecrease: RowPiece[][] = [
        [ch(2)],
        [{ name: "sc", count: 2, together: true }]
    ];

    const [stitches] = crochet(roundsDecrease, { autoJoin: false, autoTurn: false });
    expect(stitches.length).toBe(3); // 2 ch + 1 sc
    expect(stitches[2].below.length).toBe(2);
    expect(stitches[2].below[0].id).toBe(0);
    expect(stitches[2].below[1].id).toBe(1);
});

test("crochet skip", () => {
    const rounds: RowPiece[][] = [
        [ch(3)],
        [sc(1), sk(1), sc(1)]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(5); // 3 ch + 2 sc
    expect(stitches[3].below[0].id).toBe(0);
    expect(stitches[4].below[0].id).toBe(2); // Skipped index 1
});

test("robustness: empty rounds", () => {
    const [stitches, row_indices, is_reversed] = crochet([], { autoJoin: false, autoTurn: false });
    expect(stitches).toEqual([]);
    expect(row_indices).toEqual([]);
    expect(is_reversed).toEqual([]);
});

test("robustness: empty round within rounds", () => {
    const rounds: RowPiece[][] = [[ch(2)], [], [sc(2)]];
    const [stitches, row_indices, _is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: false });
    expect(row_indices.length).toBe(2); // The empty round is skipped in row_indices
    expect(stitches.length).toBe(4);
});

test("robustness: referencing non-existent markings", () => {
    const rounds: RowPiece[][] = [
        [ch(2)],
        [{ name: "sc", count: 1, in_name: "non-existent" }]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });
    expect(stitches[2].below[0].id).toBe(0);
});

test("robustness: consuming more than available in prev_row", () => {
    const rounds: RowPiece[][] = [
        [ch(1)],
        [sc(5)]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });
    expect(stitches.length).toBe(6);
    expect(stitches[1].below[0].id).toBe(0);
    for (let i = 2; i < 6; i++) {
        expect(stitches[i].below.length).toBe(0);
    }
});

test("integrity: ids within bounds", () => {
    const rounds: RowPiece[][] = [
        [ch(10)],
        [sc(5), { name: "sc", count: 2, together: true }, sk(1), sc(2)],
        [{ name: "sc", count: 1, in_name: "non-existent" }, sc(10)]
    ];
    const [stitches] = crochet(rounds, { autoJoin: true, autoTurn: true });

    stitches.forEach((s) => {
        if (s.prev) {
            expect(s.prev.id).toBeLessThan(stitches.length);
            expect(s.prev.id).toBeGreaterThanOrEqual(-1);
        }
        s.below.forEach((b) => {
            expect(b.id).toBeLessThan(stitches.length);
            expect(b.id).toBeGreaterThanOrEqual(0);
        });
    });
});

test("integrity: id field matches index", () => {
    const rounds: RowPiece[][] = [
        [ch(5)],
        [sc(5)]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });
    stitches.forEach((s, i) => {
        expect(s.id).toBe(i);
    });
});

test("Just inc", () => {
    const rounds = [[{ name: "sc", count: 2, in_name: "same" }]];

    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    console.log(stitches);
});
test("Just inc", () => {
    const rounds = [[sc(8)]];

    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    console.log(stitches);
});