'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'ko', flagCode: 'kr', label: '한국어' },
        { code: 'lo', flagCode: 'la', label: 'ລາວ' },
        { code: 'en', flagCode: 'us', label: 'English' },
        { code: 'cn', flagCode: 'cn', label: '中文' },
        { code: 'th', flagCode: 'th', label: 'ไทย' },
        { code: 'vi', flagCode: 'vn', label: 'Tiếng Việt' },
        { code: 'km', flagCode: 'kh', label: 'ខ្មែរ' },
        { code: 'fr', flagCode: 'fr', label: 'Français' },
        { code: 'es', flagCode: 'es', label: 'Español' },
        { code: 'ar', flagCode: 'sa', label: 'العربية' },
        { code: 'jp', flagCode: 'jp', label: '日本語' },
    ] as const;

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                aria-label="Change Language"
            >
                <img
                    src={`https://flagcdn.com/w40/${currentLang.flagCode}.png`}
                    alt={currentLang.label}
                    className="w-5 h-5 rounded-full object-cover border border-slate-100"
                />
                <span className="text-xs uppercase text-slate-500 hidden sm:inline-block">{currentLang.code}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[100] overflow-hidden max-h-[80vh] overflow-y-auto">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3 ${language === lang.code ? 'bg-blue-50/50 text-blue-600 font-medium' : 'text-slate-600'
                                    }`}
                            >
                                <img
                                    src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                                    alt={lang.label}
                                    className="w-5 h-5 rounded-full object-cover border border-slate-100 shadow-sm"
                                />
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
