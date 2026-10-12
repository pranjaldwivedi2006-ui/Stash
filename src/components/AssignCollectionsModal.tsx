import React, { useState, useEffect } from 'react';
import { StashItem, StashCollection } from '../types/stash';
import {
  X,
  Check,
  FolderKanban,
  FolderPlus,
  Plus,
  Search,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AssignCollectionsModalProps {
  isOpen: boolean;
  item: StashItem | null;
  collections: StashCollection[];
  onClose: () => void;
  onConfirm: (itemId: string, selectedCollectionIds: string[]) => Promise<void>;
  onCreateCollection: (name: string, description?: string) => Promise<StashCollection>;
}

export const AssignCollectionsModal: React.FC<AssignCollectionsModalProps> = ({
  isOpen,
  item,
  collections,
  onClose,
  onConfirm,
  onCreateCollection,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Inline "Create New Collection" form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Initialize selected IDs whenever modal opens or item changes
  useEffect(() => {
    if (item && isOpen) {
      setSelectedIds(item.collectionIds || []);
      setSearchQuery('');
      setShowCreateForm(collections.length === 0);
      setNewColName('');
      setNewColDesc('');
      setCreateError('');
    }
  }, [item, isOpen, collections.length]);

  if (!isOpen || !item) return null;

  const toggleCollection = (colId: string) => {
    setSelectedIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed) {
      setCreateError('Please enter a collection name');
      return;
    }

    const duplicate = collections.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setCreateError('A collection with this name already exists');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    try {
      const created = await onCreateCollection(trimmed, newColDesc.trim() || undefined);
      // Automatically check the newly created collection
      setSelectedIds((prev) => [...prev, created.id]);
      setNewColName('');
      setNewColDesc('');
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      setCreateError('Failed to create collection. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm(item.id, selectedIds);
      onClose();
    } catch (err) {
      console.error('Error assigning collections:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCollections = collections.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Add to Collections
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                {item.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar (if collections exist) */}
        {collections.length > 3 && (
          <div className="p-3 border-b border-slate-200 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>
        )}

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {collections.length === 0 ? (
            <div className="text-center py-4 px-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 mx-auto flex items-center justify-center text-purple-600 mb-2.5">
                <FolderPlus className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">No collections exist yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Create a collection below to categorize and group your saved items.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                <span>Select collections ({selectedIds.length} chosen)</span>
                {!showCreateForm && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Collection</span>
                  </button>
                )}
              </div>

              {filteredCollections.length > 0 ? (
                filteredCollections.map((col) => {
                  const isChecked = selectedIds.includes(col.id);
                  return (
                    <div
                      key={col.id}
                      onClick={() => toggleCollection(col.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                          isChecked
                            ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <FolderKanban
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isChecked ? 'text-purple-600' : 'text-slate-400'
                            }`}
                          />
                          <h4
                            className={`text-xs font-bold truncate ${
                              isChecked ? 'text-purple-950' : 'text-slate-800'
                            }`}
                          >
                            {col.name}
                          </h4>
                        </div>
                        {col.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {col.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No collections match &ldquo;{searchQuery}&rdquo;.
                </p>
              )}
            </div>
          )}

          {/* Inline Create New Collection Form */}
          {showCreateForm && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-purple-700" />
                  <span>Create New Collection</span>
                </span>
                {collections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError('');
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-2.5">
                <div>
                  <input
                    type="text"
                    value={newColName}
                    onChange={(e) => {
                      setNewColName(e.target.value);
                      if (createError) setCreateError('');
                    }}
                    placeholder="Collection name (e.g. Kotlin Tips, Recipes)..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-200 bg-white text-slate-900 outline-none focus:border-purple-600"
                    autoFocus
                  />
                  {createError && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{createError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={newColDesc}
                    onChange={(e) => setNewColDesc(e.target.value)}
                    placeholder="Optional description..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-200 bg-white text-slate-900 outline-none focus:border-purple-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {collections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setCreateError('');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isCreating || !newColName.trim()}
                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isCreating ? 'Creating...' : 'Create & Select'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/70">
          <span className="text-xs text-slate-500 font-medium pl-1">
            {selectedIds.length === 0
              ? 'None selected'
              : `${selectedIds.length} collection${selectedIds.length === 1 ? '' : 's'} selected`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSaving ? 'Saving...' : 'Confirm'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
