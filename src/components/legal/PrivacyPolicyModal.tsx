import React, { useState } from 'react';
import { X, ChevronRight, FileText, Lock, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PrivacyPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
    const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'privacy'
                                ? 'text-blue-600 border-blue-600'
                                : 'text-slate-500 border-transparent hover:text-slate-700'
                                }`}
                        >
                            {t('privacy_policy')}
                        </button>
                        <button
                            onClick={() => setActiveTab('terms')}
                            className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'terms'
                                ? 'text-blue-600 border-blue-600'
                                : 'text-slate-500 border-transparent hover:text-slate-700'
                                }`}
                        >
                            {t('terms_of_service')}
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 text-sm text-slate-600 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {activeTab === 'privacy' ? (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('privacy_policy')}</h2>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                    <MapPinIcon className="w-4 h-4 text-blue-500" />
                                    {t('privacy_section_1_title')}
                                </h3>
                                <p>
                                    {t('privacy_section_1_content')}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-blue-500" />
                                    {t('privacy_section_2_title')}
                                </h3>
                                <p>
                                    {t('privacy_section_2_content')}
                                </p>
                                <ul className="list-disc pl-5 mt-1 bg-slate-50 p-3 rounded-lg">
                                    <li>{t('privacy_section_2_list_1')}</li>
                                    <li>{t('privacy_section_2_list_2')}</li>
                                    <li>{t('privacy_section_2_list_3')}</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                    <CookieIcon className="w-4 h-4 text-blue-500" />
                                    {t('privacy_section_3_title')}
                                </h3>
                                <p>
                                    {t('privacy_section_3_content')}
                                </p>
                                <ul className="list-disc pl-5 mt-1 bg-slate-50 p-3 rounded-lg">
                                    <li>{t('privacy_section_3_list_1')}</li>
                                    <li>{t('privacy_section_3_list_2')}</li>
                                    <li>{t('privacy_section_3_list_3')}</li>
                                    <li>{t('privacy_section_3_list_4')}</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                    <ServerIcon className="w-4 h-4 text-blue-500" />
                                    {t('privacy_section_4_title')}
                                </h3>
                                <p>
                                    {t('privacy_section_4_content')}
                                </p>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('terms_of_service')}</h2>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('terms_section_1_title')}</h3>
                                <p>
                                    {t('terms_section_1_content')}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('terms_section_2_title')}</h3>
                                <p>
                                    {t('terms_section_2_content')}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('terms_section_3_title')}</h3>
                                <p>
                                    {t('terms_section_3_content')}
                                </p>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        {t('legal_confirm_btn') || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MapPinIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
}

function UserIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
}

function CookieIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>;
}

function ServerIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>;
}
