import React from 'react';
import { ItemType } from '../types/stash';
import {
  FileText,
  Link2,
  Image as ImageIcon,
  Search,
  Sparkles,
} from 'lucide-react';
import { getGreetingText, getContextualPrompt, getCurrentTimePeriod } from '../utils/greeting';

interface HomeGreetingCardProps {
  userName: string;
  itemCount: number;
  pinnedCount: number;
  sessionSeed: number;
  onOpenNameModal: () => void;
  onQuickAction: (action: 'note' | 'link' | 'image' | 'search') => void;
}

export const HomeGreetingCard: React.FC<HomeGreetingCardProps> = ({
  userName,
  itemCount,
  pinnedCount,
  sessionSeed,
  onOpenNameModal,
  onQuickAction,
}) => {
  const period = getCurrentTimePeriod();
  const greeting = getGreetingText(userName);
  const contextualMessage = getContextualPrompt({
    itemCount,
    pinnedCount,
    period,
    sessionSeed,
  });

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 rounded-2xl p-4 border border-indigo-100/90 shadow-xs mb-3">
      {/* Top Greeting Row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
              {greeting}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-normal mt-0.5 leading-relaxed">
            {contextualMessage}
          </p>
        </div>

        <button
          onClick={onOpenNameModal}
          title={userName ? `Signed in as ${userName} (click to change name)` : 'Personalize your name'}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/90 hover:bg-white text-indigo-700 hover:text-indigo-800 border border-indigo-200/80 shadow-2xs transition cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>{userName ? userName : 'Set Name'}</span>
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="pt-3 border-t border-indigo-100/70 mt-2.5">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
          Quick Actions
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onQuickAction('note')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition shadow-2xs group cursor-pointer active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800">Note</span>
          </button>

          <button
            onClick={() => onQuickAction('link')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white hover:bg-sky-50/70 border border-slate-200/80 hover:border-sky-300 text-slate-700 hover:text-sky-700 transition shadow-2xs group cursor-pointer active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-100/70 text-sky-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800">Link</span>
          </button>

          <button
            onClick={() => onQuickAction('image')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 transition shadow-2xs group cursor-pointer active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800">Image</span>
          </button>

          <button
            onClick={() => onQuickAction('search')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 text-slate-700 hover:text-purple-700 transition shadow-2xs group cursor-pointer active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-100/70 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Search className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
};
