import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@videoapp/watch_history';
const MAX_RECORDS = 50;

export interface WatchRecord {
  url: string;
  title: string;
  poster?: string;
  position: number;
  duration: number;
  watchedAt: number;
}

class WatchHistoryService {
  async getHistory(): Promise<WatchRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as WatchRecord[]) : [];
    } catch {
      return [];
    }
  }

  async addRecord(record: WatchRecord): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter((h) => h.url !== record.url);
      const updated = [record, ...filtered].slice(0, MAX_RECORDS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // silent failure
    }
  }

  async updateProgress(
    url: string,
    title: string,
    poster: string | undefined,
    position: number,
    duration: number,
  ): Promise<void> {
    if (duration <= 0 || position <= 0) return;
    await this.addRecord({ url, title, poster, position, duration, watchedAt: Date.now() });
  }

  async getResumePosition(url: string): Promise<WatchRecord | null> {
    try {
      const history = await this.getHistory();
      return history.find((h) => h.url === url) ?? null;
    } catch {
      return null;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // silent failure
    }
  }
}

export const watchHistory = new WatchHistoryService();
