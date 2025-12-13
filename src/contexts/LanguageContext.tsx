'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '@/lib/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations['ko']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en'); // Default to 'en'

    useEffect(() => {
        // Load saved language from local storage on mount
        const savedLang = localStorage.getItem('app_language') as Language;
        if (savedLang && ['ko', 'lo', 'en', 'cn', 'th', 'vi', 'km'].includes(savedLang)) {
            setLanguageState(savedLang);
        } else {
            // Robust Language Detection for Hybrid App
            const setLangFromCode = (code: string) => {
                const lowerCode = code.toLowerCase();
                if (lowerCode.startsWith('ko')) setLanguageState('ko');
                else if (lowerCode.startsWith('lo')) setLanguageState('lo');
                else if (lowerCode.startsWith('zh')) setLanguageState('cn');
                else if (lowerCode.startsWith('th')) setLanguageState('th');
                else if (lowerCode.startsWith('vi')) setLanguageState('vi');
                else if (lowerCode.startsWith('km')) setLanguageState('km');
                else setLanguageState('en');
            };

            import('@capacitor/device').then(({ Device }) => {
                Device.getLanguageCode().then(({ value }) => {
                    setLangFromCode(value);
                }).catch(() => {
                    // Fallback to navigator if Plugin fails
                    setLangFromCode(navigator.language);
                });
            }).catch(() => {
                setLangFromCode(navigator.language);
            });
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);
    };

    const t = (key: keyof typeof translations['ko']) => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
