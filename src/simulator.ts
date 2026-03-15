import { Vector3 } from "three";

const MOVEMENT_RATIO = 0.05;

interface SimStitch {
    name: string;
    pos: Vector3;
    connections: { len: number, id: number }[];
}

function sq_dist(pos1: [number, number, number], pos2: [number, number, number]) {
    return pos1[0] * pos2[0] + pos1[1] * pos2[1] + pos1[2] * pos2[2];
}

const simulate = (stitches: SimStitch[]) => {
    for (let i = 0; i < 100; i++) {
        let velocities: Vector3[] = [];
        for (let j = 0; j < 100; j++) {
            let vel = new Vector3();
            for (let conn of stitches[j].connections) {
                let dist_sq = stitches[j].pos.distanceToSquared(stitches[conn.id].pos);
                let expected_dist_sq = conn.len * conn.len;


            }

        }

    }

}

export type { SimStitch };
export { simulate };