export type ItemType = 'note' | 'link' | 'image';

export interface StashItem {
  id: string; // UUID string
  type: ItemType;
  title: string;
  contentOrUrl: string; // Note text, or website URL, or image caption/metadata
  imageUri?: string; // Data URL or storage URI for images
  tags: string[];
  createdAt: number; // Unix timestamp in ms
  updatedAt: number; // Unix timestamp in ms
  isArchived: boolean;
  isPinned?: boolean;
  // AI Quick Summary
  summary?: string;
  keyTakeaways?: string[];
  summaryGeneratedAt?: number;
  summarySourceNote?: string;
  // AI Collections (Many-to-many: an item can belong to multiple collections)
  collectionIds?: string[];
}

export interface StashCollection {
  id: string; // UUID string
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface SuggestedCollection {
  name: string;
  description?: string;
  itemIds: string[];
  reason?: string;
}

export type ScreenTab = 'inbox' | 'collections' | 'archived' | 'code';

export interface FilterState {
  searchQuery: string;
  selectedType: 'all' | ItemType;
  selectedTag: string | null;
}

export interface ValidationErrors {
  title?: string;
  contentOrUrl?: string;
  image?: string;
}
