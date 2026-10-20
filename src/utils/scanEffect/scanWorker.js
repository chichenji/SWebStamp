import { processTonalOnly, processOpticsOnly } from './scanPixelProcessing.js';
import { applySubtleBlur } from './scanBlur.js';

self.onmessage = ({ data: options }) => {
    try {
        const processed = options.stage === 'tone' ? processTonalOnly(options) : processOpticsOnly(options);
        const output = options.stage === 'optics' ? applySubtleBlur({ ...options, data: processed,
            radius: options.config.subtleBlur * options.scaleFactor }) : processed;
        self.postMessage({ data: output }, [output.buffer]);
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
