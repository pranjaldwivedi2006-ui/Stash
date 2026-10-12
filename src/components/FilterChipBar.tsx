import React, { useState, forwardRef } from 'react';
import { FilterState, ItemType } from '../types/stash';
import {
  Search,
  X,
  Tag as TagIcon,
  FileText,
  Link2,
  Image as ImageIcon,
  SlidersHorizontal,
  Sparkles,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import {
  ParsedSearchCriteria,
  NATURAL_LANGUAGE_SUGGESTIONS,
} from '../utils/naturalLanguageSearch';

interface FilterChipBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableTags: string[];
  parsedCriteria?: ParsedSearchCriteria | null;
}

export const FilterChipBar = forwardRef<HTMLInputElement, FilterChipBarProps>(
  ({ filter, onFilterChange, availableTags, parsedCriteria }, ref) => {
    const [showSuggestions, setShowSuggestions] = useState(false);

    const types: { id: 'all' | ItemType; label: string; icon: React.ReactNode }[] = [
      { id: 'all', label: 'All', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
      { id: 'note', label: 'Notes', icon: <FileText className="w-3.5 h-3.5" /> },
      { id: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
      { id: 'image', label: 'Images', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    ];

    const handleSearchChange = (query: string) => {
      onFilterChange({ ...filter, searchQuery: query });
    };

    const handleTypeSelect = (type: 'all' | ItemType) => {
      onFilterChange({ ...filter, selectedType: type });
    };

    const handleTagToggle = (tag: string) => {
      onFilterChange({
        ...filter,
        selectedTag: filter.selectedTag === tag ? null : tag,
      });
    };

    const handleApplySuggestion = (suggestion: string) => {
      onFilterChange({ ...filter, searchQuery: suggestion });
      setShowSuggestions(false);
    };

    const hasActiveFilters =
      filter.searchQuery.trim() !== '' ||
      filter.selectedType !== 'all' ||
      filter.selectedTag !== null;

    const hasRecognizedIntentions =
      Boolean(parsedCriteria && parsedCriteria.recognizedIntentions.length > 0 && filter.searchQuery.trim());

    return (
      <div className="bg-white border-b border-slate-200/70 px-4 pt-3 pb-2.5 space-y-2.5">
        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={ref}
            type="text"
            value={filter.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (!filter.searchQuery.trim()) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Search naturally (e.g. 'C programming notes', 'pinned links')..."
            className="w-full pl-9 pr-16 py-2 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {filter.searchQuery ? (
              <button
                onClick={() => handleSearchChange('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`p-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  showSuggestions
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Show natural language search examples"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Natural Language Recognized Intentions Badge Row */}
        {hasRecognizedIntentions && parsedCriteria && (
          <div className="flex items-center gap-1.5 flex-wrap bg-indigo-50/70 border border-indigo-100/80 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-900 animate-in fade-in duration-150">
            <span className="font-semibold flex items-center gap-1 text-indigo-700 shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Interpreted:</span>
            </span>
            {parsedCriteria.recognizedIntentions.map((intent, idx) => (
              <span
                key={idx}
                className="inline-flex items-center bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-800 font-medium shadow-2xs text-[10px]"
              >
                {intent}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-indigo-400 font-medium">
              Offline local search
            </span>
          </div>
        )}

        {/* Natural Language Suggestion Drawer */}
        {showSuggestions && !filter.searchQuery.trim() && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <div className="flex items-center gap-1 text-slate-700">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Try everyday natural-language queries:</span>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-slate-400 hover:text-slate-600 text-[10px]"
              >
                Dismiss
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {NATURAL_LANGUAGE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleApplySuggestion(suggestion)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 transition font-medium cursor-pointer shadow-2xs"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {types.map((t) => {
            const isSelected = filter.selectedType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTypeSelect(t.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={() =>
                onFilterChange({ searchQuery: '', selectedType: 'all', selectedTag: null })
              }
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 shrink-0 font-medium ml-auto cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Tag Chips Row (if any tags exist) */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <div className="flex items-center text-[11px] text-slate-400 font-medium shrink-0 mr-1">
              <TagIcon className="w-3 h-3 mr-1" />
              <span>Tags:</span>
            </div>
            {availableTags.map((tag) => {
              const isSelected = filter.selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-medium transition shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

FilterChipBar.displayName = 'FilterChipBar';
