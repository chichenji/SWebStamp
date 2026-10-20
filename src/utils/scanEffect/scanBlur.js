const CHANNEL_COUNT = 4;
const GAUSSIAN_EXTENT = 3;

const createKernel = sigma => {
    const extent = Math.ceil(sigma * GAUSSIAN_EXTENT);
    const weights = Array.from({ length: extent * 2 + 1 }, (_, index) =>
        Math.exp(-((index - extent) ** 2) / (2 * sigma ** 2)));
    const total = weights.reduce((sum, value) => sum + value, 0);
    return { extent, weights: weights.map(value => value / total) };
};

const sampleChannel = ({ data, width, height, kernel, vertical }, index, channel) => {
    const x = index % width;
    const y = Math.floor(index / width);
    let value = 0;
    for (let step = -kernel.extent; step <= kernel.extent; step += 1) {
        const sx = Math.min(width - 1, Math.max(0, x + (vertical ? 0 : step)));
        const sy = Math.min(height - 1, Math.max(0, y + (vertical ? step : 0)));
        value += data[(sy * width + sx) * CHANNEL_COUNT + channel] * kernel.weights[step + kernel.extent];
    }
    return value;
};

const blurAxis = options => {
    const output = new Float32Array(options.data.length);
    for (let index = 0; index < options.width * options.height; index += 1) {
        for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
            output[index * CHANNEL_COUNT + channel] = sampleChannel(options, index, channel);
        }
    }
    return output;
};

export const applySubtleBlur = ({ data, width, height, radius = 0 }) => {
    if (!radius) return new Uint8ClampedArray(data);
    const options = { data, width, height, kernel: createKernel(radius), vertical: false };
    const horizontal = blurAxis(options);
    return new Uint8ClampedArray(blurAxis({ ...options, data: horizontal, vertical: true }));
};
