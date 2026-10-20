import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/useApp';
import { convertPdfToImages } from '../utils/pdfUtils';

const readPages = async file => {
    if (file.type === 'application/pdf') return convertPdfToImages(file);
    if (file.type.startsWith('image/')) return [{
        id: crypto.randomUUID(), file, type: file.type, name: file.name, previewUrl: URL.createObjectURL(file)
    }];
    throw new Error(`不支持的文件类型：${file.name}`);
};
const SidebarFileAdder = () => {
    const { addDocuments, setIsProcessing } = useApp();
    const input = useRef(null);
    const handleAdd = async event => {
        const files = Array.from(event.target.files);
        if (!files.length) return;
        setIsProcessing(true);
        try {
            for (const file of files) {
                try { addDocuments(await readPages(file)); }
                catch (error) { alert(`无法解析文件 ${file.name}：${error.message}`); }
            }
        } finally {
            setIsProcessing(false);
            input.current.value = '';
        }
    };
    return <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0 z-10">
        <input type="file" ref={input} onChange={handleAdd} multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
        <button type="button" onClick={() => input.current.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-500 hover:text-indigo-600">
            <Plus size={18} />添加更多文件
        </button>
    </div>;
};
export default SidebarFileAdder;
