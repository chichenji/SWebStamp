import { useEffect, useRef, useState } from 'react';
const MIN_STAMP_SIZE = 0.05;
const MAX_STAMP_SIZE = 0.8;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getPointerAngle = (event, center) => (
    Math.atan2(event.clientY - center.y, event.clientX - center.x) * DEGREES_PER_RADIAN
);

const buildInteraction = ({ type, event, stamp, overlay }) => {
    const rect = overlay.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return {
        type,
        startX: event.clientX,
        startY: event.clientY,
        startAngle: getPointerAngle(event, center),
        center,
        stamp: { ...stamp }
    };
};

const getMoveUpdates = (interaction, delta) => {
    const { stamp } = interaction;
    return {
        xPercent: clamp(stamp.xPercent + delta.x, 0, 1 - stamp.widthPercent),
        yPercent: clamp(stamp.yPercent + delta.y, 0, 1 - stamp.heightPercent)
    };
};

const getResizeUpdates = (interaction, pointerDelta) => {
    const { stamp } = interaction;
    const delta = pointerDelta.x;
    const ratio = stamp.heightPercent / stamp.widthPercent;
    const maxWidth = Math.min(MAX_STAMP_SIZE, 1 - stamp.xPercent, (1 - stamp.yPercent) / ratio);
    const widthPercent = clamp(stamp.widthPercent + delta, MIN_STAMP_SIZE, maxWidth);
    return { widthPercent, heightPercent: widthPercent * ratio };
};

const getRotationUpdate = (event, interaction) => ({
    rotation: interaction.stamp.rotation
        + getPointerAngle(event, interaction.center)
        - interaction.startAngle
});

const getSourceDelta = (event, interaction, { overlay, rotation }) => {
    const layer = overlay.parentElement;
    const surface = layer.closest('.document-page-surface');
    const zoom = surface.getBoundingClientRect().width / surface.offsetWidth;
    const radians = -rotation / DEGREES_PER_RADIAN;
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    return {
        x: (dx * Math.cos(radians) - dy * Math.sin(radians)) / (layer.offsetWidth * zoom),
        y: (dx * Math.sin(radians) + dy * Math.cos(radians)) / (layer.offsetHeight * zoom)
    };
};


export const useStampInteraction = ({ stamp, onSelect, onUpdate, pageRotation }) => {
    const overlayRef = useRef(null);
    const [interaction, setInteraction] = useState(null);
    const startInteraction = (type, event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        setInteraction(buildInteraction({ type, event, stamp, overlay: overlayRef.current }));
    };
    useEffect(() => {
        if (!interaction) return undefined;
        const handlePointerMove = (event) => {
            const delta = getSourceDelta(event, interaction, { overlay: overlayRef.current, rotation: pageRotation });
            if (interaction.type === 'move') onUpdate(stamp.id, getMoveUpdates(interaction, delta));
            if (interaction.type === 'resize') onUpdate(stamp.id, getResizeUpdates(interaction, delta));
            if (interaction.type === 'rotate') onUpdate(stamp.id, getRotationUpdate(event, interaction));
        };
        const handlePointerUp = () => setInteraction(null);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [interaction, onUpdate, stamp.id, pageRotation]);

    return { overlayRef, startInteraction };
};
