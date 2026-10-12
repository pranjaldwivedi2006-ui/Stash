/**
 * Local time periods:
 * - Morning: 5:00 AM to before 12:00 PM
 * - Afternoon: 12:00 PM to before 5:00 PM (17:00)
 * - Evening: 5:00 PM (17:00) to before 9:00 PM (21:00)
 * - Late night: 9:00 PM (21:00) to before 5:00 AM
 */
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'lateNight';

export function getCurrentTimePeriod(date: Date = new Date()): TimePeriod {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return 'morning';
  }
  if (hours >= 12 && hours < 17) {
    return 'afternoon';
  }
  if (hours >= 17 && hours < 21) {
    return 'evening';
  }
  return 'lateNight';
}

export function getGreetingText(name?: string | null, date: Date = new Date()): string {
  const period = getCurrentTimePeriod(date);
  const trimmedName = name?.trim();

  if (trimmedName) {
    switch (period) {
      case 'morning':
        return `Good morning, ${trimmedName} ☀️`;
      case 'afternoon':
        return `Good afternoon, ${trimmedName} 🌤️`;
      case 'evening':
        return `Good evening, ${trimmedName} 🌆`;
      case 'lateNight':
        return `Still up, ${trimmedName}? 🌙 What are we saving today?`;
    }
  }

  // Nameless friendly greeting
  switch (period) {
    case 'morning':
      return 'Good morning ☀️';
    case 'afternoon':
      return 'Good afternoon 🌤️';
    case 'evening':
      return 'Good evening 🌆';
    case 'lateNight':
      return 'Still up? 🌙 What are we saving today?';
  }
}

/**
 * Contextual, conversational messages that welcome the user.
 * Kept stable within a session (keyed to session or time period).
 */
export const CONTEXTUAL_PROMPTS = [
  'What are we saving today?',
  "Found something interesting? Let's stash it.",
  "What's on your mind today?",
  'A new note, a useful link, or a little inspiration?',
  'Ready to save something for later?',
  'Your ideas have a home here.',
  'Welcome back! Want to pick up where you left off?',
];

export function getContextualPrompt(options?: {
  itemCount?: number;
  pinnedCount?: number;
  period?: TimePeriod;
  sessionSeed?: number;
}): string {
  const { itemCount = 0, pinnedCount = 0, period, sessionSeed = 0 } = options || {};

  if (itemCount === 0) {
    return 'Your ideas have a home here. Ready to stash your first item?';
  }

  if (period === 'lateNight') {
    return "Found something interesting? Let's stash it.";
  }

  if (pinnedCount > 0 && sessionSeed % 3 === 0) {
    return 'Welcome back! Want to pick up where you left off?';
  }

  // Stable selection based on session seed so it doesn't change on small clicks
  const index = Math.abs(sessionSeed) % CONTEXTUAL_PROMPTS.length;
  return CONTEXTUAL_PROMPTS[index];
}
