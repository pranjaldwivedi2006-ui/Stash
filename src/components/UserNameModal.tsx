import React, { useState, useEffect } from 'react';
import { X, User, Check, Sparkles } from 'lucide-react';

interface UserNameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSaveName: (name: string) => void;
}

export const UserNameModal: React.FC<UserNameModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onSaveName,
}) => {
  const [nameInput, setNameInput] = useState(currentName);

  useEffect(() => {
    setNameInput(currentName);
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveName(nameInput.trim());
    onClose();
  };

  const handleClear = () => {
    setNameInput('');
    onSaveName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Personalize Stash
              </h2>
              <p className="text-xs text-slate-400">
                Stored strictly on your device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              What should Stash call you?
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={32}
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              No account, sign-in, or internet connection required. Leave empty for a warm nameless greeting.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {currentName ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Clear Name
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
