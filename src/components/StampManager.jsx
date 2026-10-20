import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Scissors, SlidersHorizontal, Stamp, Trash2, Type, Upload } from 'lucide-react';
import { useApp } from '../context/useApp';
import StampInspector from './StampInspector';

const StampLibraryItem = ({ stamp, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `stamp-library-${stamp.id}`,
        data: { type: 'stamp-library', stamp }
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className="stamp-library-item">
            <button
                type="button"
                className="stamp-drag-surface"
                {...listeners}
                {...attributes}
                title={`拖动 ${stamp.name}`}
            >
                <img src={stamp.url} alt={stamp.name} />
                <GripVertical size={14} />
            </button>
            <button
                type="button"
                className="stamp-delete-source"
                onClick={event => onDelete(event, stamp.id)}
                title="删除印章素材"
            >
                <Trash2 size={13} />
            </button>
        </div>
    );
};

const StampLibrary = ({ onOpenCrossPageTool, onOpenWatermarkTool }) => {
    const { stamps, uploadStamp, deleteStamp, documents, crossPageStamp, watermarkConfig } = useApp();

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            const result = await uploadStamp(file);
            if (!result.success) {
                console.error('Failed to upload stamp:', result.error);
            }
        }
    }, [uploadStamp]);

    const handleDelete = async (e, stampId) => {
        e.stopPropagation();
        const result = await deleteStamp(stampId);
        if (!result.success) {
            console.error('Failed to delete stamp:', result.error);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg']
        }
    });

    return (
        <div className="stamp-library">
            <div {...getRootProps()} className={`stamp-upload-zone ${isDragActive ? 'is-active' : ''}`}>
                <input {...getInputProps()} />
                <Upload size={18} />
                <span>添加印章</span>
            </div>

            {documents.length > 0 && (
                <div className="stamp-tool-row">
                    <button type="button" className={crossPageStamp ? 'is-active' : ''} onClick={onOpenCrossPageTool}>
                        <Scissors size={15} /> 骑缝章
                    </button>
                    <button type="button" className={watermarkConfig ? 'is-active' : ''} onClick={onOpenWatermarkTool}>
                        <Type size={15} /> 水印
                    </button>
                </div>
            )}

            <div className="stamp-library-grid">
                {stamps.map(stamp => (
                    <StampLibraryItem key={stamp.id} stamp={stamp} onDelete={handleDelete} />
                ))}
            </div>

            {stamps.length === 0 && <div className="stamp-library-empty"><Stamp size={24} /><span>暂无印章素材</span></div>}
        </div>
    );
};

const StampManager = ({ onOpenCrossPageTool, onOpenWatermarkTool }) => {
    const { selectedStamp, setSelectedPlacedStamp } = useApp();
    const [activeTab, setActiveTab] = useState('library');
    const visibleTab = selectedStamp ? 'properties' : activeTab;

    const showLibrary = () => {
        setSelectedPlacedStamp(null);
        setActiveTab('library');
    };

    return (
        <div className="stamp-panel">
            <div className="stamp-panel-header">
                <div className="stamp-panel-title"><Stamp size={17} /><strong>印章工作台</strong></div>
                <div className="stamp-panel-tabs" role="tablist">
                    <button type="button" className={visibleTab === 'library' ? 'is-active' : ''} onClick={showLibrary}>
                        <Stamp size={14} /> 印章库
                    </button>
                    <button type="button" className={visibleTab === 'properties' ? 'is-active' : ''} onClick={() => setActiveTab('properties')}>
                        <SlidersHorizontal size={14} /> 属性
                    </button>
                </div>
            </div>
            <div className="stamp-panel-body">
                {visibleTab === 'library' ? (
                    <StampLibrary
                        onOpenCrossPageTool={onOpenCrossPageTool}
                        onOpenWatermarkTool={onOpenWatermarkTool}
                    />
                ) : <StampInspector />}
            </div>
        </div>
    );
};

export default StampManager;
