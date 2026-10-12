import { StashItem, StashCollection } from '../types/stash';

const DB_NAME = 'stash_local_db';
const DB_VERSION = 2;
const ITEMS_STORE = 'stash_items';
const COLLECTIONS_STORE = 'stash_collections';

/**
 * Robust IndexedDB storage that persists data across page reloads,
 * tab closures, and app restarts for both saved items and collections.
 */
class StashDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(ITEMS_STORE)) {
            const store = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('isArchived', 'isArchived', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
            const colStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id' });
            colStore.createIndex('name', 'name', { unique: false });
            colStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    }
    return this.dbPromise;
  }

  // --- Items Operations ---

  async getAll(): Promise<StashItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ITEMS_STORE, 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawItems = request.result as StashItem[];
        const items = rawItems.map((item) => ({
          ...item,
          isPinned: Boolean(item.isPinned),
          collectionIds: Array.isArray(item.collectionIds) ? item.collectionIds : [],
        }));
        // Sort descending by updated/created
        items.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getById(id: string): Promise<StashItem | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ITEMS_STORE, 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result as StashItem | undefined;
        if (item) {
          resolve({
            ...item,
            collectionIds: Array.isArray(item.collectionIds) ? item.collectionIds : [],
          });
        } else {
          resolve(undefined);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(item: StashItem): Promise<void> {
    const db = await this.getDB();
    const normalizedItem: StashItem = {
      ...item,
      collectionIds: Array.isArray(item.collectionIds) ? item.collectionIds : [],
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ITEMS_STORE, 'readwrite');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.put(normalizedItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ITEMS_STORE, 'readwrite');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Collections Operations ---

  async getAllCollections(): Promise<StashCollection[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(COLLECTIONS_STORE, 'readonly');
      const store = transaction.objectStore(COLLECTIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const collections = (request.result as StashCollection[]) || [];
        collections.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
        resolve(collections);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getCollectionById(id: string): Promise<StashCollection | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(COLLECTIONS_STORE, 'readonly');
      const store = transaction.objectStore(COLLECTIONS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as StashCollection | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCollection(collection: StashCollection): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(COLLECTIONS_STORE, 'readwrite');
      const store = transaction.objectStore(COLLECTIONS_STORE);
      const request = store.put(collection);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deleting a collection must not delete the saved items inside it.
   * We remove the collection record, and clean up the collectionId association from items.
   */
  async deleteCollection(collectionId: string): Promise<void> {
    const db = await this.getDB();
    // 1. Delete collection from collections store
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(COLLECTIONS_STORE, 'readwrite');
      const store = transaction.objectStore(COLLECTIONS_STORE);
      const request = store.delete(collectionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Disassociate items from this collection (without deleting the items)
    const items = await this.getAll();
    for (const item of items) {
      if (item.collectionIds?.includes(collectionId)) {
        const updatedItem: StashItem = {
          ...item,
          collectionIds: item.collectionIds.filter((id) => id !== collectionId),
        };
        await this.save(updatedItem);
      }
    }
  }

  async addItemToCollection(collectionId: string, itemId: string): Promise<void> {
    const item = await this.getById(itemId);
    if (!item) return;
    const current = item.collectionIds || [];
    if (!current.includes(collectionId)) {
      await this.save({
        ...item,
        collectionIds: [...current, collectionId],
        updatedAt: Date.now(),
      });
    }
  }

  async removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
    const item = await this.getById(itemId);
    if (!item) return;
    const current = item.collectionIds || [];
    if (current.includes(collectionId)) {
      await this.save({
        ...item,
        collectionIds: current.filter((id) => id !== collectionId),
        updatedAt: Date.now(),
      });
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ITEMS_STORE, COLLECTIONS_STORE], 'readwrite');
      const itemStore = transaction.objectStore(ITEMS_STORE);
      const colStore = transaction.objectStore(COLLECTIONS_STORE);
      itemStore.clear();
      colStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async seedStarterItemsAndCollectionsIfEmpty(): Promise<boolean> {
    const existingItems = await this.getAll();
    const existingCols = await this.getAllCollections();

    if (existingItems.length > 0 && existingCols.length > 0) {
      return false;
    }

    const now = Date.now();
    const col1Id = 'col-sys-arch';
    const col2Id = 'col-android-dev';

    if (existingCols.length === 0) {
      const starterCollections: StashCollection[] = [
        {
          id: col1Id,
          name: 'System Architecture',
          description: 'Distributed systems, storage engines, and database internals.',
          createdAt: now - 3600000 * 5,
          updatedAt: now - 3600000 * 5,
        },
        {
          id: col2Id,
          name: 'Android & Kotlin',
          description: 'Official guides, Jetpack Compose, Room SQLite, and architecture.',
          createdAt: now - 3600000 * 4,
          updatedAt: now - 3600000 * 4,
        },
      ];

      for (const col of starterCollections) {
        await this.saveCollection(col);
      }

      // If items existed from previous turn, link them to the newly seeded collections
      if (existingItems.length > 0) {
        for (const item of existingItems) {
          if (!item.collectionIds || item.collectionIds.length === 0) {
            if (item.title.toLowerCase().includes('compose') || item.tags.includes('android')) {
              await this.addItemToCollection(col2Id, item.id);
            } else if (
              item.title.toLowerCase().includes('data-intensive') ||
              item.title.toLowerCase().includes('storage') ||
              item.tags.includes('architecture')
            ) {
              await this.addItemToCollection(col1Id, item.id);
            }
          }
        }
      }
    }

    if (existingItems.length === 0) {
      const ONE_DAY_MS = 86400000;
      const starterItems: StashItem[] = [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-1-' + Date.now(),
          type: 'note',
          title: 'Welcome to Stash Inbox',
          contentOrUrl:
            'Stash is your zero-distraction personal inbox. Save articles, quick thoughts, book quotes, and screenshots. Everything is stored persistently in local SQLite / local database.',
          tags: ['welcome', 'guide', 'inbox'],
          createdAt: now - 3600000 * 2,
          updatedAt: now - 3600000 * 2,
          isArchived: false,
          isPinned: false,
          collectionIds: [],
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-2-' + Date.now(),
          type: 'link',
          title: 'Android Developers: Jetpack Compose Documentation',
          contentOrUrl: 'https://developer.android.com/develop/ui/compose',
          tags: ['android', 'compose', 'kotlin'],
          createdAt: now - 3600000,
          updatedAt: now - 3600000,
          isArchived: false,
          isPinned: false,
          collectionIds: [col2Id],
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-3-' + Date.now(),
          type: 'note',
          title: 'Designing Data-Intensive Applications: Storage Engines',
          contentOrUrl:
            'Storage engines generally fall into two primary categories: log-structured and page-oriented.\n\n1. Log-Structured Merge-Trees (LSM-trees): Writes are appended to an in-memory memtable (typically a red-black tree or skiplist). When the memtable fills up, it is written to disk as an immutable SSTable file. Background compaction merges and deduplicates SSTables continuously. LSM-trees optimize for high write throughput.\n\n2. B-trees: Break the database down into fixed-size pages (typically 4KB) and update pages in-place on disk using a write-ahead log (WAL) for crash recovery. B-trees provide faster, predictable random reads and point queries.\n\nKey Takeaway: Choose LSM-trees for write-heavy workloads and B-trees for read-heavy workloads with complex ranges.',
          tags: ['books', 'engineering', 'architecture'],
          createdAt: now - 7200000,
          updatedAt: now - 7200000,
          isArchived: false,
          isPinned: false,
          collectionIds: [col1Id],
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-4-' + Date.now(),
          type: 'note',
          title: 'C Programming: Pointers, Memory Management & Structs',
          contentOrUrl:
            'Core pointers and dynamic allocation review:\n- malloc(size) allocates uninitialized bytes on the heap.\n- free(ptr) releases memory back to the OS; always set ptr = NULL afterwards to prevent dangling pointers.\n- Pointer arithmetic: (ptr + 1) advances by sizeof(*ptr) bytes.\n- Struct alignment: watch padding boundaries for 64-bit architectures.',
          tags: ['programming', 'c', 'college'],
          createdAt: now - 3600000 * 8,
          updatedAt: now - 3600000 * 8,
          isArchived: false,
          isPinned: false,
          collectionIds: [],
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-5-' + Date.now(),
          type: 'link',
          title: 'Tech Internship Application Portal & Prep Guide',
          contentOrUrl: 'https://internships.tech/portal-apply',
          tags: ['career', 'internship', 'college'],
          createdAt: now - 3600000 * 14,
          updatedAt: now - 3600000 * 14,
          isArchived: false,
          isPinned: true,
          collectionIds: [],
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-6-' + Date.now(),
          type: 'note',
          title: 'Mobile UI Design Inspiration & Micro-Interactions',
          contentOrUrl:
            'Saved design ideas from last week:\n- Card elevation with soft ambient shadows rather than harsh borders.\n- Material 3 navigation rail with fluid pill state transitions.\n- Natural language search bar with contextual smart chips.',
          tags: ['design', 'inspiration', 'mobile-ui'],
          createdAt: now - ONE_DAY_MS * 8, // Saved last week (~8 days ago)
          updatedAt: now - ONE_DAY_MS * 8,
          isArchived: false,
          isPinned: false,
          collectionIds: [],
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : 'init-7-' + Date.now(),
          type: 'note',
          title: 'College Operating Systems & Concurrency Notes',
          contentOrUrl:
            'Critical section solutions: Semaphores vs Mutex locks. Remember deadlocks require 4 conditions: mutual exclusion, hold and wait, no preemption, and circular wait.',
          tags: ['college', 'programming', 'notes'],
          createdAt: now - ONE_DAY_MS * 3,
          updatedAt: now - ONE_DAY_MS * 3,
          isArchived: false,
          isPinned: true,
          collectionIds: [],
        },
      ];

      for (const item of starterItems) {
        await this.save(item);
      }
    }

    return true;
  }

  // Alias for backward compatibility
  async seedStarterItemsIfEmpty(): Promise<boolean> {
    return this.seedStarterItemsAndCollectionsIfEmpty();
  }
}

export const stashDb = new StashDatabase();
