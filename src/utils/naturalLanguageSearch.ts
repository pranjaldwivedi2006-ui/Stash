import { StashItem, ItemType } from '../types/stash';

export interface ParsedSearchCriteria {
  rawQuery: string;
  inferredType?: ItemType;
  inferredPinned?: boolean;
  inferredArchived?: boolean;
  inferredTag?: string;
  inferredDateFilter?: {
    label: string;
    sinceMs: number;
    untilMs?: number;
  };
  keywords: string[];
  recognizedIntentions: string[];
}

/**
 * Common stop words and filler words in search queries.
 * Note: specific technical tokens like 'c', 'ui', 'ux', 'ai', 'db', 'go', 'os' are explicitly preserved!
 */
const STOP_WORDS = new Set([
  'find', 'show', 'search', 'get', 'look', 'for', 'display', 'list',
  'my', 'me', 'i', 'we', 'our', 'mine',
  'saved', 'stored', 'stashed', 'stash',
  'items', 'item', 'things', 'thing', 'entries', 'entry',
  'all', 'any', 'some', 'the', 'a', 'an',
  'about', 'with', 'that', 'which', 'who', 'whose',
  'are', 'is', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
  'please', 'can', 'you', 'give', 'tell',
  'in', 'on', 'at', 'from', 'to', 'of', 'and', 'or',
]);

const PRESERVED_SHORT_TERMS = new Set(['c', 'r', 'go', 'ui', 'ux', 'ai', 'db', 'os', 'js', 'ts']);

/**
 * Parse an everyday natural-language search query into structured criteria.
 * Runs 100% locally and offline without external dependencies.
 */
export function parseNaturalLanguageQuery(
  rawQuery: string,
  availableTags: string[] = []
): ParsedSearchCriteria {
  const cleanRaw = rawQuery.trim();
  if (!cleanRaw) {
    return {
      rawQuery: '',
      keywords: [],
      recognizedIntentions: [],
    };
  }

  const recognizedIntentions: string[] = [];
  let workingQuery = cleanRaw.toLowerCase();

  // Strip trailing punctuation
  workingQuery = workingQuery.replace(/[?.!]+$/, ' ').trim();

  let inferredType: ItemType | undefined = undefined;
  let inferredPinned: boolean | undefined = undefined;
  let inferredArchived: boolean | undefined = undefined;
  let inferredTag: string | undefined = undefined;
  let inferredDateFilter: ParsedSearchCriteria['inferredDateFilter'] = undefined;

  // 1. Detect Archive status
  if (/\b(not\s+archived|unarchived|non-archived|inbox|active)\b/i.test(workingQuery)) {
    inferredArchived = false;
    recognizedIntentions.push('Active (Not Archived)');
    workingQuery = workingQuery.replace(/\b(not\s+archived|unarchived|non-archived|inbox|active)\b/gi, ' ');
  } else if (/\b(archived|archive)\b/i.test(workingQuery)) {
    inferredArchived = true;
    recognizedIntentions.push('Archived');
    workingQuery = workingQuery.replace(/\b(archived|archive)\b/gi, ' ');
  }

  // 2. Detect Pin status
  if (/\b(not\s+pinned|unpinned)\b/i.test(workingQuery)) {
    inferredPinned = false;
    recognizedIntentions.push('Unpinned');
    workingQuery = workingQuery.replace(/\b(not\s+pinned|unpinned)\b/gi, ' ');
  } else if (/\b(pinned|pin|starred|favorites?)\b/i.test(workingQuery)) {
    inferredPinned = true;
    recognizedIntentions.push('Pinned');
    workingQuery = workingQuery.replace(/\b(pinned|pin|starred|favorites?)\b/gi, ' ');
  }

  // 3. Detect Item Type
  if (/\b(notes?|memos?|writings?)\b/i.test(workingQuery)) {
    inferredType = 'note';
    recognizedIntentions.push('Type: Notes');
    workingQuery = workingQuery.replace(/\b(notes?|memos?|writings?)\b/gi, ' ');
  } else if (/\b(links?|urls?|websites?|webpages?|articles?|bookmarks?)\b/i.test(workingQuery)) {
    inferredType = 'link';
    recognizedIntentions.push('Type: Links');
    workingQuery = workingQuery.replace(/\b(links?|urls?|websites?|webpages?|articles?|bookmarks?)\b/gi, ' ');
  } else if (/\b(images?|photos?|pictures?|pics?|screenshots?|snapshots?)\b/i.test(workingQuery)) {
    inferredType = 'image';
    recognizedIntentions.push('Type: Images');
    workingQuery = workingQuery.replace(/\b(images?|photos?|pictures?|pics?|screenshots?|snapshots?)\b/gi, ' ');
  }

  // 4. Detect Date Filters
  const now = Date.now();
  const ONE_DAY_MS = 86400000;
  const ONE_HOUR_MS = 3600000;

  if (/\b(last\s+week|past\s+week|within\s+a\s+week)\b/i.test(workingQuery)) {
    inferredDateFilter = {
      label: 'Saved in the last 7-14 days',
      sinceMs: now - ONE_DAY_MS * 14,
    };
    recognizedIntentions.push('Saved recently / last week');
    workingQuery = workingQuery.replace(/\b(last\s+week|past\s+week|within\s+a\s+week)\b/gi, ' ');
  } else if (/\b(this\s+week)\b/i.test(workingQuery)) {
    inferredDateFilter = {
      label: 'Saved this week',
      sinceMs: now - ONE_DAY_MS * 7,
    };
    recognizedIntentions.push('This week');
    workingQuery = workingQuery.replace(/\b(this\s+week)\b/gi, ' ');
  } else if (/\b(yesterday)\b/i.test(workingQuery)) {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    inferredDateFilter = {
      label: 'Saved yesterday',
      sinceMs: startOfToday - ONE_DAY_MS,
      untilMs: startOfToday,
    };
    recognizedIntentions.push('Yesterday');
    workingQuery = workingQuery.replace(/\b(yesterday)\b/gi, ' ');
  } else if (/\b(today)\b/i.test(workingQuery)) {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    inferredDateFilter = {
      label: 'Saved today',
      sinceMs: startOfToday,
    };
    recognizedIntentions.push('Today');
    workingQuery = workingQuery.replace(/\b(today)\b/gi, ' ');
  } else if (/\b(last\s+month|past\s+month)\b/i.test(workingQuery)) {
    inferredDateFilter = {
      label: 'Saved in the past month',
      sinceMs: now - ONE_DAY_MS * 31,
    };
    recognizedIntentions.push('Past month');
    workingQuery = workingQuery.replace(/\b(last\s+month|past\s+month)\b/gi, ' ');
  } else if (/\b(recently|recent)\b/i.test(workingQuery)) {
    inferredDateFilter = {
      label: 'Saved recently',
      sinceMs: now - ONE_DAY_MS * 3,
    };
    recognizedIntentions.push('Recent');
    workingQuery = workingQuery.replace(/\b(recently|recent)\b/gi, ' ');
  }

  // 5. Detect Tag filters (e.g. "tagged programming", "tag programming", "#programming")
  const tagMatch = workingQuery.match(/(?:tagged\s+as\s+|tagged\s+|tag\s+|#)([a-zA-Z0-9_-]+)/i);
  if (tagMatch) {
    inferredTag = tagMatch[1].toLowerCase();
    recognizedIntentions.push(`Tag: #${inferredTag}`);
    workingQuery = workingQuery.replace(tagMatch[0], ' ');
  } else {
    // Check if any word exactly matches a known tag from availableTags
    const tokens = workingQuery.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const match = availableTags.find((t) => t.toLowerCase() === token);
      if (match && (workingQuery.includes(`tagged ${token}`) || workingQuery.includes(`tag ${token}`))) {
        inferredTag = match;
        recognizedIntentions.push(`Tag: #${match}`);
        workingQuery = workingQuery.replace(new RegExp(`\\b${token}\\b`, 'gi'), ' ');
        break;
      }
    }
  }

  // 6. Extract remaining meaningful keywords
  const rawTokens = workingQuery
    .replace(/[^\w\s-+#]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const keywords: string[] = [];
  for (const token of rawTokens) {
    if (PRESERVED_SHORT_TERMS.has(token)) {
      keywords.push(token);
    } else if (token.length > 1 && !STOP_WORDS.has(token)) {
      keywords.push(token);
    }
  }

  if (keywords.length > 0) {
    recognizedIntentions.push(`Keywords: "${keywords.join(' ')}"`);
  }

  return {
    rawQuery: cleanRaw,
    inferredType,
    inferredPinned,
    inferredArchived,
    inferredTag,
    inferredDateFilter,
    keywords,
    recognizedIntentions,
  };
}

/**
 * Scores and filters Stash items based on parsed natural language criteria.
 * Returns matching items sorted by highest relevance score.
 */
export function filterItemsByNaturalLanguage(
  items: StashItem[],
  criteria: ParsedSearchCriteria,
  options?: {
    forceInboxOnly?: boolean;
    forceArchivedOnly?: boolean;
  }
): { matchedItems: StashItem[]; scoreMap: Map<string, number> } {
  const scoreMap = new Map<string, number>();

  const filtered = items.filter((item) => {
    // Context tab constraint (e.g. if viewing Archived screen vs Inbox screen)
    if (options?.forceArchivedOnly && !item.isArchived) {
      return false;
    }
    if (options?.forceInboxOnly && item.isArchived) {
      return false;
    }

    // Explicit inferred archive state from query (if user specifically asked for "archived" or "not archived")
    if (criteria.inferredArchived !== undefined) {
      if (item.isArchived !== criteria.inferredArchived) {
        return false;
      }
    }

    // Type filter
    if (criteria.inferredType && item.type !== criteria.inferredType) {
      return false;
    }

    // Pin status filter
    if (criteria.inferredPinned !== undefined) {
      if (Boolean(item.isPinned) !== criteria.inferredPinned) {
        return false;
      }
    }

    // Tag filter
    if (criteria.inferredTag) {
      const hasTag = item.tags.some(
        (t) => t.toLowerCase() === criteria.inferredTag?.toLowerCase()
      );
      if (!hasTag) {
        return false;
      }
    }

    // Date filter
    if (criteria.inferredDateFilter) {
      const timestamp = item.createdAt || item.updatedAt;
      if (timestamp < criteria.inferredDateFilter.sinceMs) {
        return false;
      }
      if (
        criteria.inferredDateFilter.untilMs &&
        timestamp > criteria.inferredDateFilter.untilMs
      ) {
        return false;
      }
    }

    // Keyword relevance evaluation
    if (criteria.keywords.length === 0) {
      // If query specified only filters (e.g. "show pinned notes" or "archived links"), score higher for pins/newer
      let baseScore = 10;
      if (item.isPinned) baseScore += 5;
      scoreMap.set(item.id, baseScore);
      return true;
    }

    // Calculate score based on keyword matches across title, content, tags, summary
    const titleLower = item.title.toLowerCase();
    const contentLower = item.contentOrUrl.toLowerCase();
    const tagsLower = item.tags.map((t) => t.toLowerCase());
    const summaryLower = (item.summary || '').toLowerCase();
    const takeawaysLower = (item.keyTakeaways || []).join(' ').toLowerCase();

    let score = 0;
    let matchedKeywordsCount = 0;

    for (const kw of criteria.keywords) {
      let kwMatched = false;

      // Word boundary match in title
      const titleRegex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (titleRegex.test(titleLower)) {
        score += 30;
        kwMatched = true;
      } else if (kw.length > 2 && titleLower.includes(kw)) {
        score += 15;
        kwMatched = true;
      }

      // Match in tags (exact tag or tag prefix if > 2 chars)
      if (tagsLower.includes(kw)) {
        score += 25;
        kwMatched = true;
      } else if (kw.length > 2 && tagsLower.some((t) => t.includes(kw))) {
        score += 10;
        kwMatched = true;
      }

      // Match in summary / takeaways
      const summaryRegex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (summaryRegex.test(summaryLower) || summaryRegex.test(takeawaysLower)) {
        score += 12;
        kwMatched = true;
      } else if (kw.length > 2 && (summaryLower.includes(kw) || takeawaysLower.includes(kw))) {
        score += 6;
        kwMatched = true;
      }

      // Match in content / URL
      const contentRegex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (contentRegex.test(contentLower)) {
        score += 12;
        kwMatched = true;
      } else if (kw.length > 2 && contentLower.includes(kw)) {
        score += 6;
        kwMatched = true;
      }

      if (kwMatched) {
        matchedKeywordsCount++;
      }
    }

    // Require matching all keywords for short queries (1 or 2 terms), or >= 70% for longer queries
    const isStrongMatch =
      criteria.keywords.length <= 2
        ? matchedKeywordsCount === criteria.keywords.length
        : matchedKeywordsCount / criteria.keywords.length >= 0.7;

    if (isStrongMatch && score > 0) {
      if (item.isPinned) score += 3;
      scoreMap.set(item.id, score);
      return true;
    }

    return false;
  });

  // Sort matched items descending by relevance score, then by recency
  filtered.sort((a, b) => {
    const scoreA = scoreMap.get(a.id) || 0;
    const scoreB = scoreMap.get(b.id) || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
  });

  return { matchedItems: filtered, scoreMap };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helpful natural language example search prompts for quick suggestions.
 */
export const NATURAL_LANGUAGE_SUGGESTIONS = [
  'Find my C programming notes',
  'Show internship links I saved',
  'Find the design inspiration I saved last week',
  'Show pinned items about college',
  'Find items tagged programming that are not archived',
];
