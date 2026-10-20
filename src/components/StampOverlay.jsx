import React from 'react';
import { useStampInteraction } from './useStampInteraction';
import { RotateCw, Trash2 } from 'lucide-react';
import { getStampFilter, normalizeStampAppearance } from '../utils/stampAppearance';

const StampOverlay = ({ stamp, onDelete, onUpdate, isSelected, onSelect, pageRotation = 0 }) => {
    const appearance = normalizeStampAppearance(stamp);
    const { overlayRef, startInteraction } = useStampInteraction({ stamp, onSelect, onUpdate, pageRotation });
    return (
        <div
            ref={overlayRef}
            className={`stamp-overlay ${isSelected ? 'is-selected' : ''}`}
            style={{
                left: `${stamp.xPercent * 100}%`,
                top: `${stamp.yPercent * 100}%`,
                width: `${stamp.widthPercent * 100}%`,
                height: `${stamp.heightPercent * 100}%`
            }}
            onPointerDown={event => startInteraction('move', event)}
        >
            <img
                src={stamp.url}
                alt="印章"
                draggable="false"
                style={{
                    filter: getStampFilter(appearance),
                    mixBlendMode: appearance.blendMode,
                    opacity: appearance.opacity,
                    transform: `rotate(${stamp.rotation || 0}deg)`
                }}
            />
            {isSelected && (
                <>
                    <button type="button" className="stamp-handle stamp-delete" onPointerDown={event => event.stopPropagation()} onClick={onDelete} title="删除印章">
                        <Trash2 size={13} />
                    </button>
                    <button type="button" className="stamp-handle stamp-rotate" onPointerDown={event => startInteraction('rotate', event)} title="旋转印章">
                        <RotateCw size={13} />
                    </button>
                    <button type="button" className="stamp-resize" onPointerDown={event => startInteraction('resize', event)} title="缩放印章" />
                </>
            )}
        </div>
    );
};

export default StampOverlay;
