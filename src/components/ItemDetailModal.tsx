import React, { useState, useRef } from 'react';
import { StashItem, StashCollection } from '../types/stash';
import {
  X,
  FileText,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  Clock,
  Fingerprint,
  Pin,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowDown,
  Info,
  FolderKanban,
  FolderPlus,
  Plus,
} from 'lucide-react';
import { AssignCollectionsModal } from './AssignCollectionsModal';

interface ItemDetailModalProps {
  item: StashItem | null;
  collections?: StashCollection[];
  onClose: () => void;
  onEdit: (item: StashItem) => void;
  onToggleArchive: (item: StashItem) => void;
  onTogglePin?: (item: StashItem) => void;
  onDelete: (item: StashItem) => void;
  onUpdateItemSummary?: (
    itemId: string,
    summary: string | undefined,
    keyTakeaways?: string[],
    summarySourceNote?: string
  ) => Promise<void>;
  onAddItemToCollection?: (collectionId: string, itemId: string) => Promise<void>;
  onRemoveItemFromCollection?: (collectionId: string, itemId: string) => Promise<void>;
  onSetItemCollections?: (itemId: string, collectionIds: string[]) => Promise<void>;
  onCreateCollection?: (name: string, description?: string) => Promise<StashCollection>;
  onOpenCollection?: (collectionId: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  collections = [],
  onClose,
  onEdit,
  onToggleArchive,
  onTogglePin,
  onDelete,
  onUpdateItemSummary,
  onAddItemToCollection,
  onRemoveItemFromCollection,
  onSetItemCollections,
  onCreateCollection,
  onOpenCollection,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // AI Summary generation state
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [cannotFetchNotice, setCannotFetchNotice] = useState<string | null>(null);

  const originalContentRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const handleCopyLink = () => {
    if (item.contentOrUrl) {
      navigator.clipboard.writeText(item.contentOrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const scrollToOriginal = () => {
    originalContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    setSummaryError(null);
    setCannotFetchNotice(null);

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          title: item.title,
          contentOrUrl: item.contentOrUrl,
          imageUri: item.imageUri,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.cannotFetchUrl) {
          setCannotFetchNotice(data.error);
        } else {
          setSummaryError(data.error || 'Failed to generate summary.');
        }
        return;
      }

      // Save summary locally
      if (onUpdateItemSummary) {
        await onUpdateItemSummary(
          item.id,
          data.summary,
          data.keyTakeaways || [],
          data.sourceExplanation
        );
      }
    } catch (err: unknown) {
      console.error('Error requesting summary:', err);
      setSummaryError(
        'Could not reach AI summarization service. Please check your internet connection and backend status.'
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRemoveSummary = async () => {
    if (onUpdateItemSummary) {
      await onUpdateItemSummary(item.id, undefined, undefined, undefined);
    }
  };

  // Determine if this item has substantial text or if it is purely a link
  const isPureLinkWithoutText =
    item.type === 'link' &&
    (/^https?:\/\/[^\s]+$/i.test(item.contentOrUrl.trim()) ||
      (!item.contentOrUrl.trim().includes(' ') &&
        item.contentOrUrl.trim().startsWith('http')));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider bg-indigo-100 text-indigo-700">
              {item.type}
            </span>
            {item.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Pin className="w-3 h-3 fill-indigo-700 rotate-45" />
                <span>Pinned</span>
              </span>
            )}
            {item.isArchived && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                Archived
              </span>
            )}
            {item.summary && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>AI Summary Saved</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {item.title}
            </h2>
          </div>

          {/* AI Quick Summary Section */}
          <div className="space-y-2">
            {/* Case 1: An AI Summary already exists */}
            {item.summary ? (
              <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white p-4 space-y-3 shadow-2xs">
                {/* Header of Summary Card */}
                <div className="flex items-center justify-between gap-2 border-b border-indigo-100/80 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        AI Quick Summary
                      </h3>
                      <p className="text-[11px] text-indigo-600/90 font-medium">
                        {item.summaryGeneratedAt
                          ? `Saved locally • Generated ${formatDate(item.summaryGeneratedAt)}`
                          : 'Saved locally in persistent storage'}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Summary */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing}
                      title="Regenerate summary with AI"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isSummarizing ? (
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                      ) : (
                        <RefreshCw className="w-3 h-3 text-indigo-600" />
                      )}
                      <span>Regenerate</span>
                    </button>
                    <button
                      type="button"
                      onClick={scrollToOriginal}
                      title="Jump to original content below"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3 text-slate-500" />
                      <span>Original</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveSummary}
                      title="Remove saved summary"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Summary Text (crisp, simple, readable) */}
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {item.summary}
                </div>

                {/* Key Takeaways (up to 3 concise takeaways) */}
                {item.keyTakeaways && item.keyTakeaways.length > 0 && (
                  <div className="pt-2 border-t border-indigo-100/70 space-y-1.5">
                    <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                      Key Takeaways ({item.keyTakeaways.length})
                    </p>
                    <ul className="space-y-1 text-xs text-slate-700 font-sans">
                      {item.keyTakeaways.map((takeaway, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0 mt-0.5">•</span>
                          <span className="leading-snug">{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clarification note */}
                <div className="pt-1 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>
                    {item.summarySourceNote ||
                      'Distinguished from original text • Original note content preserved below'}
                  </span>
                </div>
              </div>
            ) : (
              /* Case 2: No summary exists yet */
              <div className="space-y-2">
                {/* For links without article text: explain that webpage content cannot be read from URL alone */}
                {isPureLinkWithoutText ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          AI Summaries for Web Links
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                          External webpage content cannot be retrieved from the URL alone. Stash does not silently fetch third-party websites without permissions. You can paste the article text or notes into this item to generate an AI summary.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 pl-6">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEdit(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Add Article Text</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard "Summarize with AI" trigger button for notes, images, or links with text */
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/70">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          AI Quick Summary
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Generate a concise summary & up to 3 key takeaways
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Summarizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Summarize with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* In-progress loading status */}
            {isSummarizing && (
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/70 flex items-center gap-2.5 text-xs text-indigo-700 animate-in fade-in duration-150">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
                <div>
                  <span className="font-semibold block">Generating concise AI summary...</span>
                  <span className="text-[11px] text-indigo-500">
                    Analyzing available text content and extracting key takeaways
                  </span>
                </div>
              </div>
            )}

            {/* Error Notice */}
            {summaryError && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">AI Summarizer Notice</span>
                    <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                      {summaryError}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSummaryError(null)}
                  className="p-1 text-amber-500 hover:text-amber-800 cursor-pointer rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cannot fetch external url notice */}
            {cannotFetchNotice && (
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-start justify-between gap-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Webpage Content Notice</span>
                    <span className="text-[11px] text-sky-800 leading-relaxed block mt-0.5">
                      {cannotFetchNotice}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCannotFetchNotice(null)}
                  className="p-1 text-sky-500 hover:text-sky-800 cursor-pointer rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Original Content Presentation (Never replaced, modified, or deleted) */}
          <div ref={originalContentRef} className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Original Content
              </span>
              <span className="text-[11px] text-slate-400">
                {item.type === 'note'
                  ? `${item.contentOrUrl ? item.contentOrUrl.length : 0} characters`
                  : item.type === 'link'
                  ? 'Web link'
                  : 'Photo'}
              </span>
            </div>

            {item.type === 'note' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                {item.contentOrUrl || <span className="text-slate-400 italic">No note body</span>}
              </div>
            )}

            {item.type === 'link' && (
              <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-100 space-y-2">
                <p className="text-xs font-medium text-sky-800">Website URL:</p>
                <div className="flex items-center gap-2 break-all text-sm text-sky-700">
                  <Link2 className="w-4 h-4 shrink-0 text-sky-500" />
                  <span className="flex-1 font-mono text-xs">{item.contentOrUrl}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={item.contentOrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Website</span>
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-semibold transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            )}

            {item.type === 'image' && item.imageUri && (
              <div className="space-y-2">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  <img
                    src={item.imageUri}
                    alt={item.title}
                    className="max-h-72 w-full object-contain"
                  />
                </div>
                {item.contentOrUrl && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 italic">
                    {item.contentOrUrl}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Collections Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-purple-600" />
                <span>Collections</span>
              </p>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/90 rounded-lg px-2.5 py-1 transition cursor-pointer"
                title="Assign item to collections"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>
                  {item.collectionIds && item.collectionIds.length > 0
                    ? 'Manage Collections'
                    : 'Add to collection'}
                </span>
              </button>
            </div>

            {item.collectionIds && item.collectionIds.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.collectionIds.map((cId) => {
                    const col = collections.find((c) => c.id === cId);
                    if (!col) return null;
                    return (
                      <span
                        key={cId}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onOpenCollection?.(col.id);
                            onClose();
                          }}
                          className="hover:underline cursor-pointer flex items-center gap-1"
                          title={`View ${col.name} collection`}
                        >
                          <FolderKanban className="w-3 h-3 text-purple-500" />
                          <span>{col.name}</span>
                        </button>
                        {onRemoveItemFromCollection && (
                          <button
                            type="button"
                            onClick={() => onRemoveItemFromCollection(col.id, item.id)}
                            className="text-purple-400 hover:text-rose-600 cursor-pointer p-0.5 rounded transition"
                            title={`Remove from ${col.name} (item remains in Stash)`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-purple-50/70 hover:bg-purple-100 text-purple-700 border border-dashed border-purple-300 transition cursor-pointer"
                    title="Add or edit collections"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 italic">
                  Not assigned to any collection.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Add to collection</span>
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata details */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>ID: {item.id}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Created: {formatDate(item.createdAt)}</span>
            </div>
            {item.updatedAt !== item.createdAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Modified: {formatDate(item.updatedAt)}</span>
              </div>
            )}
          </div>

          {/* Delete confirmation warning if clicked */}
          {confirmDelete && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
              <p className="font-semibold text-rose-800">
                Are you sure you want to permanently delete this item?
              </p>
              <p className="text-rose-600">
                This action cannot be undone. It will be removed from your local storage.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    onDelete(item);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Yes, Delete Item
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onToggleArchive(item);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-100/60 border border-amber-200 transition cursor-pointer"
            >
              {item.isArchived ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span>Restore to Inbox</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </>
              )}
            </button>

            {onTogglePin && (
              <button
                onClick={() => onTogglePin(item)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  item.isPinned
                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600 border-slate-200'
                }`}
                title={item.isPinned ? 'Unpin from top of inbox' : 'Pin to top of inbox'}
              >
                <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-indigo-600 rotate-45' : ''}`} />
                <span>{item.isPinned ? 'Unpin' : 'Pin to top'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assign to Collections Modal / Sheet */}
      <AssignCollectionsModal
        isOpen={isAssignModalOpen}
        item={item}
        collections={collections}
        onClose={() => setIsAssignModalOpen(false)}
        onConfirm={async (itemId, selectedIds) => {
          if (onSetItemCollections) {
            await onSetItemCollections(itemId, selectedIds);
          }
        }}
        onCreateCollection={
          onCreateCollection ||
          (async (name, desc) => ({
            id: `col-${Date.now()}`,
            name,
            description: desc,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }))
        }
      />
    </div>
  );
};
