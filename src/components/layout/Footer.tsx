'use client';

import React, { useState } from 'react';
import PrivacyPolicyModal from '@/components/legal/PrivacyPolicyModal';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
    const { t } = useLanguage();
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

    return (
        <>
            <footer className="bg-slate-50 border-t border-slate-200 py-2 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex justify-center gap-4 mb-1 text-xs text-slate-500">
                        <button
                            onClick={() => setIsPrivacyOpen(true)}
                            className="hover:text-slate-800 transition-colors"
                        >
                            {t('privacy_policy') || '개인정보처리방침'}
                        </button>
                        <button
                            onClick={() => setIsPrivacyOpen(true)}
                            className="hover:text-slate-800 transition-colors"
                        >
                            {t('terms_of_service') || '이용약관'}
                        </button>
                        <a
                            href="mailto:goldmiru.bada@gmail.com"
                            className="hover:text-slate-800 transition-colors"
                        >
                            {t('contact_us') || '문의하기'}
                        </a>
                    </div>
                    <p className="text-[10px] text-slate-400">
                        &copy; {new Date().getFullYear()} Lao Bus Route Map. All rights reserved.
                    </p>
                </div>
            </footer>

            <PrivacyPolicyModal
                isOpen={isPrivacyOpen}
                onClose={() => setIsPrivacyOpen(false)}
            />
        </>
    );
}
