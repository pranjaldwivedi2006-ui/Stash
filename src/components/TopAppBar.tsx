import React from 'react';
import { ScreenTab } from '../types/stash';
import { Inbox, Code, RefreshCw, FolderArchive, FolderKanban, Sparkles } from 'lucide-react';

interface TopAppBarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  inboxCount: number;
  collectionsCount?: number;
  archivedCount: number;
  onSimulateRestart: () => void;
  userName?: string;
  onOpenNameModal?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTab,
  onSelectTab,
  inboxCount,
  collectionsCount = 0,
  archivedCount,
  onSimulateRestart,
  userName = '',
  onOpenNameModal,
}) => {
  const getTitle = () => {
    switch (currentTab) {
      case 'inbox':
        return 'Stash Inbox';
      case 'collections':
        return 'AI Collections';
      case 'archived':
        return 'Archived Stash';
      case 'code':
        return 'Android Kotlin & Room';
      default:
        return 'Stash';
    }
  };

  const getSubtitle = () => {
    switch (currentTab) {
      case 'inbox':
        return `${inboxCount} saved ${inboxCount === 1 ? 'item' : 'items'}`;
      case 'collections':
        return `${collectionsCount} active ${collectionsCount === 1 ? 'collection' : 'collections'}`;
      case 'archived':
        return `${archivedCount} archived ${archivedCount === 1 ? 'item' : 'items'}`;
      case 'code':
        return 'Jetpack Compose & Room SQLite';
      default:
        return '';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 py-3 shrink-0 flex items-center justify-between shadow-xs sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
          {currentTab === 'inbox' && <Inbox className="w-5 h-5" />}
          {currentTab === 'collections' && <FolderKanban className="w-5 h-5" />}
          {currentTab === 'archived' && <FolderArchive className="w-5 h-5" />}
          {currentTab === 'code' && <Code className="w-5 h-5" />}
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
            {getTitle()}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {getSubtitle()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {onOpenNameModal && (
          <button
            onClick={onOpenNameModal}
            title={userName ? `Greeting personalized for ${userName} (click to edit)` : 'Personalize greeting name'}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">{userName || 'Set Name'}</span>
          </button>
        )}
        <button
          onClick={onSimulateRestart}
          title="Simulate killing and restarting app to verify persistent storage"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Test Persistence</span>
        </button>
      </div>
    </header>
  );
};
