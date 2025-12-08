import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        } else {
            const timer = setTimeout(() => {
                setIsVisible(false);
                document.body.style.overflow = 'unset';
            }, 300); // Matches transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-auto ${isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`w-full max-w-md bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto max-h-[85vh] flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                {/* Handle bar for visual cue */}
                <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header (Optional) */}
                {(title) && (
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Content - Scrollable */}
                <div className="overflow-y-auto p-5 pb-8 safe-area-bottom">
                    {children}
                </div>
            </div>
        </div>
    );
}
