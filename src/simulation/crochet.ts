import type { RowPiece } from "../parse";
import { mulberry32 } from "../util";
import type { SimStitch } from "./phys";
import * as THREE from "three";

const STITCH_LENGTHS: { [key: string]: number } = {
    sc: 1,
    dc: 2,
    hdc: 1.5,
    htc: 2.5,
    tc: 3,
    ch: 0.8,
    sk: 0,
    join: 0,
};

export const crochet = (rounds: RowPiece[][], options: { autoJoin: boolean, autoTurn: boolean }): [SimStitch[], number[], boolean[]] => {
    let stitches: SimStitch[] = [];

    if (rounds.length === 0) return [[], [], []];

    let row = Array.from({ length: 1000 }).fill(-1) as number[];
    let row_indices = [];
    let markings: { [key: string]: number } = {};
    let is_reversed: boolean[] = [];

    let current_reversed = false;

    for (let round of rounds) {
        if (round.length === 0) continue;
        row_indices.push(stitches.length);
        is_reversed.push(current_reversed);

        let next_row = [];
        for (let piece of round) {
            next_row.push(...add_crochet(piece, stitches, row, markings));
        }

        const containsTurn = round.some(p => p.name === "turn");
        if (options.autoTurn || containsTurn) {
            row = next_row.slice().reverse();
            current_reversed = !current_reversed;
        } else {
            row = next_row;
        }

        // Add join: connect last stitch to first stitch in this row (standard crochet behavior)
        if (options.autoJoin && next_row.length > 1) {
            let firstStitch = stitches[next_row[0]];
            // Only set prev if it doesn't already have a more specific one (like from a join stitch)
            firstStitch.prev = { id: next_row[next_row.length - 1], dist: 1 };
        }
        else {
            stitches[next_row[0]].prev = undefined;
        }
    }
    return [stitches, row_indices, is_reversed];
};

export function placeStitchesAnalytically(stitches: SimStitch[], row_ids: number[], is_reversed: boolean[], autoJoin: boolean) {
    let random = mulberry32(0);
    let z = 0;
    for (let i = 0; i < row_ids.length; i++) {
        let start = row_ids[i];
        let end = row_ids[i + 1] || stitches.length;
        let count = end - start;
        if (count === 0) continue;

        let prevCount = i === 0 ? count : row_ids[i] - row_ids[i - 1];
        let nextZ = z;

        if (autoJoin) {
            if (i > 0) {
                let dz = Math.abs(count - prevCount) / 6;
                nextZ = z + Math.max(0, Math.min(1, 1 - dz)) + 0.1;
            }
            // Circular placement
            let radius = count / (2 * Math.PI);
            for (let j = start; j < end; j++) {
                let ang = (2 * Math.PI * (j - start)) / count;
                stitches[j].position = new THREE.Vector3(
                    radius * Math.sin(ang) + 0.1 * random(),
                    nextZ + 0.1 * random(),
                    radius * Math.cos(ang) + 0.1 * random(),
                );
            }
        } else {
            if (i > 0) {
                nextZ = z + 1;
            }
            // Flat placement
            // If the row is reversed, we should place it from right to left (or vice versa)
            // to maintain continuity with the previous row's end.
            let reversed = is_reversed[i];
            console.log("row " + i + " " + reversed, start, end);
            for (let j = start; j < end; j++) {
                let step = (j - start);
                let x = reversed ? (count - 1 - step) : step;
                stitches[j].position = new THREE.Vector3(
                    x + 0.1 * random(),
                    nextZ + 0.1 * random(),
                    0.1 * random(),
                );
            }
        }
        z = nextZ;
    }
}
const resolve_in_name = (in_name: string, prev_row: number[], markings: { [key: string]: number }): number | undefined => {
    if (in_name === "next") return prev_row.shift();
    if (in_name === "same st" || in_name === "same") return prev_row.shift();
    if (markings[in_name] !== undefined) return markings[in_name];
    if (in_name.includes("+")) {
        const [name, offset] = in_name.split("+");
        if (markings[name.trim()] !== undefined) {
            return markings[name.trim()] + parseInt(offset);
        }
    }
    // Default to next if unknown
    let below = prev_row.shift();
    if (below == -1) return undefined;
    return below
};

const add_crochet = (piece: RowPiece, stitches: SimStitch[], prev_row: number[], markings: { [key: string]: number }): number[] => {
    let next_row: number[] = [];

    const handleMarking = (stitchId: number) => {
        if (piece.marking) {
            if (markings[piece.marking] !== undefined) {
                stitches[markings[piece.marking]].marking = undefined;
            }
            markings[piece.marking] = stitchId;
            stitches[stitchId].marking = piece.marking;
        }
    };

    if (piece.name === "ch") {
        for (let i = 0; i < piece.count; i++) {
            stitches.push({
                id: stitches.length,
                name: "ch",
                below: [],
                prev: { id: stitches.length - 1, dist: 0.8 },
            });
            next_row.push(stitches.length - 1);
        }
        if (next_row.length > 0) handleMarking(next_row[next_row.length - 1]);
        return next_row;
    }

    if (piece.name === "sk") {
        for (let i = 0; i < piece.count; i++) {
            prev_row.shift();
        }
        return next_row;
    }

    if (piece.name === "join" || piece.name === "turn") {
        let target = piece.in_name ? resolve_in_name(piece.in_name, prev_row, markings) : undefined;
        if (target !== undefined) {
            // Join is a special connection, it doesn't create a new stitch in the physical sense 
            // but connects the current work-in-progress to a previous point.
            // We can represent this by updating the 'prev' of the NEXT stitch or the LAST stitch.
            if (stitches.length > 0) {
                stitches[stitches.length - 1].prev = { id: target, dist: 0.1 };
            }
        }
        return next_row;
    }

    if (piece.pieces) {
        if (piece.together) {
            // Decrease: one stitch, multiple below
            let stitch = { name: '', id: stitches.length, below: [] } as SimStitch;
            stitch.name = piece.name || (piece.pieces[0]?.name ?? 'sc');
            stitch.prev = { id: stitches.length - 1, dist: 1 };
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    const belowId = prev_row.shift();
                    if (belowId == undefined) break;
                    stitch.below.push({ id: belowId, dist: STITCH_LENGTHS[stitch.name] + 0.2 });
                }
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
        } else if (piece.in_name) {
            let below = resolve_in_name(piece.in_name, prev_row, markings);
            if (below == undefined) return next_row;
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    let sub = piece.pieces[j];
                    stitches.push({
                        id: stitches.length,
                        name: sub.name || 'sc',
                        below: [{ id: below, dist: STITCH_LENGTHS[sub.name || 'sc'] }],
                        prev: { id: stitches.length - 1, dist: 1 },
                    });
                    next_row.push(stitches.length - 1);
                }
            }
        } else {
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    next_row.push(...add_crochet(piece.pieces[j], stitches, prev_row, markings));
                }
            }
        }
    } else if (piece.name) {
        if (piece.together) {
            // Decrease: one stitch, multiple below
            let stitch = { name: piece.name, id: stitches.length, below: [] } as SimStitch;
            stitch.prev = { id: stitches.length - 1, dist: 1 };
            for (let i = 0; i < piece.count; i++) {
                const belowId = prev_row.shift();
                if (belowId == undefined || belowId == -1) break;
                stitch.below.push({ id: belowId, dist: STITCH_LENGTHS[piece.name] + 0.2 });
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
            handleMarking(stitches.length - 1);
        } else if (piece.in_name) {
            let below = resolve_in_name(piece.in_name, prev_row, markings);
            for (let i = 0; i < piece.count; i++) {
                stitches.push({
                    id: stitches.length,
                    name: piece.name,
                    below: (below == -1 || below == undefined) ? [] : [{ id: below, dist: STITCH_LENGTHS[piece.name] }],
                    prev: { id: stitches.length - 1, dist: 1 },
                });
                next_row.push(stitches.length - 1);
                handleMarking(stitches.length - 1);
            }
        } else {
            for (let i = 0; i < piece.count; i++) {
                const belowId = prev_row.shift();
                console.log(belowId);
                stitches.push({
                    id: stitches.length,
                    name: piece.name,
                    below: (belowId != undefined && belowId != -1) ? [{ id: belowId, dist: STITCH_LENGTHS[piece.name] }] : [],
                    prev: { id: stitches.length - 1, dist: 1 },
                });
                next_row.push(stitches.length - 1);
                handleMarking(stitches.length - 1);
            }
        }
    }
    return next_row;
};