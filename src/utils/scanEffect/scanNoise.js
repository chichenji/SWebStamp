const FNV_PRIME = 16777619;
const FNV_OFFSET = 2166136261;
const UINT_RANGE = 4294967296;
const PAPER_GRID = Object.freeze({ grainX: 1600, grainY: 2300, fiberX: 420, fiberY: 3100 });
const EDGE_MARGIN = 0.055;

export const createSeedFromId = id => {
    if (id === undefined || id === null || id === '') throw new TypeError('扫描页面缺少稳定 ID');
    let hash = FNV_OFFSET;
    for (const char of String(id)) hash = Math.imul(hash ^ char.charCodeAt(0), FNV_PRIME);
    return hash >>> 0;
};

export const coordHash = (x, y, seed) => {
    let hash = Math.imul(x ^ seed, 0x9e3779b9) ^ Math.imul(y ^ seed, FNV_PRIME);
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    return ((hash ^ (hash >>> 16)) >>> 0) / UINT_RANGE;
};

const smoothNoise = (x, y, seed) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const top = coordHash(ix, iy, seed) * (1 - fx) + coordHash(ix + 1, iy, seed) * fx;
    const bottom = coordHash(ix, iy + 1, seed) * (1 - fx) + coordHash(ix + 1, iy + 1, seed) * fx;
    return (top * (1 - fy) + bottom * fy - 0.5) * 2;
};

export const generatePixelNoise = ({ x, y, width, height, seed }) => {
    // Paper coordinates keep the same sheet when export quality changes.
    const nx = x / width;
    const ny = y / height;
    const distance = Math.min(nx, ny, 1 - nx, 1 - ny);
    const edge = Math.max(0, (EDGE_MARGIN - distance) / EDGE_MARGIN) ** 2;
    return {
        grain: smoothNoise(nx * PAPER_GRID.grainX, ny * PAPER_GRID.grainY, seed),
        fiber: smoothNoise(nx * PAPER_GRID.fiberX, ny * PAPER_GRID.fiberY, seed ^ FNV_PRIME), edge
    };
};

export const compositeAlphaOntoWhite = ({ r, g, b, a }) => {
    const alpha = a / 255;
    return { r: Math.round(r * alpha + 255 * (1 - alpha)),
        g: Math.round(g * alpha + 255 * (1 - alpha)),
        b: Math.round(b * alpha + 255 * (1 - alpha)), a: 255 };
};
