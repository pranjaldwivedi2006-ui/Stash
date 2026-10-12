import React from 'react';
import { ScreenTab } from '../types/stash';
import { Inbox, FolderKanban, Archive, Plus, Code2 } from 'lucide-react';

interface BottomNavigationBarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  onOpenAddModal: () => void;
  inboxCount: number;
  collectionsCount?: number;
  archivedCount: number;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddModal,
  inboxCount,
  collectionsCount = 0,
  archivedCount,
}) => {
  return (
    <div className="bg-white border-t border-slate-200/90 px-2 sm:px-3 py-1.5 shrink-0 flex items-center justify-around z-20 shadow-md">
      {/* Inbox Tab */}
      <button
        onClick={() => onSelectTab('inbox')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
          currentTab === 'inbox'
            ? 'text-indigo-600 font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-full ${currentTab === 'inbox' ? 'bg-indigo-100/80' : ''}`}>
          <Inbox className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] sm:text-[11px] mt-0.5">Inbox</span>
        {inboxCount > 0 && (
          <span className="absolute top-0 right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-indigo-600 text-[9px] text-white flex items-center justify-center font-bold">
            {inboxCount > 99 ? '99+' : inboxCount}
          </span>
        )}
      </button>

      {/* Collections Tab */}
      <button
        onClick={() => onSelectTab('collections')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
          currentTab === 'collections'
            ? 'text-indigo-600 font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-full ${currentTab === 'collections' ? 'bg-indigo-100/80' : ''}`}>
          <FolderKanban className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] sm:text-[11px] mt-0.5">Collections</span>
        {collectionsCount > 0 && (
          <span className="absolute top-0 right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-purple-600 text-[9px] text-white flex items-center justify-center font-bold">
            {collectionsCount}
          </span>
        )}
      </button>

      {/* Floating Action Button (New Stash) */}
      <button
        onClick={onOpenAddModal}
        className="w-11 h-11 -mt-4 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-300 transition-all cursor-pointer ring-4 ring-white shrink-0"
        title="Add new Stash item"
      >
        <Plus className="w-5.5 h-5.5 stroke-[2.5]" />
      </button>

      {/* Archived Tab */}
      <button
        onClick={() => onSelectTab('archived')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
          currentTab === 'archived'
            ? 'text-indigo-600 font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-full ${currentTab === 'archived' ? 'bg-indigo-100/80' : ''}`}>
          <Archive className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] sm:text-[11px] mt-0.5">Archived</span>
        {archivedCount > 0 && (
          <span className="absolute top-0 right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-slate-500 text-[9px] text-white flex items-center justify-center font-bold">
            {archivedCount}
          </span>
        )}
      </button>

      {/* Android Kotlin Code Tab */}
      <button
        onClick={() => onSelectTab('code')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
          currentTab === 'code'
            ? 'text-indigo-600 font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-full ${currentTab === 'code' ? 'bg-indigo-100/80' : ''}`}>
          <Code2 className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] sm:text-[11px] mt-0.5">Code</span>
      </button>
    </div>
  );
};
