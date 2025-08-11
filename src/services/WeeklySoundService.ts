import LocalStorageManager from './LocalStorageManager';
import WebStorageService from './WebStorageService';
import { MoodEntry, GeneratedMusic } from '../types';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

export interface WeeklySelection {
  weekStart: number; // Monday 00:00:00 of target week (ms)
  weekEnd: number;   // Sunday 23:59:59.999 of target week (ms)
  selectedMusicId: string;
  selectedAt: number; // timestamp
}

class WeeklySoundService {
  private getStorageKey(userId: string) {
    return `weekly_sound_selections_${userId}`;
  }

  getMondayStart(dateMs: number): number {
    const d = new Date(dateMs);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diffToMonday = day === 0 ? -6 : 1 - day; // if Sunday, go back 6
    d.setDate(d.getDate() + diffToMonday);
    return d.getTime();
  }

  getWeekRange(weekStartMs: number): { weekStart: number; weekEnd: number } {
    const weekStart = weekStartMs;
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1; // Sunday end
    return { weekStart, weekEnd };
  }

  getCurrentWeekStart(): number {
    return this.getMondayStart(Date.now());
  }

  getLastWeekStart(): number {
    return this.getCurrentWeekStart() - 7 * 24 * 60 * 60 * 1000;
  }

  getSelectionWindowForWeek(weekStart: number): { windowStart: number; windowEnd: number } {
    // Window opens next Monday and lasts 7 days
    const windowStart = weekStart + 7 * 24 * 60 * 60 * 1000;
    const windowEnd = windowStart + 7 * 24 * 60 * 60 * 1000 - 1;
    return { windowStart, windowEnd };
  }

  isSelectionWindowOpen(weekStart: number, now: number = Date.now()): boolean {
    const { windowStart, windowEnd } = this.getSelectionWindowForWeek(weekStart);
    return now >= windowStart && now <= windowEnd;
  }

  async getWeeklySelections(userId: string): Promise<WeeklySelection[]> {
    try {
      if (isWeb) {
        const data = await WebStorageService.retrieveDataGeneric<WeeklySelection[]>(this.getStorageKey(userId));
        return data || [];
      }
      const data = await LocalStorageManager.retrieveData<WeeklySelection[]>(this.getStorageKey(userId), false);
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async saveWeeklySelection(userId: string, weekStart: number, musicId: string): Promise<void> {
    const { weekEnd } = this.getWeekRange(weekStart);
    const selections = await this.getWeeklySelections(userId);
    const idx = selections.findIndex(s => s.weekStart === weekStart);
    const updated: WeeklySelection = { weekStart, weekEnd, selectedMusicId: musicId, selectedAt: Date.now() };
    if (idx >= 0) selections[idx] = updated; else selections.push(updated);
    if (isWeb) {
      await WebStorageService.storeDataGeneric(this.getStorageKey(userId), selections, false);
    } else {
      await LocalStorageManager.storeData(this.getStorageKey(userId), selections, false);
    }
  }

  async getSoundsForWeek(userId: string, weekStart: number): Promise<GeneratedMusic[]> {
    const { weekStart: start, weekEnd: end } = this.getWeekRange(weekStart);
    // Get mood entries for the user
    let entries: MoodEntry[] = [];
    if (isWeb) {
      const Web = WebStorageService as any;
      entries = await Web.retrieveMoodEntries(userId);
    } else {
      entries = await LocalStorageManager.retrieveMoodEntries(userId);
    }
    const musicIds = entries
      .filter(e => e.musicGenerated && e.musicId && e.timestamp >= start && e.timestamp <= end)
      .map(e => e.musicId as string);

    const musicPromises = musicIds.map(id =>
      isWeb ? WebStorageService.retrieveGeneratedMusic(userId, id) : LocalStorageManager.retrieveGeneratedMusic(userId, id)
    );
    const results = await Promise.all(musicPromises);
    return results.filter((m): m is GeneratedMusic => !!m);
  }

  formatWeekRange(weekStart: number): string {
    const { weekStart: s, weekEnd: e } = this.getWeekRange(weekStart);
    const sd = new Date(s); const ed = new Date(e);
    const fmt = (d: Date) => d.toLocaleDateString();
    return `${fmt(sd)} - ${fmt(ed)}`;
  }
}

export default new WeeklySoundService();


