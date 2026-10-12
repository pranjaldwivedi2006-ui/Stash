import { StashItem, StashCollection } from '../types/stash';
import {
  FileText,
  Link2,
  Image as ImageIcon,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  Edit3,
  Calendar,
  Clock,
  Pin,
  Sparkles,
  FolderKanban,
  FolderPlus,
} from 'lucide-react';

interface StashCardProps {
  item: StashItem;
  collections?: StashCollection[];
  onSelect: (item: StashItem) => void;
  onEdit: (item: StashItem) => void;
  onToggleArchive: (item: StashItem) => void;
  onTogglePin?: (item: StashItem) => void;
  onDelete: (item: StashItem) => void;
  onTagClick?: (tag: string) => void;
  onCollectionClick?: (collectionId: string) => void;
  onManageCollections?: (item: StashItem) => void;
}

export const StashCard: React.FC<StashCardProps> = ({
  item,
  collections = [],
  onSelect,
  onEdit,
  onToggleArchive,
  onTogglePin,
  onDelete,
  onTagClick,
  onCollectionClick,
  onManageCollections,
}) => {
  const getTypeBadge = () => {
    switch (item.type) {
      case 'note':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-indigo-600" />,
          label: 'Note',
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        };
      case 'link':
        return {
          icon: <Link2 className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Link',
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
        };
      case 'image':
        return {
          icon: <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Image',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        };
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const badge = getTypeBadge();

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group bg-white rounded-2xl p-4 border shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
        item.isPinned
          ? 'border-indigo-200/90 border-l-[3.5px] border-l-indigo-600 bg-gradient-to-r from-indigo-50/30 via-white to-white hover:border-indigo-300'
          : 'border-slate-200/90 hover:border-indigo-300'
      }`}
    >
      {/* Top Meta Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge.bg}`}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </span>
          {item.isPinned && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs"
              title="Pinned item"
            >
              <Pin className="w-2.5 h-2.5 fill-indigo-600 rotate-45" />
              <span>Pinned</span>
            </span>
          )}
          {item.summary && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold bg-purple-50 border-purple-200 text-purple-700 shadow-2xs"
              title="AI Summary saved"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
              <span>Summary</span>
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-medium">
            {formatRelativeTime(item.updatedAt || item.createdAt)}
          </span>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center gap-0.5 opacity-90 sm:opacity-80 group-hover:opacity-100 transition"
          onClick={(e) => e.stopPropagation()}
        >
          {onTogglePin && (
            <button
              onClick={() => onTogglePin(item)}
              title={item.isPinned ? 'Unpin item' : 'Pin to top'}
              className={`p-1.5 rounded-lg transition ${
                item.isPinned
                  ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700'
                  : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <Pin
                className={`w-3.5 h-3.5 transition-transform ${
                  item.isPinned ? 'fill-indigo-600 rotate-45' : ''
                }`}
              />
            </button>
          )}

          {item.type === 'link' && (
            <a
              href={item.contentOrUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open link in new tab"
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {onManageCollections && (
            <button
              onClick={() => onManageCollections(item)}
              title="Add to collection / Manage collections"
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onEdit(item)}
            title="Edit item"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleArchive(item)}
            title={item.isArchived ? 'Restore to Inbox' : 'Archive item'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
          >
            {item.isArchived ? (
              <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={() => onDelete(item)}
            title="Delete permanently"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1 mb-1.5">
        {item.title}
      </h3>

      {/* Content representation */}
      {item.type === 'note' && item.contentOrUrl && (
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed mb-3 whitespace-pre-wrap">
          {item.contentOrUrl}
        </p>
      )}

      {item.type === 'link' && item.contentOrUrl && (
        <div className="mb-3">
          <p className="text-xs text-sky-600 hover:underline line-clamp-1 break-all bg-sky-50/60 p-2 rounded-lg border border-sky-100 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 shrink-0 text-sky-500" />
            <span className="truncate">{item.contentOrUrl}</span>
          </p>
        </div>
      )}

      {item.type === 'image' && item.imageUri && (
        <div className="mb-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 max-h-48 flex items-center justify-center">
          <img
            src={item.imageUri}
            alt={item.title}
            className="w-full h-44 object-cover hover:scale-105 transition duration-300"
            loading="lazy"
          />
        </div>
      )}

      {item.type === 'image' && item.contentOrUrl && (
        <p className="text-xs text-slate-500 italic mb-2 line-clamp-2">
          {item.contentOrUrl}
        </p>
      )}

      {/* Collections badges */}
      {item.collectionIds && item.collectionIds.length > 0 && (
        <div
          className="flex flex-wrap gap-1 mt-1 mb-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {item.collectionIds.map((cId) => {
            const col = collections.find((c) => c.id === cId);
            if (!col) return null;
            return (
              <button
                key={cId}
                onClick={() => onCollectionClick?.(cId)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 transition cursor-pointer"
                title={`Belongs to collection: ${col.name}`}
              >
                <FolderKanban className="w-2.5 h-2.5 text-purple-600" />
                <span className="truncate max-w-[120px]">{col.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tags list */}
      {item.tags.length > 0 && (
        <div
          className="flex flex-wrap gap-1 mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {item.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
