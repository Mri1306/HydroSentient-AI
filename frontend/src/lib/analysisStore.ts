import { AnalysisResult } from "@/services/api";

const LAST_KEY = "hydrosentient.lastAnalysis";
const HISTORY_KEY = "hydrosentient.history";
const MAX_HISTORY = 50;

export interface HistoryEntry {
  id: string;
  savedAt: number;
  inputParams: Record<string, number>;
  result: AnalysisResult;
}

/**
 * Persists the most recent analysis result to sessionStorage so the
 * Dashboard and Visualizations pages can show it immediately without
 * waiting on (or depending on) the backend's in-memory cache, and so
 * results survive page navigation/reload within the same tab.
 */
export function saveLastAnalysis(result: AnalysisResult): void {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify({ result, savedAt: Date.now() }));
  } catch {
    // sessionStorage may be unavailable (e.g. private browsing) — fail silently.
  }
}

export function loadLastAnalysis(): { result: AnalysisResult; savedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLastAnalysis(): void {
  try {
    sessionStorage.removeItem(LAST_KEY);
  } catch {
    // ignore
  }
}

/**
 * Appends an analysis run to the session history log (most recent first),
 * capped at MAX_HISTORY entries.
 */
export function addHistoryEntry(inputParams: Record<string, number>, result: AnalysisResult): HistoryEntry {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    inputParams,
    result,
  };
  try {
    const history = loadHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
  return entry;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try {
    sessionStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  return loadHistory().find((e) => e.id === id) || null;
}
