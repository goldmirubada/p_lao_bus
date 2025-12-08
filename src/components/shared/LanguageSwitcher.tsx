'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'ko', label: '🇰🇷 한국어' },
        { code: 'lo', label: '🇱🇦 ລາວ' },
        { code: 'en', label: '🇺🇸 English' },
    ] as const;

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
                <span>{currentLang.label}</span>
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
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${language === lang.code ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-600'
                                    }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
