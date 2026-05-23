import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchResult } from './api';

const KEYS = {
  searchHistory: '@videoapp/search_history',
  favorites: '@videoapp/favorites',
};

const MAX_HISTORY = 10;

class StorageService {
  async getSearchHistory(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.searchHistory);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  async addSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const updated = [query, ...history.filter((h) => h !== query)].slice(
        0,
        MAX_HISTORY,
      );
      await AsyncStorage.setItem(KEYS.searchHistory, JSON.stringify(updated));
    } catch {
      // silent failure — persistence is best-effort
    }
  }

  async removeSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const updated = history.filter((h) => h !== query);
      await AsyncStorage.setItem(KEYS.searchHistory, JSON.stringify(updated));
    } catch {
      // silent failure
    }
  }

  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.searchHistory);
    } catch {
      // silent failure
    }
  }

  async getFavorites(): Promise<SearchResult[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.favorites);
      return raw ? (JSON.parse(raw) as SearchResult[]) : [];
    } catch {
      return [];
    }
  }

  async addFavorite(item: SearchResult): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const exists = favorites.some((f) => f.sourceUrl === item.sourceUrl);
      if (!exists) {
        favorites.unshift(item);
        await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
      }
    } catch {
      // silent failure
    }
  }

  async removeFavorite(sourceUrl: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updated = favorites.filter((f) => f.sourceUrl !== sourceUrl);
      await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(updated));
    } catch {
      // silent failure
    }
  }

  async isFavorite(sourceUrl: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some((f) => f.sourceUrl === sourceUrl);
    } catch {
      return false;
    }
  }
}

export const storage = new StorageService();
