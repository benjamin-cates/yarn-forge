
export function mulberry32(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export const getLabelColors = (color: string): { backgroundColor: string, textColor: string } => {
    const s = new Option().style;
    s.color = color;
    if (s.color === "") {
        return { backgroundColor: 'rgba(0,0,0,0.5)', textColor: 'white' };
    }

    // Use a temporary element to get the computed RGB color
    const temp = document.createElement('div');
    temp.style.color = color;
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const computedColor = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const match = computedColor.match(/\d+/g);
    if (!match) return { backgroundColor: 'rgba(0,0,0,0.5)', textColor: 'white' };

    const [r, g, b] = match.map(Number);
    // Relative luminance formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    return {
        backgroundColor: computedColor,
        textColor: luminance > 0.5 ? 'black' : 'white'
    };
};