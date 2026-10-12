import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StashItem, StashCollection, ScreenTab, FilterState, ItemType } from './types/stash';
import { stashDb } from './data/db';
import { AndroidPhoneFrame } from './components/AndroidPhoneFrame';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavigationBar } from './components/BottomNavigationBar';
import { FilterChipBar } from './components/FilterChipBar';
import { StashCard } from './components/StashCard';
import { EmptyState } from './components/EmptyState';
import { AddEditModal } from './components/AddEditModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { CollectionsView } from './components/CollectionsView';
import { AssignCollectionsModal } from './components/AssignCollectionsModal';
import { AndroidCodeViewer } from './components/AndroidCodeViewer';
import { RestartSimulationModal } from './components/RestartSimulationModal';
import { HomeGreetingCard } from './components/HomeGreetingCard';
import { UserNameModal } from './components/UserNameModal';
import { parseNaturalLanguageQuery, filterItemsByNaturalLanguage } from './utils/naturalLanguageSearch';
import { CheckCircle2, AlertCircle, Pin } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<StashItem[]>([]);
  const [collections, setCollections] = useState<StashCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<ScreenTab>('inbox');
  const [isDeviceMode, setIsDeviceMode] = useState<boolean>(true);

  // User name personalization (stored device-side in localStorage)
  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('stash_user_name') || '';
    } catch {
      return '';
    }
  });
  const [isUserNameModalOpen, setIsUserNameModalOpen] = useState(false);

  // Stable session seed for contextual home message
  const sessionSeed = useMemo(() => Math.floor(Math.random() * 1000), []);

  // Timer interval to keep time-of-day greeting fresh if session spans hours
  const [, setTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Quick Action initial item type
  const [addModalInitialType, setAddModalInitialType] = useState<ItemType>('note');

  // Search input ref to allow focusing from quick action button
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters & Search
  const [filter, setFilter] = useState<FilterState>({
    searchQuery: '',
    selectedType: 'all',
    selectedTag: null,
  });

  // Modal dialog states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StashItem | null>(null);
  const [detailItem, setDetailItem] = useState<StashItem | null>(null);
  const [collectionToAssignItem, setCollectionToAssignItem] = useState<StashItem | null>(null);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  // User notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  // Initial load from persistent SQLite / IndexedDB
  const refreshData = useCallback(async () => {
    try {
      await stashDb.seedStarterItemsIfEmpty();
      const [allItems, allCols] = await Promise.all([
        stashDb.getAll(),
        stashDb.getAllCollections(),
      ]);
      setItems(allItems);
      setCollections(allCols);
      return allItems.length;
    } catch (err) {
      console.error('Failed to load items and collections from local DB:', err);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Save (Create or Update) Item
  const handleSaveItem = async (
    itemData: Omit<StashItem, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> & {
      id?: string;
      isPinned?: boolean;
      collectionIds?: string[];
    }
  ) => {
    const now = Date.now();
    let finalItem: StashItem;

    if (itemData.id) {
      // Editing existing item
      const existing = items.find((i) => i.id === itemData.id);
      finalItem = {
        id: itemData.id,
        type: itemData.type,
        title: itemData.title,
        contentOrUrl: itemData.contentOrUrl,
        imageUri: itemData.imageUri,
        tags: itemData.tags,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
        isArchived: existing ? existing.isArchived : false,
        isPinned:
          itemData.isPinned !== undefined
            ? itemData.isPinned
            : Boolean(existing?.isPinned),
        collectionIds:
          itemData.collectionIds !== undefined
            ? itemData.collectionIds
            : existing?.collectionIds || [],
        summary: existing?.summary,
        keyTakeaways: existing?.keyTakeaways,
        summaryGeneratedAt: existing?.summaryGeneratedAt,
        summarySourceNote: existing?.summarySourceNote,
      };
      showToast('Item updated in local storage');
    } else {
      // Creating new item
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `item-${Date.now()}`;
      finalItem = {
        id: newId,
        type: itemData.type,
        title: itemData.title,
        contentOrUrl: itemData.contentOrUrl,
        imageUri: itemData.imageUri,
        tags: itemData.tags,
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        isPinned: Boolean(itemData.isPinned),
        collectionIds: itemData.collectionIds || [],
      };
      showToast('Item saved to Stash');
    }

    await stashDb.save(finalItem);
    await refreshData();

    // Update open detail modal if currently viewing this item
    if (detailItem && detailItem.id === finalItem.id) {
      setDetailItem(finalItem);
    }
  };

  // Toggle Pin/Unpin status
  const handleTogglePin = async (item: StashItem) => {
    const updated: StashItem = {
      ...item,
      isPinned: !item.isPinned,
      updatedAt: Date.now(),
    };
    await stashDb.save(updated);
    await refreshData();
    showToast(
      updated.isPinned ? 'Item pinned to top of inbox' : 'Item unpinned from top',
      'info'
    );

    if (detailItem && detailItem.id === item.id) {
      setDetailItem(updated);
    }
  };

  // Toggle Archive status
  const handleToggleArchive = async (item: StashItem) => {
    const updated: StashItem = {
      ...item,
      isArchived: !item.isArchived,
      updatedAt: Date.now(),
    };
    await stashDb.save(updated);
    await refreshData();
    showToast(updated.isArchived ? 'Item archived' : 'Item restored to inbox', 'info');

    if (detailItem && detailItem.id === item.id) {
      setDetailItem(updated);
    }
  };

  // Permanent Delete
  const handleDeleteItem = async (item: StashItem) => {
    await stashDb.delete(item.id);
    await refreshData();
    showToast('Item permanently deleted', 'info');

    if (detailItem && detailItem.id === item.id) {
      setDetailItem(null);
    }
  };

  // Collections Operations
  const handleAddItemToCollection = async (collectionId: string, itemId: string) => {
    await stashDb.addItemToCollection(collectionId, itemId);
    const updated = await stashDb.getById(itemId);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      if (detailItem?.id === itemId) setDetailItem(updated);
    }
    const allCols = await stashDb.getAllCollections();
    setCollections(allCols);
    showToast('Added to collection', 'success');
  };

  const handleRemoveItemFromCollection = async (collectionId: string, itemId: string) => {
    await stashDb.removeItemFromCollection(collectionId, itemId);
    const updated = await stashDb.getById(itemId);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      if (detailItem?.id === itemId) setDetailItem(updated);
    }
    const allCols = await stashDb.getAllCollections();
    setCollections(allCols);
    showToast('Removed from collection (item kept safely)', 'info');
  };

  const handleSetItemCollections = async (itemId: string, selectedCollectionIds: string[]) => {
    const existing = await stashDb.getById(itemId);
    if (!existing) return;
    const updated: StashItem = {
      ...existing,
      collectionIds: selectedCollectionIds,
      updatedAt: Date.now(),
    };
    await stashDb.save(updated);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    if (detailItem?.id === itemId) setDetailItem(updated);
    showToast(
      selectedCollectionIds.length > 0
        ? `Saved to ${selectedCollectionIds.length} collection${selectedCollectionIds.length === 1 ? '' : 's'}`
        : 'Removed from all collections',
      'success'
    );
  };

  const handleCreateCollection = async (name: string, description?: string): Promise<StashCollection> => {
    const newCol: StashCollection = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}`,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await stashDb.saveCollection(newCol);
    const allCols = await stashDb.getAllCollections();
    setCollections(allCols);
    showToast(`Collection "${name}" created`, 'success');
    return newCol;
  };

  const handleRenameCollection = async (id: string, newName: string, newDescription?: string) => {
    const existing = await stashDb.getCollectionById(id);
    if (!existing) return;
    const updated: StashCollection = {
      ...existing,
      name: newName,
      description: newDescription,
      updatedAt: Date.now(),
    };
    await stashDb.saveCollection(updated);
    const allCols = await stashDb.getAllCollections();
    setCollections(allCols);
    showToast('Collection renamed', 'success');
  };

  const handleDeleteCollection = async (id: string) => {
    await stashDb.deleteCollection(id);
    const [allItems, allCols] = await Promise.all([
      stashDb.getAll(),
      stashDb.getAllCollections(),
    ]);
    setItems(allItems);
    setCollections(allCols);
    if (detailItem) {
      const refreshed = allItems.find((i) => i.id === detailItem.id) || null;
      setDetailItem(refreshed);
    }
    showToast('Collection deleted (saved items kept safely)', 'info');
  };

  const handleBatchApplySuggestions = async (
    suggestions: Array<{ name: string; description?: string; itemIds: string[] }>
  ) => {
    for (const sug of suggestions) {
      const colId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}-${Math.random()}`;
      const col: StashCollection = {
        id: colId,
        name: sug.name,
        description: sug.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await stashDb.saveCollection(col);
      for (const itemId of sug.itemIds) {
        await stashDb.addItemToCollection(colId, itemId);
      }
    }
    const [allItems, allCols] = await Promise.all([
      stashDb.getAll(),
      stashDb.getAllCollections(),
    ]);
    setItems(allItems);
    setCollections(allCols);
    showToast(`Created ${suggestions.length} collections with AI`, 'success');
  };

  // Update AI Summary for an item and persist locally
  const handleUpdateSummary = async (
    itemId: string,
    summary: string | undefined,
    keyTakeaways?: string[],
    summarySourceNote?: string
  ) => {
    const existing = items.find((i) => i.id === itemId);
    if (!existing) return;

    const updated: StashItem = {
      ...existing,
      summary,
      keyTakeaways: summary ? keyTakeaways : undefined,
      summaryGeneratedAt: summary ? Date.now() : undefined,
      summarySourceNote: summary ? summarySourceNote : undefined,
      updatedAt: Date.now(),
    };

    await stashDb.save(updated);
    await refreshData();

    if (summary) {
      showToast('AI Summary saved to local storage', 'success');
    } else {
      showToast('AI Summary removed', 'info');
    }

    if (detailItem && detailItem.id === itemId) {
      setDetailItem(updated);
    }
  };

  // Simulate killing app and restarting
  const handleSimulateRestart = async (): Promise<number> => {
    setItems([]); // Clear React volatile memory
    setCollections([]);
    setIsLoading(true);
    const count = await refreshData();
    showToast(`Rebooted: ${count} items loaded from persistent storage`, 'success');
    return count;
  };

  // User name personalization handler
  const handleSaveUserName = (name: string) => {
    const trimmed = name.trim();
    setUserName(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem('stash_user_name', trimmed);
        showToast(`Nice to meet you, ${trimmed}!`, 'success');
      } else {
        localStorage.removeItem('stash_user_name');
        showToast('Greeting set to friendly nameless mode', 'info');
      }
    } catch (e) {
      console.warn('Failed to save user name to local storage:', e);
    }
  };

  // Quick Action handler from Home Greeting Card
  const handleHomeQuickAction = (action: 'note' | 'link' | 'image' | 'search') => {
    if (action === 'search') {
      searchInputRef.current?.focus();
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setItemToEdit(null);
      setAddModalInitialType(action);
      setIsAddEditOpen(true);
    }
  };

  // Unique tags across all items
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => {
      item.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  // Counts
  const inboxCount = useMemo(() => items.filter((i) => !i.isArchived).length, [items]);
  const archivedCount = useMemo(() => items.filter((i) => i.isArchived).length, [items]);

  // Natural language query interpretation
  const parsedCriteria = useMemo(() => {
    if (!filter.searchQuery.trim()) return null;
    return parseNaturalLanguageQuery(filter.searchQuery, availableTags);
  }, [filter.searchQuery, availableTags]);

  // Filtered lists with natural language search & ranking
  const filterList = useCallback(
    (itemList: StashItem[], options?: { forceArchived?: boolean; forceInbox?: boolean }) => {
      let candidateList = itemList;

      // 1. Natural language query filtering and relevance ranking
      if (parsedCriteria && filter.searchQuery.trim() !== '') {
        const { matchedItems } = filterItemsByNaturalLanguage(candidateList, parsedCriteria, {
          forceInboxOnly: options?.forceInbox,
          forceArchivedOnly: options?.forceArchived,
        });
        candidateList = matchedItems;
      }

      // 2. Strict UI Chip Filters (if user explicitly pressed chips)
      return candidateList.filter((item) => {
        // Manual Type Chip
        if (filter.selectedType !== 'all' && item.type !== filter.selectedType) {
          return false;
        }
        // Manual Tag Chip
        if (filter.selectedTag !== null && !item.tags.includes(filter.selectedTag)) {
          return false;
        }
        return true;
      });
    },
    [filter, parsedCriteria]
  );

  const displayedInboxItems = useMemo(
    () => filterList(items.filter((i) => !i.isArchived), { forceInbox: true }),
    [items, filterList]
  );

  const pinnedInboxItems = useMemo(
    () => displayedInboxItems.filter((i) => Boolean(i.isPinned)),
    [displayedInboxItems]
  );

  const regularInboxItems = useMemo(
    () => displayedInboxItems.filter((i) => !i.isPinned),
    [displayedInboxItems]
  );

  const displayedArchivedItems = useMemo(
    () => filterList(items.filter((i) => i.isArchived), { forceArchived: true }),
    [items, filterList]
  );

  const isFiltered =
    filter.searchQuery.trim() !== '' ||
    filter.selectedType !== 'all' ||
    filter.selectedTag !== null;

  return (
    <AndroidPhoneFrame
      isDeviceMode={isDeviceMode}
      onToggleMode={() => setIsDeviceMode(!isDeviceMode)}
    >
      <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
        {/* Top App Bar */}
        <TopAppBar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          inboxCount={inboxCount}
          collectionsCount={collections.length}
          archivedCount={archivedCount}
          userName={userName}
          onOpenNameModal={() => setIsUserNameModalOpen(true)}
          onSimulateRestart={() => setIsRestartModalOpen(true)}
        />

        {/* Content Area */}
        {currentTab === 'code' ? (
          <AndroidCodeViewer />
        ) : currentTab === 'collections' ? (
          <CollectionsView
            collections={collections}
            items={items}
            onCreateCollection={handleCreateCollection}
            onRenameCollection={handleRenameCollection}
            onDeleteCollection={handleDeleteCollection}
            onAddItemToCollection={handleAddItemToCollection}
            onRemoveItemFromCollection={handleRemoveItemFromCollection}
            onBatchApplySuggestions={handleBatchApplySuggestions}
            onSelectItem={(selected) => setDetailItem(selected)}
            onEditItem={(selected) => {
              setItemToEdit(selected);
              setIsAddEditOpen(true);
            }}
            onToggleArchive={handleToggleArchive}
            onTogglePin={handleTogglePin}
            onDeleteItem={handleDeleteItem}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search and Filters Header */}
            <FilterChipBar
              ref={searchInputRef}
              filter={filter}
              onFilterChange={setFilter}
              availableTags={availableTags}
              parsedCriteria={parsedCriteria}
            />

            {/* Items Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-medium">
                  Loading persistent storage...
                </div>
              ) : currentTab === 'inbox' ? (
                <>
                  {/* Conversational Home Screen & Personalized Greeting Card */}
                  {!isFiltered && (
                    <HomeGreetingCard
                      userName={userName}
                      itemCount={inboxCount}
                      pinnedCount={pinnedInboxItems.length}
                      sessionSeed={sessionSeed}
                      onOpenNameModal={() => setIsUserNameModalOpen(true)}
                      onQuickAction={handleHomeQuickAction}
                    />
                  )}

                  {displayedInboxItems.length > 0 ? (
                    <div className="space-y-4">
                      {/* Dedicated Pinned Section */}
                      {pinnedInboxItems.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between px-1 pt-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase">
                              <Pin className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600 rotate-45" />
                              <span>Pinned</span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200/80 px-1.5 py-0.2 rounded-full">
                                {pinnedInboxItems.length}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              Pinned to top
                            </span>
                          </div>
                          <div className="space-y-3">
                            {pinnedInboxItems.map((item) => (
                              <StashCard
                                key={item.id}
                                item={item}
                                collections={collections}
                                onSelect={(selected) => setDetailItem(selected)}
                                onEdit={(selected) => {
                                  setItemToEdit(selected);
                                  setIsAddEditOpen(true);
                                }}
                                onToggleArchive={handleToggleArchive}
                                onTogglePin={handleTogglePin}
                                onDelete={handleDeleteItem}
                                onTagClick={(tag) => setFilter((f) => ({ ...f, selectedTag: tag }))}
                                onCollectionClick={() => setCurrentTab('collections')}
                                onManageCollections={(selected) => setCollectionToAssignItem(selected)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Regular Saved Items Section */}
                      {regularInboxItems.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          {pinnedInboxItems.length > 0 && (
                            <div className="flex items-center justify-between px-1 pt-2 border-t border-slate-200/80">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 tracking-wide uppercase">
                                <span>Other Items</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  ({regularInboxItems.length})
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="space-y-3">
                            {regularInboxItems.map((item) => (
                              <StashCard
                                key={item.id}
                                item={item}
                                collections={collections}
                                onSelect={(selected) => setDetailItem(selected)}
                                onEdit={(selected) => {
                                  setItemToEdit(selected);
                                  setIsAddEditOpen(true);
                                }}
                                onToggleArchive={handleToggleArchive}
                                onTogglePin={handleTogglePin}
                                onDelete={handleDeleteItem}
                                onTagClick={(tag) => setFilter((f) => ({ ...f, selectedTag: tag }))}
                                onCollectionClick={() => setCurrentTab('collections')}
                                onManageCollections={(selected) => setCollectionToAssignItem(selected)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      currentTab="inbox"
                      isFiltered={isFiltered}
                      searchQuery={filter.searchQuery}
                      onSelectSuggestion={(query) =>
                        setFilter((f) => ({ ...f, searchQuery: query }))
                      }
                      onOpenAddModal={(type) => {
                        setItemToEdit(null);
                        setAddModalInitialType(type || 'note');
                        setIsAddEditOpen(true);
                      }}
                      onClearFilter={() =>
                        setFilter({ searchQuery: '', selectedType: 'all', selectedTag: null })
                      }
                    />
                  )}
                </>
              ) : displayedArchivedItems.length > 0 ? (
                displayedArchivedItems.map((item) => (
                  <StashCard
                    key={item.id}
                    item={item}
                    collections={collections}
                    onSelect={(selected) => setDetailItem(selected)}
                    onEdit={(selected) => {
                      setItemToEdit(selected);
                      setIsAddEditOpen(true);
                    }}
                    onToggleArchive={handleToggleArchive}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDeleteItem}
                    onTagClick={(tag) => setFilter((f) => ({ ...f, selectedTag: tag }))}
                    onCollectionClick={() => setCurrentTab('collections')}
                    onManageCollections={(selected) => setCollectionToAssignItem(selected)}
                  />
                ))
              ) : (
                <EmptyState
                  currentTab="archived"
                  isFiltered={isFiltered}
                  searchQuery={filter.searchQuery}
                  onSelectSuggestion={(query) =>
                    setFilter((f) => ({ ...f, searchQuery: query }))
                  }
                  onOpenAddModal={(type) => {
                    setItemToEdit(null);
                    setAddModalInitialType(type || 'note');
                    setIsAddEditOpen(true);
                  }}
                  onClearFilter={() =>
                    setFilter({ searchQuery: '', selectedType: 'all', selectedTag: null })
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <BottomNavigationBar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAddModal={() => {
            setItemToEdit(null);
            setIsAddEditOpen(true);
          }}
          inboxCount={inboxCount}
          collectionsCount={collections.length}
          archivedCount={archivedCount}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Add/Edit Modal */}
        <AddEditModal
          isOpen={isAddEditOpen}
          itemToEdit={itemToEdit}
          initialType={addModalInitialType}
          collections={collections}
          onClose={() => {
            setIsAddEditOpen(false);
            setItemToEdit(null);
          }}
          onSave={handleSaveItem}
          availableTags={availableTags}
        />

        {/* User Name Personalization Modal */}
        <UserNameModal
          isOpen={isUserNameModalOpen}
          currentName={userName}
          onClose={() => setIsUserNameModalOpen(false)}
          onSaveName={handleSaveUserName}
        />

        {/* Detail Modal */}
        <ItemDetailModal
          item={detailItem}
          collections={collections}
          onClose={() => setDetailItem(null)}
          onEdit={(selected) => {
            setItemToEdit(selected);
            setIsAddEditOpen(true);
          }}
          onToggleArchive={handleToggleArchive}
          onTogglePin={handleTogglePin}
          onDelete={handleDeleteItem}
          onUpdateItemSummary={handleUpdateSummary}
          onAddItemToCollection={handleAddItemToCollection}
          onRemoveItemFromCollection={handleRemoveItemFromCollection}
          onSetItemCollections={handleSetItemCollections}
          onCreateCollection={handleCreateCollection}
          onOpenCollection={() => setCurrentTab('collections')}
        />

        {/* Quick Assign Collections Modal from Card or Action */}
        <AssignCollectionsModal
          isOpen={Boolean(collectionToAssignItem)}
          item={collectionToAssignItem}
          collections={collections}
          onClose={() => setCollectionToAssignItem(null)}
          onConfirm={async (itemId, selectedIds) => {
            await handleSetItemCollections(itemId, selectedIds);
            setCollectionToAssignItem(null);
          }}
          onCreateCollection={handleCreateCollection}
        />

        {/* Restart / Persistence Test Modal */}
        <RestartSimulationModal
          isOpen={isRestartModalOpen}
          onClose={() => setIsRestartModalOpen(false)}
          onSimulateRestart={handleSimulateRestart}
        />
      </div>
    </AndroidPhoneFrame>
  );
}
