import { expect, test } from "vitest";
import { Crochet } from "../simulation/crochet";
import { parseRows, type PatternPiece, type Row } from "../parse";

const crochet = (rounds: PatternPiece[][], options: { autoJoin: boolean, autoTurn: boolean }) => {
    const rows: Row[] = rounds.map(r => ({ pieces: r }));
    const c = new Crochet(rows, options);
    return [c.stitches, c.row_indices, c.is_reversed] as const;
};

const sc = (count = 1): PatternPiece => ({ name: "sc", count });
const ch = (count = 1): PatternPiece => ({ name: "ch", count });
const sk = (count = 1): PatternPiece => ({ name: "sk", count });

test("crochet basic chain", () => {
    const rounds: PatternPiece[][] = [[ch(5)]];
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
    const rounds: PatternPiece[][] = [
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
    const rounds: PatternPiece[][] = [
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
    const rounds: PatternPiece[][] = [
        [{ name: "ch", count: 1, marking: "start" }, ch(2)],
        [{ name: "sc", count: 1, in_name: { begin: { base: "start" } } }]
    ];
    const [stitches, _row_indices, _is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches[0].marking).toBe("start");
    expect(stitches[3].name).toBe("sc");
    expect(stitches[3].below[0].id).toBe(0); // Should be connected to the marked stitch
});

test("crochet with calculated marking offsets", () => {
    const rounds: PatternPiece[][] = [
        [{ name: "ch", count: 1, marking: "red" }, ch(4)],
        [
            { name: "sc", count: 1, in_name: { begin: { base: "red", offset: 1 } } },
            { name: "sc", count: 1, in_name: { begin: { base: "red", offset: 2 } } },
            { name: "sc", count: 1, in_name: { begin: { base: "red", offset: -1 } } }
        ]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches[0].marking).toBe("red");
    // red is index 0
    // red+1 should be index 1
    // red+2 should be index 2
    // red-1 should be index -1 (which becomes undefined/empty below in current logic)

    expect(stitches[5].below[0].id).toBe(1);
    expect(stitches[6].below[0].id).toBe(2);
    expect(stitches[7].below.length).toBe(0);
});

test("crochet with hook marker", () => {
    const rounds: PatternPiece[][] = [
        [ch(5)],
        [
            { name: "sc", count: 1, in_name: { begin: { base: "hook", offset: -1 } } },
            { name: "sc", count: 1, in_name: { begin: { base: "hook" } } }
        ]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    // Stitches 0-4 are ch
    // Stitch 5 is sc in hook-1. 
    // At the time stitch 5 is being added, total_stitches is 5.
    // hook is total_stitches - 1 = 4.
    // hook-1 is 3.
    expect(stitches[5].below[0].id).toBe(3);

    // Stitch 6 is sc in hook.
    // At the time stitch 6 is being added, total_stitches is 6.
    // hook is 5.
    expect(stitches[6].below[0].id).toBe(5);
});

test("crochet resolve_in_name bounds checking", () => {
    const rounds: PatternPiece[][] = [
        [ch(2)],
        [{ name: "sc", count: 1, in_name: { begin: { base: "hook", offset: 1 } } }]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    // Stitch 2 is sc in hook+1.
    // At the time, total_stitches is 2. hook is 1. hook+1 is 2.
    // 2 is not < total_stitches (which is 2). Should return undefined.
    expect(stitches[2].below.length).toBe(0);
});

test("crochet increase (2 sc in same)", () => {
    const rounds: PatternPiece[][] = [
        [ch(1)],
        [{ name: "sc", count: 2, in_name: { begin: { base: "next" } } }]
    ];
    // "next" resolve_in_name will shift from prev_row
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(3); // 1 ch + 2 sc
    expect(stitches[1].below[0].id).toBe(0);
    expect(stitches[2].below[0].id).toBe(0);
});

test("crochet decrease (sc2together)", () => {
    const roundsDecrease: PatternPiece[][] = [
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
    const rounds: PatternPiece[][] = [
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
    const rounds: PatternPiece[][] = [[ch(2)], [], [sc(2)]];
    const [stitches, row_indices, _is_reversed] = crochet(rounds, { autoJoin: false, autoTurn: false });
    expect(row_indices.length).toBe(2); // The empty round is skipped in row_indices
    expect(stitches.length).toBe(4);
});

test("robustness: referencing non-existent markings", () => {
    const rounds: PatternPiece[][] = [
        [ch(2)],
        [{ name: "sc", count: 1, in_name: { begin: { base: "non-existent" } } }]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });
    expect(stitches[2].below.length).toBe(0);
});

test("robustness: consuming more than available in prev_row", () => {
    const rounds: PatternPiece[][] = [
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
    const rounds: PatternPiece[][] = [
        [ch(10)],
        [sc(5), { name: "sc", count: 2, together: true }, sk(1), sc(2)],
        [{ name: "sc", count: 1, in_name: { begin: { base: "non-existent" } } }, sc(10)]
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
    const rounds: PatternPiece[][] = [
        [ch(5)],
        [sc(5)]
    ];
    const [stitches] = crochet(rounds, { autoJoin: false, autoTurn: false });
    stitches.forEach((s, i) => {
        expect(s.id).toBe(i);
    });
});

test("crochet from string: 3sc\\n(sc, (sc, sc)) together", () => {
    const { rows } = parseRows("3sc\n(sc, (sc, sc)) together");
    const [stitches, row_indices] = crochet(rows.map(r => r.pieces), { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(4);
    expect(row_indices).toEqual([0, 3]);

    const togStitch = stitches[3];
    expect(togStitch.name).toBe("sc");
    // (sc, (sc, sc)) consumes 3 stitches because sc consumes 1, and (sc, sc) consumes 2.
    expect(togStitch.below.length).toBe(3);
    expect(togStitch.below.map(s => s.id)).toEqual([0, 2, 1]);
});

test("crochet from string: sc, sc#red, 3sc\\n2sc in red:red+1", () => {
    const { rows } = parseRows("sc, sc#red, 3sc\n2sc in red:red+1");
    const [stitches] = crochet(rows.map(r => r.pieces), { autoJoin: false, autoTurn: false });

    expect(stitches[1].marking).toBe("red");

    expect(stitches[5].name).toBe("sc");
    expect(stitches[5].below.map(s => s.id)).toEqual([1]);

    expect(stitches[6].name).toBe("sc");
    expect(stitches[6].below.map(s => s.id)).toEqual([2]);
});

test("crochet complex together and in", () => {
    const { rows } = parseRows("5sc\n(2sc in next, sc) together");
    const [stitches] = crochet(rows.map(r => r.pieces), { autoJoin: false, autoTurn: false });

    expect(stitches.length).toBe(6); // 5 + 1
    const tog = stitches[5];
    expect(tog.below.length).toBe(3);
    expect(tog.below.map(s => s.id)).toEqual([0, 1, 0]);
});
