import { describe, it, expect } from 'vitest';
import { generateCirclePattern, generateSpherePattern } from '../simulation/generators';
import { parseRows, calculateOutputStitches, calculateInputStitches } from '../parse';

describe("generateCirclePattern", () => {
    it("should generate simple circles", () => {
        for (let mr_size = 1; mr_size < 16; mr_size++) {
            expect(generateCirclePattern(1, mr_size, "sc")).toBe(mr_size + " sc");
            expect(generateCirclePattern(2, mr_size, "sc")).toBe(mr_size + " sc\n" + mr_size + " inc");
            expect(generateCirclePattern(3, mr_size, "sc")).toBe(mr_size + " sc\n" + mr_size + " inc\n" + mr_size + "x(sc, inc)");
            expect(generateCirclePattern(3, mr_size, "dc")).toBe(mr_size + " dc\n" + mr_size + "x(2 dc in next)\n" + mr_size + "x(dc, (2 dc in next))");
        }
    });

    it("should generate a consistent pattern", () => {
        const numRows = 10;
        const pattern = generateCirclePattern(numRows, 7, "hdc");
        const { rows, validation } = parseRows(pattern);

        for (let i = 1; i < rows.length; i++) {
            const currentInput = calculateInputStitches(rows[i].pieces);
            const prevOutput = calculateOutputStitches(rows[i - 1].pieces);

            expect(currentInput).toBe(prevOutput);
            expect(validation[i].isValid).toBe(true);
        }
    });
    it('should return an error for non-positive numbers counts', () => {
        expect(generateCirclePattern(0, 5, "sc")).toContain('Error');
        expect(generateCirclePattern(5, 0, "sc")).toContain('Error');
    });

    it('should return an error for too many stitches', () => {
        expect(generateCirclePattern(110, 5, "sc")).toContain('Error');
        expect(generateCirclePattern(5, 80, "sc")).toContain('Error');
    });
});

describe('generateSpherePattern', () => {
    it('should generate a pattern where each row matches the previous row\'s output', () => {
        const numRows = 10;
        const pattern = generateSpherePattern(numRows);
        const { rows, validation } = parseRows(pattern);

        // First row (the ring) is special, it doesn't have a previous row to match against
        // But subsequent rows should have their input stitches equal to the previous row's output stitches
        for (let i = 1; i < rows.length; i++) {
            const currentInput = calculateInputStitches(rows[i].pieces);
            const prevOutput = calculateOutputStitches(rows[i - 1].pieces);

            expect(currentInput).toBe(prevOutput);
            expect(validation[i].isValid).toBe(true);
        }
    });

    it('should work for different number of rows', () => {
        const rowCounts = [5, 15, 20];
        for (const numRows of rowCounts) {
            const pattern = generateSpherePattern(numRows);
            const { rows, validation } = parseRows(pattern);

            for (let i = 1; i < rows.length; i++) {
                const currentInput = calculateInputStitches(rows[i].pieces);
                const prevOutput = calculateOutputStitches(rows[i - 1].pieces);
                expect(currentInput).toBe(prevOutput);
                expect(validation[i].isValid).toBe(true);
            }
        }
    });

    it('should return an error for non-positive row counts', () => {
        expect(generateSpherePattern(0)).toContain('Error');
        expect(generateSpherePattern(-5)).toContain('Error');
    });

    it('should return an error for too many rows', () => {
        expect(generateSpherePattern(101)).toContain('Error');
    });
});
