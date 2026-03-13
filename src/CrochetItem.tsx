import { Physics, useDistanceConstraint, useParticle, useSphere, useSpring, type PublicApi, type SpringOptns } from "@react-three/cannon";
import React from "react";
import { createRef, useEffect, useMemo, useRef, type Ref, type RefObject } from "react";
import * as THREE from "three";
import type { RowPiece } from "./parse";
import { useFrame } from "@react-three/fiber";

interface SimStitch {
    id: number,
    name: string,
    below: { id: number, dist: number }[],
    prev?: { id: number, dist: number },
    position?: THREE.Vector3,
}

const STITCH_LENGTHS: { [key: string]: number } = {
    sc: 1,
    dc: 2,
    hdc: 1.5,
    htc: 2.5,
    tc: 3,
    ch: 1,
};

const continuous_rounds_crochet = (mr_size: number, rounds: RowPiece[][]): [SimStitch[], number[]] => {
    let stitches: SimStitch[] = [];
    // Magic ring of 6
    stitches.push({ id: 0, name: "mr", prev: { id: mr_size - 1, dist: 1 }, below: [] });
    for (let i = 0; i < mr_size - 1; i++) {
        stitches.push({ id: i + 1, name: "mr", prev: { id: i, dist: 1 }, below: [] });
    }
    let row = Array.from({ length: mr_size }).fill(0).map((_, i) => i);
    let row_indices = [0];
    let markings: { [key: string]: number } = {};
    for (let round of rounds) {
        row_indices.push(stitches.length);
        let next_row = [];
        for (let piece of round) {
            let last = stitches.length;
            next_row.push(...add_crochet(piece, stitches, row, markings));
            //stitches[last].prev = undefined;
        }
        row = next_row;
    }
    return [stitches, row_indices];
};

const add_crochet = (piece: RowPiece, stitches: SimStitch[], prev_row: number[], markings: { [key: string]: number }): number[] => {
    let next_row: number[] = [];
    if (piece.marking) {
        markings[piece.marking] = stitches.length;
    }
    if (piece.pieces) {
        if (piece.together) {
            console.log("Oops!!!");
        }
        else if (piece.in_name?.includes("same")) {
            console.log("Oops!!!");
        }
        else {
            for (let i = 0; i < piece.count; i++) {
                for (let j = 0; j < piece.pieces.length; j++) {
                    next_row.push(...add_crochet(piece.pieces[j], stitches, prev_row, markings));
                }
            }
        }
    }
    else if (piece.name) {
        if (piece.together) {
            let stitch = { name: piece.name, id: stitches.length, below: [] } satisfies SimStitch as SimStitch;
            stitch.prev = { id: stitches.length - 1, dist: 1 };
            for (let i = 0; i < piece.count; i++) {
                stitch.below.push({ id: prev_row.shift()!, dist: STITCH_LENGTHS[piece.name] });
            }
            stitches.push(stitch);
            next_row.push(stitches.length - 1);
        }
        else if (piece.in_name?.includes("same")) {
            let below = prev_row.shift()!;
            for (let i = 0; i < piece.count; i++) {
                stitches.push({ id: stitches.length, name: piece.name, below: [{ id: below, dist: STITCH_LENGTHS[piece.name] }], prev: { id: stitches.length - 1, dist: 1 } });
                next_row.push(stitches.length - 1);
            }
        }
        else {
            for (let i = 0; i < piece.count; i++) {
                stitches.push({ id: stitches.length, name: piece.name, below: [{ id: prev_row.shift()!, dist: STITCH_LENGTHS[piece.name] }], prev: { id: stitches.length - 1, dist: 1 } });
                next_row.push(stitches.length - 1);
            }
        }
    }
    return next_row;
};

interface StitchProps {
    id: number;
    stitches: SimStitch[];
    position: number[];
    refs: [RefObject<THREE.Mesh | null>, PublicApi][];
}

const Spring: React.FC<{ refs: [RefObject<THREE.Mesh | null>, PublicApi][], id1: number, id2: number } & SpringOptns> = (props) => {
    useEffect(() => {
        console.log(props.id1, props.id2);
    });
    useSpring(props.refs[props.id1][0], props.refs[props.id2][0], {
        restLength: props.restLength,
        damping: props.damping || 0.5,
        stiffness: props.stiffness || 50,
    });
    return <></>;
};

const StitchComp: React.FC<StitchProps> = (props: StitchProps) => {
    const below = useRef(null as any);
    const prev = useRef(null as any);
    let stitch = props.stitches[props.id];
    const [, api] = useSphere(() => ({
        mass: stitch.name == "mr" ? 0 : 1,
        args: [0.1],
        position: props.position as [number, number, number],

    }), props.refs[props.id][0]);
    props.refs[props.id][1] = api;

    //useFrame(() => {
    //if (prev.current && stitch.prev) {
    //    prev.current.setFromPoints([props.refs[props.id].current!.position, props.refs[stitch.prev.id].current!.position]);
    //}
    //    if (below.current && stitch.below[0]) {
    //        let p1 = new THREE.Vector3(0, 0, 0);
    //        console.log(props.refs[props.id][1].position);
    //        let p2 = new THREE.Vector3(0, 0, 0);
    //        const attr = below.current.geometry.attributes.position;
    //        attr.array[0] = p1.x;
    //        attr.array[1] = p1.y;
    //        attr.array[2] = p1.z;
    //        attr.array[3] = p2.x;
    //        attr.array[4] = p2.y;
    //        attr.array[5] = p2.z;
    //        attr.needsUpdate = true;
    //        if (stitch.id == 7 && Math.random() < 0.1) console.log(attr.array)
    //        below.current.geometry.computeBoundingSphere();
    //    }
    //});
    const lineArray = useMemo(() => new Float32Array(6), [])

    return <>
        {stitch.below.map(({ id, dist }) => {
            return <React.Fragment key={id}>
                <Spring refs={props.refs} id1={stitch.id} id2={id} restLength={dist}></Spring>
                {props.stitches[id].below.map(({ id: id2, dist: dist2 }) => (
                    <Spring key={id2} refs={props.refs} id1={stitch.id} id2={id2} restLength={dist + dist2}></Spring>)
                )}
            </React.Fragment>;
        })}
        {stitch.prev && <Spring refs={props.refs} id1={stitch.id} id2={stitch.prev.id} restLength={stitch.prev.dist}></Spring>}
        {stitch.prev && props.stitches[stitch.prev.id].prev &&
            <Spring refs={props.refs} id1={stitch.id} id2={props.stitches[stitch.prev.id].prev!.id} restLength={stitch.prev.dist + props.stitches[stitch.prev.id].prev!.dist}></Spring>
        }
        {stitch.below[0] && <line ref={below}>
            <bufferGeometry>
                <bufferAttribute
                    args={[lineArray, 3]}
                    attach="attributes-position"
                    count={2}
                    usage={THREE.DynamicDrawUsage}
                />
            </bufferGeometry>
            <lineBasicMaterial color="white" />
        </line>}
        {/*{stitch.below[0] && <Line points={points} ref={below} lineWidth={3} color={'#ffffff'} />}*/}
        <mesh ref={props.refs[props.id][0]}>
            <sphereGeometry args={[0.1]}></sphereGeometry>
            <meshStandardMaterial color="white"></meshStandardMaterial>
        </mesh>
    </>;
};

interface Spring {
    bodyA: number,
    bodyB: number,
    len: number,
    stiffness: number,
}
const make_springs = (stitches: SimStitch[]): Spring[] => {
    let out: Spring[] = [];
    stitches.forEach((stitch, id) => {
        for (let { id: below_id, dist } of stitch.below) {
            out.push({ bodyA: id, bodyB: below_id, len: dist, stiffness: 1 })
            stitches[below_id].below.forEach(({ id: below_below_id, dist: dist2 }) => {
                if (id != below_below_id)
                    out.push({ bodyA: id, bodyB: below_below_id, len: dist + dist2, stiffness: 1 })
            });
        }
        if (stitch.prev) {
            out.push({ bodyA: id, bodyB: stitch.prev.id, len: stitch.prev.dist, stiffness: 1 });
            let prev = stitches[stitch.prev.id];
            if (prev.prev) {
                out.push({ bodyA: id, bodyB: prev.prev.id, len: stitch.prev.dist + prev.prev.dist, stiffness: 1 });
            }
        }
    })
    return out;
}

const CrochetItem: React.FC = () => {
    const [refs, stitches] = useMemo(() => {
        const [stitches, row_ids] = continuous_rounds_crochet(7, [
            [{ count: 7, pieces: [{ count: 2, in_name: "same st", name: "sc" }] }],
            [{ count: 7, pieces: [{ count: 1, name: "sc" }, { count: 2, in_name: "same st", name: "sc" }] }],
            //[{ count: 6, pieces: [{ count: 2, together: true, name: "sc" }, { count: 1, name: "sc" }] }]
        ]);
        console.log(stitches, row_ids);
        let refs = Array.from({ length: stitches.length }, () => [createRef<THREE.Mesh>(), null! as any] as [React.RefObject<THREE.Mesh>, any]);
        for (let i = 0; i < row_ids.length; i++) {
            let circumference = (row_ids[i + 1] || stitches.length) - row_ids[i];
            let radius = circumference / 2 / Math.PI;
            console.log(circumference, radius);
            for (let j = row_ids[i]; j < (row_ids[i + 1] || stitches.length); j++) {
                let ang = 2 * Math.PI * (j - row_ids[i]) / circumference;
                console.log(radius, ang);
                stitches[j].position = new THREE.Vector3(radius * Math.sin(ang), radius * Math.cos(ang), i);
            }
        }
        return [refs, stitches];
    }, []);

    const springs = useMemo(() => make_springs(stitches), []);

    useFrame(() => {
        let forces = new Array(stitches.length).fill(0).map(() => new THREE.Vector3(0, 0, 0));
        springs.forEach((spring) => {

            let r = stitches[spring.bodyA].position!.clone().sub(stitches[spring.bodyB].position!);
            let len = r.length();
            if (len == 0) return;
            let delta = r.length() - spring.len;
            let force = Math.max(-1, Math.min(1, (delta * spring.stiffness)));
            forces[spring.bodyA].add(r.clone().multiplyScalar(-force / len));
            forces[spring.bodyB].add(r.clone().multiplyScalar(force / len));
        });
        stitches.forEach((stitch, idx) => {
            if (stitch.name != "mr")
                stitch.position = stitch.position!.add(forces[idx].multiplyScalar(0.1));
            refs[idx][0].current.position.copy(stitch.position!);
        });
    })

    return <>
        {stitches.map((stitch, id) => {
            return <mesh key={id} ref={refs[id][0]} position={stitch.position!}>
                <sphereGeometry args={[0.1]}></sphereGeometry>
                <meshStandardMaterial color="white"></meshStandardMaterial>
            </mesh>

        })}
    </>;
}

export { CrochetItem };