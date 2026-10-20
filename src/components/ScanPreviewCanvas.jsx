import React, { useEffect, useRef } from 'react';

const ScanPreviewCanvas = ({ canvas }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!canvas) return;
        ref.current.width = canvas.width;
        ref.current.height = canvas.height;
        ref.current.getContext('2d').drawImage(canvas, 0, 0);
    }, [canvas]);
    return <canvas ref={ref} className="scan-preview-canvas" aria-label="扫描效果预览" data-page-image />;
};
export default ScanPreviewCanvas;
