import React, { useEffect, useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';

const DEFAULT_TOP = 72;

const FloatingToolWindow = ({ title, children, footer, onClose, width = 390 }) => {
    const [position, setPosition] = useState(() => ({
        x: Math.max(16, window.innerWidth - width - 320),
        y: DEFAULT_TOP
    }));
    const [drag, setDrag] = useState(null);

    useEffect(() => {
        if (!drag) return undefined;
        const handleMove = event => setPosition({
            x: Math.max(8, event.clientX - drag.offsetX),
            y: Math.max(8, event.clientY - drag.offsetY)
        });
        const handleUp = () => setDrag(null);
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp, { once: true });
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [drag]);

    return (
        <section className="floating-tool-window" style={{ left: position.x, top: position.y, width }}>
            <header
                onPointerDown={event => setDrag({
                    offsetX: event.clientX - position.x,
                    offsetY: event.clientY - position.y
                })}
            >
                <GripHorizontal size={16} />
                <strong>{title}</strong>
                <button type="button" onPointerDown={event => event.stopPropagation()} onClick={onClose} title="关闭">
                    <X size={17} />
                </button>
            </header>
            <div className="floating-tool-body">{children}</div>
            {footer && <footer>{footer}</footer>}
        </section>
    );
};

export default FloatingToolWindow;
