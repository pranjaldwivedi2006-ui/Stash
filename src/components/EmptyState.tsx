import React from 'react';
import { ScreenTab } from '../types/stash';
import { Inbox, Archive, SearchX, Plus, Sparkles, FileText, Link2, Image as ImageIcon } from 'lucide-react';
import { NATURAL_LANGUAGE_SUGGESTIONS } from '../utils/naturalLanguageSearch';

interface EmptyStateProps {
  currentTab: ScreenTab;
  isFiltered: boolean;
  searchQuery?: string;
  onOpenAddModal: (type?: 'note' | 'link' | 'image') => void;
  onClearFilter: () => void;
  onSelectSuggestion?: (query: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  currentTab,
  isFiltered,
  searchQuery = '',
  onOpenAddModal,
  onClearFilter,
  onSelectSuggestion,
}) => {
  if (isFiltered) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-500 flex items-center justify-center mb-3.5 shadow-xs">
          <SearchX className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1 tracking-tight">
          Nothing found this time. Try different words?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-4 leading-relaxed">
          {searchQuery ? (
            <>
              No items matched <span className="font-semibold text-slate-700">"{searchQuery}"</span>.
              Try broader keywords, searching by item type, or clearing some filters.
            </>
          ) : (
            'We checked titles, note content, tags, item types, and pin status, but couldn\'t find any matches.'
          )}
        </p>

        {/* Suggestion Chips */}
        {onSelectSuggestion && (
          <div className="mb-5 max-w-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Try a natural-language search:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {NATURAL_LANGUAGE_SUGGESTIONS.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-600 transition cursor-pointer"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClearFilter}
          className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-semibold transition cursor-pointer"
        >
          Clear All Filters
        </button>
      </div>
    );
  }

  if (currentTab === 'archived') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mb-3.5">
          <Archive className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Archive is peaceful and empty 📦
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xs mb-2">
          Items you archive from your inbox will be tucked away safely here.
        </p>
        <p className="text-[11px] text-slate-400">
          Tap the archive icon on any item in your inbox to move it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-200/70 text-indigo-600 flex items-center justify-center mb-3.5 shadow-sm shadow-indigo-100">
        <Sparkles className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1.5 tracking-tight">
        Your Stash is waiting for its first little treasure ✨
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
        Save quick notes, links, and device photos with private local storage. No login required.
      </p>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={() => onOpenAddModal('note')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-200 transition cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>

        <button
          onClick={() => onOpenAddModal('link')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5 text-sky-600" />
          <span>Save Link</span>
        </button>

        <button
          onClick={() => onOpenAddModal('image')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Add Image</span>
        </button>
      </div>
    </div>
  );
};
