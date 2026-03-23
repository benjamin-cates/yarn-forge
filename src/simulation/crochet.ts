import type { PatternPiece, Row } from "../parse";
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

export class Crochet {
    stitches: SimStitch[] = [];
    prev_row: number[] = Array.from({ length: 1000 }).fill(-1) as number[];
    markings: { [key: string]: number } = {};
    is_reversed: boolean[] = [];
    row_indices: number[] = [];

    constructor(rows: Row[], options: { autoJoin: boolean, autoTurn: boolean }) {
        if (rows.length === 0) return;

        let current_reversed = false;

        for (let row of rows) {
            if (row.pieces.length === 0) continue;
            this.row_indices.push(this.stitches.length);
            this.is_reversed.push(current_reversed);

            let next_row: number[] = [];
            for (let piece of row.pieces) {
                next_row.push(...this.add_crochet(piece));
            }

            if (options.autoTurn || row.turn) {
                this.prev_row = next_row.slice().reverse();
                current_reversed = !current_reversed;
            } else {
                this.prev_row = next_row;
            }

            // Add join: connect last stitch to first stitch in this row (standard crochet behavior)
            if ((options.autoJoin || row.join) && next_row.length > 1) {
                let firstStitch = this.stitches[next_row[0]];
                // Only set prev if it doesn't already have a more specific one (like from a join stitch)
                firstStitch.prev = { id: next_row[next_row.length - 1], dist: 1 };
            }
            else {
                this.stitches[next_row[0]].prev = undefined;
            }
        }
    }

    public placeStitchesAnalytically(autoJoin: boolean) {
        let random = mulberry32(0);
        let z = 0;
        for (let i = 0; i < this.row_indices.length; i++) {
            let start = this.row_indices[i];
            let end = this.row_indices[i + 1] || this.stitches.length;
            let count = end - start;
            if (count === 0) continue;

            let prevCount = i === 0 ? count : this.row_indices[i] - this.row_indices[i - 1];
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
                    this.stitches[j].position = new THREE.Vector3(
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
                let reversed = this.is_reversed[i];
                for (let j = start; j < end; j++) {
                    let step = (j - start);
                    let x = reversed ? (count - 1 - step) : step;
                    this.stitches[j].position = new THREE.Vector3(
                        x + 0.1 * random(),
                        nextZ + 0.1 * random(),
                        0.1 * random(),
                    );
                }
            }
            z = nextZ;
        }
    }

    private resolve_in_name(in_name: string): number | undefined {
        if (in_name === "next") return this.prev_row.shift();
        if (in_name === "same st" || in_name === "same") return this.prev_row.shift();
        if (this.markings[in_name] !== undefined) return this.markings[in_name];

        const match = in_name.match(/^(.+?)\s*([+-])\s*(\d+)$/);
        let result: number | undefined = undefined;
        if (match) {
            const [, name, op, offsetStr] = match;
            const trimmed_name = name.trim();
            const base = trimmed_name === "hook" ? this.stitches.length - 1 : this.markings[trimmed_name];
            if (base !== undefined) {
                const offset = parseInt(offsetStr, 10);
                result = op === "+" ? base + offset : base - offset;
            }
        } else if (in_name === "hook") {
            result = this.stitches.length - 1;
        }

        if (result !== undefined) {
            if (result < 0 || result >= this.stitches.length) return undefined;
            return result;
        }

        // Default to next if unknown
        let below = this.prev_row.shift();
        if (below == -1) return undefined;
        return below;
    }

    public add_crochet(piece: PatternPiece): number[] {
        let next_row: number[] = [];

        const handleMarking = (stitchId: number) => {
            if (piece.marking) {
                if (this.markings[piece.marking] !== undefined) {
                    this.stitches[this.markings[piece.marking]].marking = undefined;
                }
                this.markings[piece.marking] = stitchId;
                this.stitches[stitchId].marking = piece.marking;
            }
        };

        if (piece.name === "ch") {
            for (let i = 0; i < piece.count; i++) {
                this.stitches.push({
                    id: this.stitches.length,
                    name: "ch",
                    below: [],
                    prev: { id: this.stitches.length - 1, dist: 0.8 },
                });
                next_row.push(this.stitches.length - 1);
            }
            if (next_row.length > 0) handleMarking(next_row[next_row.length - 1]);
            return next_row;
        }

        if (piece.name === "sk") {
            for (let i = 0; i < piece.count; i++) {
                this.prev_row.shift();
            }
            return next_row;
        }

        if (piece.name === "join" || piece.name === "turn") {
            let target = piece.in_name ? this.resolve_in_name(piece.in_name) : undefined;
            if (target !== undefined) {
                // Join is a special connection, it doesn't create a new stitch in the physical sense 
                // but connects the current work-in-progress to a previous point.
                // We can represent this by updating the 'prev' of the NEXT stitch or the LAST stitch.
                if (this.stitches.length > 0) {
                    this.stitches[this.stitches.length - 1].prev = { id: target, dist: 0.1 };
                }
            }
            return next_row;
        }

        if (piece.pieces) {
            if (piece.together) {
                // Decrease: one stitch, multiple below
                let stitch = { name: '', id: this.stitches.length, below: [] } as SimStitch;
                stitch.name = piece.name || (piece.pieces[0]?.name ?? 'sc');
                stitch.prev = { id: this.stitches.length - 1, dist: 1 };
                for (let i = 0; i < piece.count; i++) {
                    for (let j = 0; j < piece.pieces.length; j++) {
                        const belowId = this.prev_row.shift();
                        if (belowId == undefined) break;
                        stitch.below.push({ id: belowId, dist: STITCH_LENGTHS[stitch.name] + 0.2 });
                    }
                }
                this.stitches.push(stitch);
                next_row.push(this.stitches.length - 1);
            } else if (piece.in_name) {
                let below = this.resolve_in_name(piece.in_name);
                if (below == undefined) return next_row;
                for (let i = 0; i < piece.count; i++) {
                    for (let j = 0; j < piece.pieces.length; j++) {
                        let sub = piece.pieces[j];
                        this.stitches.push({
                            id: this.stitches.length,
                            name: sub.name || 'sc',
                            below: [{ id: below, dist: STITCH_LENGTHS[sub.name || 'sc'] }],
                            prev: { id: this.stitches.length - 1, dist: 1 },
                        });
                        next_row.push(this.stitches.length - 1);
                    }
                }
            } else {
                for (let i = 0; i < piece.count; i++) {
                    for (let j = 0; j < piece.pieces.length; j++) {
                        next_row.push(...this.add_crochet(piece.pieces[j]));
                    }
                }
            }
        } else if (piece.name) {
            if (piece.together) {
                // Decrease: one stitch, multiple below
                let stitch = { name: piece.name, id: this.stitches.length, below: [] } as SimStitch;
                stitch.prev = { id: this.stitches.length - 1, dist: 1 };
                for (let i = 0; i < piece.count; i++) {
                    const belowId = this.prev_row.shift();
                    if (belowId == undefined || belowId == -1) break;
                    stitch.below.push({ id: belowId, dist: STITCH_LENGTHS[piece.name] + 0.2 });
                }
                this.stitches.push(stitch);
                next_row.push(this.stitches.length - 1);
                handleMarking(this.stitches.length - 1);
            } else if (piece.in_name) {
                let below = this.resolve_in_name(piece.in_name);
                for (let i = 0; i < piece.count; i++) {
                    this.stitches.push({
                        id: this.stitches.length,
                        name: piece.name,
                        below: (below == -1 || below == undefined) ? [] : [{ id: below, dist: STITCH_LENGTHS[piece.name] }],
                        prev: { id: this.stitches.length - 1, dist: 1 },
                    });
                    next_row.push(this.stitches.length - 1);
                    handleMarking(this.stitches.length - 1);
                }
            } else {
                for (let i = 0; i < piece.count; i++) {
                    const belowId = this.prev_row.shift();
                    this.stitches.push({
                        id: this.stitches.length,
                        name: piece.name,
                        below: (belowId != undefined && belowId != -1) ? [{ id: belowId, dist: STITCH_LENGTHS[piece.name] }] : [],
                        prev: { id: this.stitches.length - 1, dist: 1 },
                    });
                    next_row.push(this.stitches.length - 1);
                    handleMarking(this.stitches.length - 1);
                }
            }
        }
        return next_row;
    }
}
