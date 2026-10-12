import React, { useState, useMemo } from 'react';
import { StashItem, StashCollection, SuggestedCollection } from '../types/stash';
import {
  FolderKanban,
  FolderPlus,
  Sparkles,
  Search,
  Edit2,
  Trash2,
  ArrowLeft,
  Plus,
  MinusCircle,
  FileText,
  Link2,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  Loader2,
  Info,
  Layers,
  ChevronRight,
  Pin,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CollectionsViewProps {
  collections: StashCollection[];
  items: StashItem[];
  onCreateCollection: (name: string, description?: string) => Promise<StashCollection>;
  onRenameCollection: (id: string, newName: string, newDescription?: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onAddItemToCollection: (collectionId: string, itemId: string) => Promise<void>;
  onRemoveItemFromCollection: (collectionId: string, itemId: string) => Promise<void>;
  onBatchApplySuggestions: (
    suggestions: Array<{ name: string; description?: string; itemIds: string[] }>
  ) => Promise<void>;
  onSelectItem: (item: StashItem) => void;
  onEditItem: (item: StashItem) => void;
  onToggleArchive: (item: StashItem) => void;
  onTogglePin: (item: StashItem) => void;
  onDeleteItem: (item: StashItem) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  items,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onAddItemToCollection,
  onRemoveItemFromCollection,
  onBatchApplySuggestions,
  onSelectItem,
  onEditItem,
  onToggleArchive,
  onTogglePin,
  onDeleteItem,
}) => {
  // Selected collection for detail view
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Search in collections
  const [collectionSearch, setCollectionSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [createError, setCreateError] = useState('');

  const [editingCollection, setEditingCollection] = useState<StashCollection | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColDesc, setEditColDesc] = useState('');

  const [collectionToDelete, setCollectionToDelete] = useState<StashCollection | null>(null);

  // Add items picker modal inside Collection Detail
  const [isAddItemsPickerOpen, setIsAddItemsPickerOpen] = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState('');

  // Show archived toggle in collection detail
  const [showArchivedInCollection, setShowArchivedInCollection] = useState(false);

  // AI Collection Suggestions state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiSuggestionsOpen, setIsAiSuggestionsOpen] = useState(false);
  const [suggestedClusters, setSuggestedClusters] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      itemIds: string[];
      selected: boolean;
    }>
  >([]);

  // Filtered collections
  const filteredCollections = useMemo(() => {
    if (!collectionSearch.trim()) return collections;
    const q = collectionSearch.toLowerCase().trim();
    return collections.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
    );
  }, [collections, collectionSearch]);

  // Selected collection object
  const currentCollection = useMemo(() => {
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  // Items in selected collection
  const itemsInCurrentCollection = useMemo(() => {
    if (!selectedCollectionId) return [];
    return items.filter((item) => {
      const inCol = item.collectionIds?.includes(selectedCollectionId);
      if (!inCol) return false;
      if (!showArchivedInCollection && item.isArchived) return false;
      return true;
    });
  }, [items, selectedCollectionId, showArchivedInCollection]);

  // Count of items per collection
  const collectionItemCounts = useMemo(() => {
    const map = new Map<string, { total: number; active: number; archived: number }>();
    collections.forEach((c) => map.set(c.id, { total: 0, active: 0, archived: 0 }));

    items.forEach((item) => {
      item.collectionIds?.forEach((cId) => {
        const stats = map.get(cId);
        if (stats) {
          stats.total += 1;
          if (item.isArchived) stats.archived += 1;
          else stats.active += 1;
        }
      });
    });
    return map;
  }, [collections, items]);

  // Handle Create Collection submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) {
      setCreateError('Collection name is required');
      return;
    }

    // Check duplicate name
    const exists = collections.some(
      (c) => c.name.trim().toLowerCase() === newColName.trim().toLowerCase()
    );
    if (exists) {
      setCreateError('A collection with this name already exists');
      return;
    }

    try {
      const created = await onCreateCollection(newColName.trim(), newColDesc.trim());
      setNewColName('');
      setNewColDesc('');
      setCreateError('');
      setIsCreateOpen(false);
      setSelectedCollectionId(created.id);
    } catch (err) {
      setCreateError('Failed to create collection');
    }
  };

  // Handle Edit Collection submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editColName.trim()) return;

    try {
      await onRenameCollection(editingCollection.id, editColName.trim(), editColDesc.trim());
      setEditingCollection(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle AI Suggestions trigger
  const handleTriggerAiSuggestions = async () => {
    if (items.length < 2) {
      setAiError('Please save at least 2 items in Stash first so AI can identify meaningful clusters.');
      setIsAiSuggestionsOpen(true);
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setIsAiSuggestionsOpen(true);

    try {
      const res = await fetch('/api/ai/suggest-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            type: i.type,
            title: i.title,
            tags: i.tags,
            contentOrUrl: i.contentOrUrl,
          })),
          existingCollections: collections.map((c) => ({
            id: c.id,
            name: c.name,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiError(
          data.error ||
            'AI service unavailable. Please check backend secrets configuration.'
        );
        setSuggestedClusters([]);
      } else {
        const clusters = (data.suggestedCollections || []).map(
          (c: SuggestedCollection, index: number) => ({
            id: `sug-${Date.now()}-${index}`,
            name: c.name,
            description: c.description || '',
            itemIds: Array.isArray(c.itemIds) ? c.itemIds : [],
            selected: true,
          })
        );
        setSuggestedClusters(clusters);
      }
    } catch (err: unknown) {
      console.error('Error fetching AI collection suggestions:', err);
      setAiError('Could not reach AI service. Please verify your connection and server.');
      setSuggestedClusters([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Apply single approved suggestion
  const handleAcceptSingleSuggestion = async (sugId: string) => {
    const sug = suggestedClusters.find((s) => s.id === sugId);
    if (!sug) return;

    await onBatchApplySuggestions([
      {
        name: sug.name.trim(),
        description: sug.description?.trim(),
        itemIds: sug.itemIds,
      },
    ]);

    setSuggestedClusters((prev) => prev.filter((s) => s.id !== sugId));
    if (suggestedClusters.length <= 1) {
      setIsAiSuggestionsOpen(false);
    }
  };

  // Apply all selected suggestions
  const handleAcceptAllSuggestions = async () => {
    const toApply = suggestedClusters
      .filter((s) => s.selected && s.name.trim().length > 0 && s.itemIds.length > 0)
      .map((s) => ({
        name: s.name.trim(),
        description: s.description?.trim(),
        itemIds: s.itemIds,
      }));

    if (toApply.length > 0) {
      await onBatchApplySuggestions(toApply);
    }
    setIsAiSuggestionsOpen(false);
    setSuggestedClusters([]);
  };

  // --------------------------------------------------------------------------
  // RENDER: COLLECTION DETAIL VIEW
  // --------------------------------------------------------------------------
  if (selectedCollectionId && currentCollection) {
    const stats = collectionItemCounts.get(currentCollection.id) || {
      total: 0,
      active: 0,
      archived: 0,
    };

    // Candidates to add to this collection
    const unassociatedItems = items.filter(
      (i) => !i.collectionIds?.includes(currentCollection.id)
    );
    const filteredUnassociated = unassociatedItems.filter((i) => {
      if (!itemPickerSearch.trim()) return true;
      const q = itemPickerSearch.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.contentOrUrl.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    return (
      <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
        {/* Collection Header Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              onClick={() => setSelectedCollectionId(null)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer shrink-0"
              title="Back to all collections"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {currentCollection.name}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
                  {stats.active} {stats.active === 1 ? 'item' : 'items'}
                </span>
              </div>
              {currentCollection.description && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {currentCollection.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => {
                setEditingCollection(currentCollection);
                setEditColName(currentCollection.name);
                setEditColDesc(currentCollection.description || '');
              }}
              className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
              title="Rename collection"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCollectionToDelete(currentCollection)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
              title="Delete collection (items will not be deleted)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action subheader */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            onClick={() => {
              setItemPickerSearch('');
              setIsAddItemsPickerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Items to Collection</span>
          </button>

          {stats.archived > 0 && (
            <button
              onClick={() => setShowArchivedInCollection(!showArchivedInCollection)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                showArchivedInCollection
                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {showArchivedInCollection ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide Archived ({stats.archived})</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>Show Archived ({stats.archived})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Collection items list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {itemsInCurrentCollection.length > 0 ? (
            itemsInCurrentCollection.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="group bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-sm transition cursor-pointer relative"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                        item.type === 'note'
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : item.type === 'link'
                          ? 'bg-sky-50 border-sky-200 text-sky-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      {item.type === 'note' && <FileText className="w-3 h-3" />}
                      {item.type === 'link' && <Link2 className="w-3 h-3" />}
                      {item.type === 'image' && <ImageIcon className="w-3 h-3" />}
                      <span>{item.type}</span>
                    </span>

                    {item.isArchived && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                        Archived
                      </span>
                    )}

                    {item.isPinned && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Pin className="w-2.5 h-2.5 fill-indigo-600 rotate-45" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>

                  {/* Actions for this item in collection */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onRemoveItemFromCollection(currentCollection.id, item.id)}
                      title="Remove from this collection (item remains in Stash)"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1 mb-1">
                  {item.title}
                </h3>

                {item.contentOrUrl && item.type === 'note' && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2">
                    {item.contentOrUrl}
                  </p>
                )}

                {item.contentOrUrl && item.type === 'link' && (
                  <p className="text-xs text-sky-600 truncate bg-sky-50/70 p-1.5 rounded-lg border border-sky-100 font-mono mb-2">
                    {item.contentOrUrl}
                  </p>
                )}

                {item.imageUri && item.type === 'image' && (
                  <div className="rounded-xl overflow-hidden bg-slate-100 max-h-32 mb-2 flex items-center justify-center">
                    <img src={item.imageUri} alt={item.title} className="w-full h-28 object-cover" />
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-500 mb-3">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No items in this collection</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Add existing saved notes, links, or photos to organize them into {currentCollection.name}.
              </p>
              <button
                onClick={() => {
                  setItemPickerSearch('');
                  setIsAddItemsPickerOpen(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Items Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Add Items Picker Modal */}
        {isAddItemsPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Items to {currentCollection.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select items to link into this collection
                  </p>
                </div>
                <button
                  onClick={() => setIsAddItemsPickerOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search filter for picker */}
              <div className="p-3 border-b border-slate-200">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={itemPickerSearch}
                    onChange={(e) => setItemPickerSearch(e.target.value)}
                    placeholder="Search saved items..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items scroll list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredUnassociated.length > 0 ? (
                  filteredUnassociated.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-300 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-semibold uppercase text-slate-500">
                            {item.type}
                          </span>
                          {item.isArchived && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Archived
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        {item.contentOrUrl && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.contentOrUrl}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await onAddItemToCollection(currentCollection.id, item.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-semibold border border-indigo-200 transition cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">
                    {unassociatedItems.length === 0
                      ? 'All current saved items already belong to this collection.'
                      : 'No items match your search filter.'}
                  </p>
                )}
              </div>

              <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddItemsPickerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ALL COLLECTIONS LIST VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Action & Search Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Collections ({collections.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Suggest Collections Action */}
            <button
              onClick={handleTriggerAiSuggestions}
              disabled={isAiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Group items automatically into meaningful collections"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Suggest with AI</span>
                </>
              )}
            </button>

            {/* Manual New Collection */}
            <button
              onClick={() => {
                setNewColName('');
                setNewColDesc('');
                setCreateError('');
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={collectionSearch}
            onChange={(e) => setCollectionSearch(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-slate-900 outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Collections Grid / List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {filteredCollections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCollections.map((col) => {
              const stats = collectionItemCounts.get(col.id) || {
                total: 0,
                active: 0,
                archived: 0,
              };

              // Preview 2 items in this collection
              const previewItems = items
                .filter((i) => i.collectionIds?.includes(col.id) && !i.isArchived)
                .slice(0, 2);

              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className="group bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Icon + Name + Actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <FolderKanban className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                          {col.name}
                        </h3>
                      </div>

                      <div
                        className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingCollection(col);
                            setEditColName(col.name);
                            setEditColDesc(col.description || '');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Rename collection"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCollectionToDelete(col)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete collection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {col.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2.5">
                        {col.description}
                      </p>
                    )}

                    {/* Preview snippets */}
                    {previewItems.length > 0 && (
                      <div className="space-y-1 mb-3 pt-1 border-t border-slate-100">
                        {previewItems.map((pi) => (
                          <div
                            key={pi.id}
                            className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            <span className="truncate">{pi.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer with count */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {stats.total} {stats.total === 1 ? 'item' : 'items'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium group-hover:translate-x-0.5 transition">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 mb-3.5 shadow-2xs">
              <FolderKanban className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {collectionSearch ? 'No matching collections' : 'No collections yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
              {collectionSearch
                ? `No collections match "${collectionSearch}". Try clearing your search.`
                : 'Collections allow you to group related notes, links, and pictures together (e.g. "C Programming", "Career Resources", "Hackathon Ideas").'}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => {
                  setNewColName('');
                  setNewColDesc('');
                  setCreateError('');
                  setIsCreateOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Collection</span>
              </button>
              <button
                onClick={handleTriggerAiSuggestions}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Suggest with AI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: CREATE COLLECTION */}
      {/* ---------------------------------------------------------------------- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Create New Collection</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Collection Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => {
                    setNewColName(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  placeholder="e.g. C Programming, Career Resources, Hackathon Ideas"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-indigo-500"
                  autoFocus
                />
                {createError && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{createError}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Short description or purpose for this collection..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: EDIT / RENAME COLLECTION */}
      {/* ---------------------------------------------------------------------- */}
      {editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Rename Collection</h3>
              <button
                onClick={() => setEditingCollection(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Collection Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editColName}
                  onChange={(e) => setEditColName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={editColDesc}
                  onChange={(e) => setEditColDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editColName.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: DELETE COLLECTION CONFIRMATION */}
      {/* ---------------------------------------------------------------------- */}
      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Delete &ldquo;{collectionToDelete.name}&rdquo;?
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                This will remove the collection. <strong>Your saved items will NOT be deleted</strong> and will remain safely stored in your inbox.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCollectionToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = collectionToDelete.id;
                  setCollectionToDelete(null);
                  if (selectedCollectionId === id) setSelectedCollectionId(null);
                  await onDeleteCollection(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: AI COLLECTION SUGGESTIONS REVIEW */}
      {/* ---------------------------------------------------------------------- */}
      {isAiSuggestionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    AI Suggested Collections
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and customize clusters before creating them
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiSuggestionsOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isAiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                  <p className="text-xs font-bold text-slate-800">
                    Clustering your items with Gemini AI...
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Analyzing titles, tags, and content to identify logical groups like Programming, Resources, or Ideas.
                  </p>
                </div>
              ) : aiError ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">AI Collections Notice</span>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">{aiError}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700 pt-1">
                    You can always create and organize collections manually using the &ldquo;+ New&rdquo; button.
                  </p>
                </div>
              ) : suggestedClusters.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Gemini identified {suggestedClusters.length} potential collection clusters from your saved items. You can rename, edit, or selectively apply them below:
                  </p>

                  {suggestedClusters.map((cluster) => {
                    const clusterItems = items.filter((i) => cluster.itemIds.includes(i.id));

                    return (
                      <div
                        key={cluster.id}
                        className="rounded-2xl border border-purple-200 bg-purple-50/30 p-4 space-y-3"
                      >
                        {/* Editable Name & Toggle */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                              Suggested Collection Name
                            </label>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {cluster.itemIds.length} {cluster.itemIds.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={cluster.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSuggestedClusters((prev) =>
                                prev.map((s) => (s.id === cluster.id ? { ...s, name: val } : s))
                              );
                            }}
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 rounded-xl border border-purple-200 bg-white outline-none focus:border-purple-500"
                          />
                        </div>

                        {cluster.description && (
                          <p className="text-xs text-slate-600 italic">
                            &ldquo;{cluster.description}&rdquo;
                          </p>
                        )}

                        {/* Items in this cluster */}
                        <div className="space-y-1.5 pt-1 border-t border-purple-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Items to include:
                          </p>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {clusterItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[9px] uppercase font-bold text-slate-400">
                                    {item.type}
                                  </span>
                                  <span className="truncate font-medium">{item.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Remove this item from cluster
                                    setSuggestedClusters((prev) =>
                                      prev.map((s) =>
                                        s.id === cluster.id
                                          ? {
                                              ...s,
                                              itemIds: s.itemIds.filter((id) => id !== item.id),
                                            }
                                          : s
                                      )
                                    );
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                  title="Exclude item from this collection"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cluster actions */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-100">
                          <button
                            type="button"
                            onClick={() =>
                              setSuggestedClusters((prev) => prev.filter((s) => s.id !== cluster.id))
                            }
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptSingleSuggestion(cluster.id)}
                            disabled={!cluster.name.trim() || cluster.itemIds.length === 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Create Collection</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No new cluster suggestions found for your current saved items.
                </div>
              )}
            </div>

            {/* Footer */}
            {suggestedClusters.length > 1 && !isAiLoading && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {suggestedClusters.length} collections ready
                </span>
                <button
                  type="button"
                  onClick={handleAcceptAllSuggestions}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept All Selected</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
