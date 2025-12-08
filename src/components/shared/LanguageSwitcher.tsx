'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'ko', displayCode: 'KR', label: '한국어' },
        { code: 'lo', displayCode: 'LA', label: 'ລາວ' },
        { code: 'en', displayCode: 'US', label: 'English' },
        { code: 'cn', displayCode: 'CN', label: '中文' },
        { code: 'th', displayCode: 'TH', label: 'ไทย' },
        { code: 'vi', displayCode: 'VN', label: 'Tiếng Việt' },
        { code: 'km', displayCode: 'KH', label: 'ខ្មែរ' },
    ] as const;

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                aria-label="Change Language"
            >
                <Globe className="w-4 h-4 text-slate-500" />
                <span>{currentLang.displayCode}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50 overflow-hidden">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${language === lang.code ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-600'
                                    }`}
                            >
                                <span className="w-6 text-xs font-bold uppercase text-slate-400 text-center">
                                    {lang.displayCode}
                                </span>
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
