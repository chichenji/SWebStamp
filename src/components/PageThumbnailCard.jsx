import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../context/useApp';
import { getImageFilter, getImageAdjustments } from '../utils/imageAdjustment.js';

const PageActions = ({ docId, index, actions }) => (
    <div className="absolute top-2 right-4 z-20 flex flex-col gap-1">
        <button
            type="button"
            onClick={() => actions.remove(docId)}
            title="删除页面"
            className="p-1.5 bg-red-500 text-white hover:bg-red-600 rounded-md shadow-md"
        >
            <Trash2 size={14} />
        </button>
        <div className="flex flex-col gap-1 bg-white/90 rounded-md shadow-md border border-gray-200 p-0.5">
            <button
                type="button"
                title="上移"
                disabled={index === 0}
                onClick={actions.up}
                className="p-1.5 text-gray-600 hover:text-indigo-600 rounded disabled:opacity-30"
            >
                <ChevronUp size={14} />
            </button>
            <button
                type="button"
                title="下移"
                disabled={actions.isLast}
                onClick={actions.down}
                className="p-1.5 text-gray-600 hover:text-indigo-600 rounded disabled:opacity-30"
            >
                <ChevronDown size={14} />
            </button>
        </div>
    </div>
);

const ThumbnailImageButton = ({ doc, index, selected, onSelect, onPointerDown, filter }) => {
    const borderClass = selected
        ? 'border-indigo-600 ring-2 ring-indigo-100'
        : 'border-gray-200 hover:border-indigo-400';
    return (
        <button
            type="button"
            onClick={onSelect}
            onPointerDown={onPointerDown}
            aria-label={`切换到第 ${index + 1} 页`}
            aria-current={selected ? 'page' : undefined}
            className={`relative block w-full bg-white shadow-sm border-2 rounded-lg overflow-hidden transition-all focus-visible:outline-indigo-600 ${borderClass}`}
            style={{ touchAction: 'none' }}
        >
            <img
                src={doc.previewUrl}
                alt={`第 ${index + 1} 页`}
                draggable={false}
                className="w-full h-auto block"
                style={filter !== 'none' ? { filter } : undefined}
            />
        </button>
    );
};

const ThumbnailCardFooter = ({ activatorRef, attributes, listeners, selected, index, docName, onSelect }) => (
    <div className="text-center mt-1.5 flex items-center justify-center gap-1.5">
        <button
            type="button"
            ref={activatorRef}
            aria-label={`拖动第 ${index + 1} 页排序`}
            className="cursor-grab text-gray-400 hover:text-gray-600"
            style={{ touchAction: 'none' }}
            {...attributes}
            {...listeners}
        >
            <GripVertical size={14} />
        </button>
        <button
            type="button"
            onClick={onSelect}
            className={`text-xs font-semibold ${selected ? 'text-indigo-600' : 'text-gray-500'}`}
        >
            第 {index + 1} 页{selected ? ' · 当前' : ''}
        </button>
        <span className="text-[10px] text-gray-400 truncate max-w-[80px]" title={docName}>
            {docName}
        </span>
    </div>
);

const PageThumbnailCard = ({ doc, index, actions }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
    const { removeDocument, activeDocumentId, setActiveDocumentId, compareOriginal } = useApp();
    const selected = activeDocumentId === doc.id;
    const select = () => setActiveDocumentId(doc.id);
    const imageFilter = compareOriginal
        ? 'none'
        : getImageFilter(getImageAdjustments(doc));
    const cardStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} data-page-id={doc.id} className="relative group mb-4 px-3" style={cardStyle}>
            <PageActions docId={doc.id} index={index} actions={{ ...actions, remove: removeDocument }} />
            <ThumbnailImageButton
                doc={doc}
                index={index}
                selected={selected}
                onSelect={select}
                onPointerDown={listeners?.onPointerDown}
                filter={imageFilter}
            />
            <ThumbnailCardFooter
                activatorRef={setActivatorNodeRef}
                attributes={attributes}
                listeners={listeners}
                selected={selected}
                index={index}
                docName={doc.name}
                onSelect={select}
            />
        </div>
    );
};

export default PageThumbnailCard;
