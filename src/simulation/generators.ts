const compressPattern = (parts: string[]) => {
    if (parts.length === 0) return "";

    // Find if the whole array consists of a repeating block
    for (let len = 1; len <= parts.length / 2; len++) {
        if (parts.length % len === 0) {
            const block = parts.slice(0, len);
            let match = true;
            for (let i = len; i < parts.length; i += len) {
                for (let j = 0; j < len; j++) {
                    if (parts[i + j] !== block[j]) {
                        match = false;
                        break;
                    }
                }
                if (!match) break;
            }
            if (match) {
                const count = parts.length / len;
                const blockStr = block.join(", ");
                if (count > 1) {
                    return `${count}x(${blockStr})`;
                }
            }
        }
    }
    return parts.join(", ");
};

const rotateArray = <T>(arr: T[], offset: number) => {
    if (arr.length === 0) return arr;
    const o = ((offset % arr.length) + arr.length) % arr.length;
    return [...arr.slice(o), ...arr.slice(0, o)];
};

const combineStitches = (stitches: string[]) => {
    if (stitches.length === 0) return [];
    const combined: string[] = [];
    let currentStitch = stitches[0];
    let count = 1;

    for (let i = 1; i <= stitches.length; i++) {
        if (i < stitches.length && stitches[i] === currentStitch) {
            count++;
        } else {
            if (currentStitch === "sc") {
                combined.push(count === 1 ? "sc" : `${count}sc`);
            } else {
                if (count === 1) {
                    combined.push(currentStitch);
                } else {
                    combined.push(`${count}${currentStitch}`);
                }
            }
            if (i < stitches.length) {
                currentStitch = stitches[i];
                count = 1;
            }
        }
    }
    return combined;
};

export const generateSpherePattern = (numRows: number): string => {
    const maxStitches = Math.floor(numRows * 2);
    if (numRows > 100) {
        return "Error: Maximum number of rows is 100 (performance limit).";
    }
    if (numRows <= 0 || maxStitches <= 0) {
        return "Error: Please enter positive values.";
    }

    let pattern = "";
    let prevStitches = 0;

    for (let i = 1; i <= numRows; i++) {
        const currentStitches = Math.round(Math.sin((i * (180 / (numRows + 1))) * (Math.PI / 180)) * maxStitches);

        if (i === 1) {
            pattern += `${currentStitches}sc\n`;
        } else {
            const diff = currentStitches - prevStitches;
            if (diff === 0) {
                pattern += `${currentStitches}sc\n`;
            } else if (diff > 0) {
                // Spread 'diff' increases across 'prevStitches' base stitches
                let stitches = [];
                for (let j = 0; j < diff; j++) {
                    const count = Math.floor((j + 1) * prevStitches / diff) - Math.floor(j * prevStitches / diff);
                    for (let k = 0; k < count - 1; k++) {
                        stitches.push("sc");
                    }
                    stitches.push("inc");
                }

                const offset = Math.floor(i * 13);
                const rotated = rotateArray(stitches, offset);
                const combined = combineStitches(rotated);
                pattern += compressPattern(combined) + "\n";
            } else {
                // Spread 'abs(diff)' decreases across 'prevStitches' base stitches
                const numDec = Math.abs(diff);
                let stitches = [];
                for (let j = 0; j < numDec; j++) {
                    const count = Math.floor((j + 1) * prevStitches / numDec) - Math.floor(j * prevStitches / numDec);
                    for (let k = 0; k < count - 2; k++) {
                        stitches.push("sc");
                    }
                    stitches.push("dec");
                }

                const offset = Math.floor(i * 17);
                const rotated = rotateArray(stitches, offset);
                const combined = combineStitches(rotated);
                pattern += compressPattern(combined) + "\n";
            }
        }
        prevStitches = currentStitches;
    }

    return pattern.trim();
};

export const generateCirclePattern = (radius: number, mr_size: number, stitch_type: "sc" | "hdc" | "dc" | "tc"): string => {
    if (radius > 100) {
        return "Error: Maximum radius is 100 (performance limit).";
    }
    if (mr_size > 16) {
        return "Error: Maximum magic ring size is 16 (performance limit)";
    }
    if (radius <= 0 || mr_size <= 0) {
        return "Error: Please enter positive values.";
    }
    const inc = stitch_type == "sc" ? "inc" : ("(2 " + stitch_type + " in next)");
    let output = mr_size + " " + stitch_type;
    if (radius == 1) return output;
    output += "\n" + mr_size + (stitch_type == "sc" ? " " : "x") + inc;
    if (radius == 2) return output;
    output += "\n" + mr_size + "x(" + stitch_type + ", " + inc + ")";
    for (let r = 3; r < radius; r++) {
        output += "\n" + mr_size + "x(" + (r - 1) + " " + stitch_type + ", " + inc + ")";
    }
    return output;
};

export const generateConePattern = (radius: number, interior_angle: number, stitch_type: "sc" | "hdc" | "dc" | "tc"): string => {
    if (radius > 100) {
        return "Error: Maximum radius is 100 (performance limit).";
    }
    if (interior_angle > 90 || interior_angle <= 5) {
        return "Error: Interior angle must be between 5 and 90 degrees";
    }
    if (radius <= 0) {
        return "Error: Please enter positive values.";
    }

    const circumference_over_radius = 2 * Math.PI * Math.sin(interior_angle * (Math.PI / 180));
    const inc = stitch_type === "sc" ? "inc" : `(2 ${stitch_type} in next)`;

    let pattern = "";
    let prevStitches = Math.round(circumference_over_radius);

    for (let i = 1; i <= radius; i++) {
        const currentStitches = Math.max(1, Math.min(2 * prevStitches, Math.round(i * circumference_over_radius)));

        if (i === 1) {
            pattern += `${currentStitches}${stitch_type}\n`;
        } else {
            const diff = currentStitches - prevStitches;
            if (diff === 0) {
                pattern += `${currentStitches}${stitch_type}\n`;
            } else if (diff > 0) {
                let rowParts = [];
                let accumulated = 0;
                for (let j = 0; j < diff; j++) {
                    const count = Math.floor((j + 1) * prevStitches / diff) - Math.floor(j * prevStitches / diff);
                    if (count > 1) {
                        rowParts.push(`${count - 1}${stitch_type}`);
                    }
                    rowParts.push(inc);
                    accumulated += count;
                }
                if (accumulated < prevStitches) {
                    rowParts.push(`${prevStitches - accumulated}${stitch_type}`);
                }

                pattern += compressPattern(rowParts) + "\n";
            }
        }
        prevStitches = currentStitches;
    }

    return pattern.trim();
};
