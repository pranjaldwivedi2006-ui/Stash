import React, { useState, useEffect, useRef } from 'react';
import { StashItem, ItemType, ValidationErrors } from '../types/stash';
import {
  X,
  FileText,
  Link2,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  Tag as TagIcon,
  Plus,
  Check,
  Pin,
  Sparkles,
  Loader2,
  Info,
  FolderKanban,
} from 'lucide-react';
import { StashCollection } from '../types/stash';

interface AddEditModalProps {
  isOpen: boolean;
  itemToEdit: StashItem | null;
  initialType?: ItemType;
  collections?: StashCollection[];
  onClose: () => void;
  onSave: (item: Omit<StashItem, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> & { id?: string; isPinned?: boolean; collectionIds?: string[] }) => void;
  availableTags: string[];
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  itemToEdit,
  initialType,
  collections = [],
  onClose,
  onSave,
  availableTags,
}) => {
  const [type, setType] = useState<ItemType>('note');
  const [title, setTitle] = useState('');
  const [contentOrUrl, setContentOrUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // AI Smart Tagging states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLimitationNotice, setAiLimitationNotice] = useState<string | null>(null);
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState<string | null>(null);
  const [aiEmptyResult, setAiEmptyResult] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when modal opens or itemToEdit changes
  useEffect(() => {
    // Reset AI state whenever opening or switching item
    setIsAiLoading(false);
    setAiSuggestedTags([]);
    setAiError(null);
    setAiLimitationNotice(null);
    setAiAnalysisNotes(null);
    setAiEmptyResult(false);

    if (itemToEdit) {
      setType(itemToEdit.type);
      setTitle(itemToEdit.title);
      setContentOrUrl(itemToEdit.contentOrUrl);
      setImageUri(itemToEdit.imageUri);
      setImageFileName(itemToEdit.type === 'image' && itemToEdit.imageUri ? 'Attached Image' : '');
      setTags([...itemToEdit.tags]);
      setIsPinned(Boolean(itemToEdit.isPinned));
      setSelectedCollectionIds(itemToEdit.collectionIds || []);
      setErrors({});
    } else {
      setType(initialType || 'note');
      setTitle('');
      setContentOrUrl('');
      setImageUri(undefined);
      setImageFileName('');
      setTags([]);
      setCurrentTagInput('');
      setIsPinned(false);
      setSelectedCollectionIds([]);
      setErrors({});
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  // URL Validator
  const validateUrl = (urlStr: string): boolean => {
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUri(result);
      setImageFileName(file.name);
      setErrors((prev) => ({ ...prev, image: undefined }));
    };
    reader.onerror = () => {
      setErrors((prev) => ({ ...prev, image: 'Failed to read image file from device.' }));
    };
    reader.readAsDataURL(file);
  };

  const normalizeTag = (rawTag: string): string => {
    return rawTag
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/[^\w\s-]/g, '')
      .trim();
  };

  const handleAddTag = () => {
    const clean = normalizeTag(currentTagInput);
    if (clean && !tags.some((t) => normalizeTag(t) === clean)) {
      setTags([...tags, clean]);
      setCurrentTagInput('');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // AI Smart Tagging Actions
  const handleSuggestTagsWithAi = async () => {
    const hasText = title.trim().length > 0 || contentOrUrl.trim().length > 0;
    const hasImage = Boolean(imageUri);

    if (!hasText && !hasImage) {
      setAiError(
        'Please enter a title, note content, or link URL first so AI can suggest relevant tags.'
      );
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiLimitationNotice(null);
    setAiAnalysisNotes(null);
    setAiEmptyResult(false);

    try {
      const response = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          contentOrUrl: contentOrUrl.trim(),
          imageUri: type === 'image' ? imageUri : undefined,
          existingTags: tags,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setAiError(
          data.error ||
            'AI service unavailable. Please ensure GEMINI_API_KEY is configured in your environment.'
        );
        setAiSuggestedTags([]);
      } else {
        // Filter out existing tags (case-insensitive & extra spaces ignored)
        const currentNormSet = new Set(tags.map((t) => normalizeTag(t)));
        const newSuggestions = (data.tags || []).filter(
          (t: string) => !currentNormSet.has(normalizeTag(t))
        );

        setAiSuggestedTags(newSuggestions);
        if (newSuggestions.length === 0) {
          setAiEmptyResult(true);
        }
        if (data.limitationExplanation) {
          setAiLimitationNotice(data.limitationExplanation);
        }
        if (data.analysisNotes) {
          setAiAnalysisNotes(data.analysisNotes);
        }
      }
    } catch (err: unknown) {
      console.error('AI tag generation error:', err);
      setAiError(
        'Could not reach AI service. Please check network connection and backend configuration.'
      );
      setAiSuggestedTags([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAiTag = (tagToAccept: string) => {
    const clean = normalizeTag(tagToAccept);
    if (clean && !tags.some((t) => normalizeTag(t) === clean)) {
      setTags([...tags, clean]);
    }
    setAiSuggestedTags((prev) => prev.filter((t) => normalizeTag(t) !== clean));
  };

  const handleRejectAiTag = (tagToReject: string) => {
    const clean = normalizeTag(tagToReject);
    setAiSuggestedTags((prev) => prev.filter((t) => normalizeTag(t) !== clean));
  };

  const handleAcceptAllAiTags = () => {
    const currentNormSet = new Set(tags.map((t) => normalizeTag(t)));
    const toAdd: string[] = [];

    for (const tag of aiSuggestedTags) {
      const clean = normalizeTag(tag);
      if (clean && !currentNormSet.has(clean)) {
        currentNormSet.add(clean);
        toAdd.push(clean);
      }
    }

    setTags([...tags, ...toAdd]);
    setAiSuggestedTags([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: ValidationErrors = {};

    // Validate Title
    if (!title.trim()) {
      newErrors.title = 'Title is required. Please enter a descriptive title.';
    }

    // Validate based on Type
    if (type === 'link') {
      const trimmedUrl = contentOrUrl.trim();
      if (!trimmedUrl) {
        newErrors.contentOrUrl = 'URL is required for web links.';
      } else if (!validateUrl(trimmedUrl)) {
        newErrors.contentOrUrl = 'Please enter a valid URL starting with http:// or https:// (e.g. https://example.com)';
      }
    } else if (type === 'image') {
      if (!imageUri) {
        newErrors.image = 'Please choose an image from your device storage.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // If tag in input wasn't committed, add it
    let finalTags = [...tags];
    if (currentTagInput.trim()) {
      const clean = currentTagInput.trim().replace(/^#+/, '').toLowerCase();
      if (!finalTags.includes(clean)) {
        finalTags.push(clean);
      }
    }

    onSave({
      id: itemToEdit?.id,
      type,
      title: title.trim(),
      contentOrUrl: contentOrUrl.trim(),
      imageUri: type === 'image' ? imageUri : undefined,
      tags: finalTags,
      isPinned,
      collectionIds: selectedCollectionIds,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {itemToEdit ? 'Edit Stash Item' : 'New Stash Item'}
            </h2>
            <p className="text-xs text-slate-500">
              Saved directly to persistent local SQLite / IndexedDB
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type Selector Segmented Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Item Type
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setType('note');
                  setErrors((prev) => ({ ...prev, contentOrUrl: undefined }));
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  type === 'note'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Note</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('link');
                  setErrors((prev) => ({ ...prev, contentOrUrl: undefined }));
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  type === 'link'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('image');
                  setErrors((prev) => ({ ...prev, image: undefined }));
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  type === 'image'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image</span>
              </button>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder={
                type === 'note'
                  ? 'e.g., Ideas for Weekend Hike'
                  : type === 'link'
                  ? 'e.g., Jetpack Compose Official Guide'
                  : 'e.g., Architecture Diagram Snapshot'
              }
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition ${
                errors.title
                  ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Type-Specific Content Fields */}
          {type === 'note' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Note Content
              </label>
              <textarea
                value={contentOrUrl}
                onChange={(e) => setContentOrUrl(e.target.value)}
                rows={4}
                placeholder="Write your personal notes, checklist, article snippet, or thoughts here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition resize-y"
              />
            </div>
          )}

          {type === 'link' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Website URL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={contentOrUrl}
                  onChange={(e) => {
                    setContentOrUrl(e.target.value);
                    if (errors.contentOrUrl) {
                      setErrors((prev) => ({ ...prev, contentOrUrl: undefined }));
                    }
                  }}
                  placeholder="https://example.com/article-or-tutorial"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 outline-none transition ${
                    errors.contentOrUrl
                      ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                  }`}
                />
              </div>
              {errors.contentOrUrl ? (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.contentOrUrl}</span>
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Include the protocol, e.g. https://android.com
                </p>
              )}
            </div>
          )}

          {type === 'image' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Device Image <span className="text-rose-500">*</span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {imageUri ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={imageUri}
                    alt="Selected from device"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="mt-2 flex items-center justify-between px-1">
                    <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                      {imageFileName || 'Selected Photo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 flex flex-col items-center justify-center transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    Choose Photo from Device
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    PNG, JPG, WEBP, GIF (stored locally)
                  </span>
                </button>
              )}

              {errors.image && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.image}</span>
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Caption / Description (Optional)
                </label>
                <input
                  type="text"
                  value={contentOrUrl}
                  onChange={(e) => setContentOrUrl(e.target.value)}
                  placeholder="e.g. Screenshot from tech talk video"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          {/* Tags Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tags
              </label>
              <button
                type="button"
                onClick={handleSuggestTagsWithAi}
                disabled={isAiLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/70 transition cursor-pointer disabled:opacity-50"
                title="Generate intelligent tag suggestions from item title, notes, or image"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-200" />
                    <span>Suggest tags with AI</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Loading Indicator */}
            {isAiLoading && (
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/70 flex items-center gap-2.5 text-xs text-indigo-700">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
                <div className="flex-1">
                  <span className="font-semibold block">Generating AI Tag Suggestions...</span>
                  <span className="text-[11px] text-indigo-500">
                    {type === 'link'
                      ? 'Analyzing title and URL snippet with Gemini AI'
                      : type === 'image'
                      ? 'Analyzing image visual elements and description'
                      : 'Analyzing title and note content with Gemini AI'}
                  </span>
                </div>
              </div>
            )}

            {/* AI Error Banner */}
            {aiError && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900 flex items-start justify-between gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900 block">AI Smart Tagging Notice</span>
                    <span className="text-amber-700 text-[11px] leading-relaxed block mt-0.5">
                      {aiError}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiError(null)}
                  className="text-amber-500 hover:text-amber-800 p-0.5 rounded cursor-pointer shrink-0"
                  title="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* AI Empty Result Notification */}
            {aiEmptyResult && !aiError && !isAiLoading && (
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center justify-between">
                <span>No new tags suggested for this content.</span>
                <button
                  type="button"
                  onClick={() => setAiEmptyResult(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* AI Suggested Tag Chips Container */}
            {aiSuggestedTags.length > 0 && (
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-200 space-y-2 animate-in fade-in zoom-in-98 duration-150">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      AI Suggested Tags ({aiSuggestedTags.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAcceptAllAiTags}
                      className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md shadow-2xs transition cursor-pointer"
                      title="Add all suggested tags"
                    >
                      + Accept All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiSuggestedTags([])}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
                      title="Dismiss suggestions"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Subtext info for Link constraint */}
                {type === 'link' && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Suggestions generated from available title & URL text (external webpage not fetched).</span>
                  </p>
                )}

                {/* Image limitation note if applicable */}
                {aiLimitationNotice && (
                  <p className="text-[10px] text-amber-700 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/70">
                    {aiLimitationNotice}
                  </p>
                )}

                {/* Selectable Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiSuggestedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-800 text-xs font-medium shadow-2xs group hover:border-indigo-400 transition"
                    >
                      <span className="font-semibold text-indigo-900">#{tag}</span>
                      {/* Accept Button */}
                      <button
                        type="button"
                        onClick={() => handleAcceptAiTag(tag)}
                        title={`Accept and add #${tag}`}
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      {/* Reject Button */}
                      <button
                        type="button"
                        onClick={() => handleRejectAiTag(tag)}
                        title={`Reject #${tag}`}
                        className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Input Field */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <TagIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={currentTagInput}
                  onChange={(e) => setCurrentTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Type tag and press Enter or comma..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!currentTagInput.trim()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Active Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-indigo-400 hover:text-indigo-700 cursor-pointer p-0.5 rounded"
                      title={`Remove #${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggested existing tags from database */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[11px] text-slate-400 mr-1">Existing tags:</span>
                {availableTags
                  .filter((t) => !tags.some((cur) => normalizeTag(cur) === normalizeTag(t)))
                  .slice(0, 6)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const clean = normalizeTag(tag);
                        if (clean && !tags.some((cur) => normalizeTag(cur) === clean)) {
                          setTags([...tags, clean]);
                        }
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    >
                      +{tag}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Pin to Top Option */}
          <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl transition ${
                  isPinned
                    ? 'bg-indigo-100 text-indigo-700 shadow-2xs'
                    : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-indigo-600 rotate-45' : ''}`} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Pin to Top of Inbox
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Keep this item featured above other regular inbox items
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPinned}
              onClick={() => setIsPinned(!isPinned)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPinned ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isPinned ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{itemToEdit ? 'Save Changes' : 'Save to Stash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
