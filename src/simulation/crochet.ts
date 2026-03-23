import type { Location, LocationRange, PatternPiece, Row } from "../parse";
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
    pattern: Row[];

    constructor(rows: Row[], options: { autoJoin: boolean, autoTurn: boolean }) {
        this.pattern = rows;
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

            if (autoJoin || this.pattern[i].join) {
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

    private resolve_location(loc: Location): number | undefined {
        const { base, row, offset = 0 } = loc;

        if (base === "next" || base === "same" || base === "same st") {
            return this.prev_row.shift();
        }

        let base_idx: number | undefined;
        if (base === "hook") {
            base_idx = this.stitches.length - 1;
        } else if (row !== undefined) {
            // base is piece name, look up by row
            // For now, we only have one piece, so row_indices refers to that piece
            base_idx = this.row_indices[row];
        } else if (this.markings[base] !== undefined) {
            base_idx = this.markings[base];
        }

        if (base_idx !== undefined) {
            let res = base_idx + offset;
            if (res >= 0 && res < this.stitches.length) return res;
        }

        return undefined;
    }

    private resolve_range(range: LocationRange): { begin?: number, end?: number } {
        return { begin: this.resolve_location(range.begin), end: range.end ? this.resolve_location(range.end) : undefined };
    }

    private addMarking(stitchId: number, piece: PatternPiece) {
        if (piece.marking) {
            if (this.markings[piece.marking] !== undefined) {
                this.stitches[this.markings[piece.marking]].marking = undefined;
            }
            this.markings[piece.marking] = stitchId;
            this.stitches[stitchId].marking = piece.marking;
        }
    }

    public add_crochet(piece: PatternPiece): number[] {
        let next_row: number[] = [];

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
            if (next_row.length > 0) this.addMarking(next_row[next_row.length - 1], piece);
            return next_row;
        }
        if (piece.name === "sk") {
            for (let i = 0; i < piece.count; i++) this.prev_row.shift();
            return next_row;
        }

        let old_prev_row = this.prev_row;
        if (piece.in_name) {
            let { begin, end } = this.resolve_range(piece.in_name);
            if (begin == undefined) this.prev_row = [];
            else if (end == undefined) {
                this.prev_row = Array.from({ length: 20 }).map(_ => begin);
            }
            else {
                this.prev_row = Array.from({ length: end - begin + 1 }).map((_, i) => begin + i);
            }
        }
        if (piece.name) {
            for (let i = 0; i < piece.count; i++) {
                const belowId = this.prev_row.shift();
                this.stitches.push({
                    id: this.stitches.length,
                    name: piece.name,
                    below: (belowId != undefined && belowId != -1) ? [{ id: belowId, dist: STITCH_LENGTHS[piece.name] }] : [],
                    prev: { id: this.stitches.length - 1, dist: 1 },
                });
                next_row.push(this.stitches.length - 1);
            }
        }
        else if (piece.pieces) {
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    next_row.push(...this.add_crochet(piece.pieces[j]));
                }
            }
        }
        if (piece.together) {
            while (next_row.length > 1) {
                this.stitches[next_row[0]].below.push(...this.stitches.pop()!.below);
                next_row.pop();
            }
        }
        if (piece.in_name) {
            this.prev_row = old_prev_row;
        }
        if (next_row.length > 0) {
            this.addMarking(next_row[next_row.length - 1], piece);
        }
        return next_row;
    }
}
