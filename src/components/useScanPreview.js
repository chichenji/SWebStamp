import { useEffect, useMemo, useState } from 'react';
import { composeScanPageCanvas } from '../utils/scanEffect/scanComposer.js';
import { calculateScanGeometry } from '../utils/scanEffect/scanGeometry.js';
import { loadCanvasImage } from '../utils/stampRenderer.js';
import { prepareAssets } from '../utils/pageAssets.js';

const PREVIEW_DEBOUNCE_MS = 120;

export const useScanPreview = options => {
    const { doc, stamps, index, pageCount, crossPageStamp, watermarkConfig, scanConfig, enabled } = options;
    const request = useMemo(() => ({ doc, stamps, index, pageCount, crossPageStamp, watermarkConfig, scanConfig }),
        [doc, stamps, index, pageCount, crossPageStamp, watermarkConfig, scanConfig]);
    const [rendered, setRendered] = useState(null);
    useEffect(() => {
        if (!enabled) return undefined;
        let active = true;
        const controller = new AbortController();
        const render = async () => {
            try {
                const assets = await prepareAssets({ watermarkConfig, crossPageStamp, pageCount });
                const image = await loadCanvasImage(doc.previewUrl);
                if (!active) return;
                const geometry = calculateScanGeometry({ sourceWidth: image.width, sourceHeight: image.height,
                    fitToA4: scanConfig.fitToA4, tiltAngle: scanConfig.tiltAngle });
                const canvas = await composeScanPageCanvas({ pageDoc: doc, stamps, index, pageCount, assets,
                    crossPageStamp, scanConfig, signal: controller.signal, preset: { scaleFactor: 1, format: 'PNG' } });
                if (active) setRendered({ request, canvas, geometry });
            } catch (error) {
                if (active) setRendered({ request, error: error.message });
            }
        };
        const timer = setTimeout(render, PREVIEW_DEBOUNCE_MS);
        return () => { active = false; controller.abort(); clearTimeout(timer); };
    }, [request, enabled, doc, stamps, index, pageCount, crossPageStamp, watermarkConfig, scanConfig]);
    return { canvas: rendered?.canvas, geometry: rendered?.geometry,
        pending: enabled && rendered?.request !== request,
        error: rendered?.request === request ? rendered.error : null };
};
