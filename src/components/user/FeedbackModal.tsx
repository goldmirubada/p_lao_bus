import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { X, Loader2 } from 'lucide-react';
import { Stop } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    relatedStop?: Stop | null; // Optional: context for the feedback
    user: any; // Authenticated user
}

export default function FeedbackModal({ isOpen, onClose, relatedStop, user }: FeedbackModalProps) {
    const { t } = useLanguage();
    const [category, setCategory] = useState('wrong_stop');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('feedback')
                .insert({
                    user_id: user.id,
                    user_email: user.email,
                    category,
                    content,
                    stop_id: relatedStop?.id || null,
                    status: 'pending'
                });

            if (error) throw error;

            alert(t('feedback_success'));
            setContent('');
            onClose();
        } catch (error) {
            console.error('Feedback error:', error);
            alert(t('feedback_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold text-slate-800 mb-1">{t('feedback_title')}</h2>
                <p className="text-sm text-slate-500 mb-6">
                    {relatedStop
                        ? `'${relatedStop.stop_name}' ${t('feedback_stop_ref')}`
                        : t('feedback_general')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('feedback_type')}</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="wrong_stop">{t('feedback_type_location')}</option>
                            <option value="bus_missing">{t('feedback_type_missing')}</option>
                            <option value="app_bug">{t('feedback_type_bug')}</option>
                            <option value="other">{t('feedback_type_other')}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('feedback_content')}</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t('feedback_placeholder')}
                            className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {t('feedback_submitting')}
                                </>
                            ) : (
                                t('feedback_submit')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
