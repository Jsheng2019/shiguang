import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, SearchResult } from '../services/api';
import VideoCard from '../components/VideoCard';
import { storage } from '../services/storage';
import { useI18n } from '../services/i18n';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { t, toggleLang } = useI18n();
  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const isTV = Platform.isTV;

  // Load search history and favorites from storage on mount and focus
  useEffect(() => {
    loadStorage();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStorage();
    }, []),
  );

  const loadStorage = useCallback(async () => {
    const [history, favs] = await Promise.all([
      storage.getSearchHistory(),
      storage.getFavorites(),
    ]);
    setRecentSearches(history);
    setFavoritesCount(favs.length);
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const data = await api.search('movie');
      setTrending(data.slice(0, 10));
    } catch {
      // silent fail for initial load
    } finally {
      setTrendingLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  const handleSearch = useCallback(async () => {
    if (query.trim()) {
      const trimmed = query.trim();
      await storage.addSearchHistory(trimmed);
      setRecentSearches(await storage.getSearchHistory());
      navigation.navigate('Search', { query: trimmed });
    }
  }, [query, navigation]);

  const handleRecentPress = useCallback(
    async (q: string) => {
      setQuery(q);
      await storage.addSearchHistory(q);
      setRecentSearches(await storage.getSearchHistory());
      navigation.navigate('Search', { query: q });
    },
    [navigation],
  );

  const handleRemoveRecent = useCallback(
    async (q: string) => {
      await storage.removeSearchHistory(q);
      setRecentSearches(await storage.getSearchHistory());
    },
    [],
  );

  const handleClearRecent = useCallback(async () => {
    await storage.clearSearchHistory();
    setRecentSearches([]);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrending();
  }, [loadTrending]);

  const handleTrendingPress = useCallback(
    (item: SearchResult) => {
      navigation.navigate('Detail', { item });
    },
    [navigation],
  );

  const quickLinks = [
    { label: t('movie'), query: 'movie', color: Colors.primary },
    { label: t('series'), query: 'series', color: Colors.secondary },
    { label: t('documentary'), query: 'documentary', color: Colors.success },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerSection}>
              {/* Lang toggle top-right */}
              <View style={styles.topBar}>
                <View />
                <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
                  <Text style={styles.langBtnText}>{t('langSwitch')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.header}>
                <Text style={styles.logo}>{t('appName')}</Text>
                <Text style={styles.tagline}>{t('tagline')}</Text>
              </View>

              <Text style={styles.label}>{t('searchPlaceholder')}</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, isTV && styles.tvInput]}
                  placeholder={t('searchPlaceholder')}
                  placeholderTextColor={Colors.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
                  <Text style={styles.searchBtnText}>{t('searchBtn')}</Text>
                </TouchableOpacity>
              </View>

              {/* Quick browse links */}
              <Text style={styles.sectionTitle}>{t('browse')}</Text>
              <View style={styles.linksRow}>
                {quickLinks.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.linkCard, { borderLeftColor: item.color }]}
                    onPress={() => handleRecentPress(item.query)}
                  >
                    <Text style={styles.linkLabel}>{item.label}</Text>
                    <Text style={styles.linkArrow}>{'>'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <View style={styles.recentSection}>
                  <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>{t('recentSearches')}</Text>
                    <TouchableOpacity onPress={handleClearRecent}>
                      <Text style={styles.clearText}>{t('clear')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.recentChips}>
                    {recentSearches.map((q) => (
                      <View key={q} style={styles.chipRow}>
                        <TouchableOpacity
                          style={styles.chip}
                          onPress={() => handleRecentPress(q)}
                        >
                          <Text style={styles.chipText}>{q}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.chipX}
                          onPress={() => handleRemoveRecent(q)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.chipXText}>X</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Favorites entry */}
              {favoritesCount > 0 && (
                <TouchableOpacity
                  style={styles.favEntry}
                  onPress={() => navigation.navigate('Favorites')}
                >
                  <Text style={styles.favEntryIcon}>♡</Text>
                  <View style={styles.favEntryInfo}>
                    <Text style={styles.favEntryTitle}>{t('favorites')}</Text>
                    <Text style={styles.favEntryCount}>
                      {favoritesCount} {favoritesCount > 1 ? 'items' : 'item'}
                    </Text>
                  </View>
                  <Text style={styles.favEntryArrow}>{'>'}</Text>
                </TouchableOpacity>
              )}

              {/* Trending header */}
              <View style={styles.trendingHeader}>
                <Text style={styles.sectionTitle}>{t('trending')}</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                  <Text style={styles.refreshText}>
                    {refreshing ? '...' : t('refresh')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        data={trendingLoading ? Array(6).fill(null) : trending}
        renderItem={({ item }) =>
          trendingLoading ? (
            <VideoCard
              item={{} as SearchResult}
              onPress={() => {}}
              isTV={isTV}
              skeleton
            />
          ) : (
            <VideoCard
              item={item}
              onPress={() => handleTrendingPress(item)}
              isTV={isTV}
            />
          )
        }
        keyExtractor={(_item, idx) =>
          'trending-' + (_item && 'title' in _item ? (_item as SearchResult).title : String(idx))
        }
        numColumns={isTV ? 4 : 2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={!isTV ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 6,
  },
  langBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 24,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.primary,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 10,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 16,
  },
  tvInput: {
    height: 56,
    fontSize: 20,
  },
  searchBtn: {
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  linksRow: {
    marginBottom: 24,
  },
  linkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 18,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  linkLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  linkArrow: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    paddingLeft: 14,
  },
  chip: {
    paddingVertical: 8,
  },
  chipText: {
    color: Colors.text,
    fontSize: 13,
  },
  chipX: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  chipXText: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
  },
  favEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  favEntryIcon: {
    fontSize: 24,
    color: Colors.primary,
  },
  favEntryInfo: {
    flex: 1,
  },
  favEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  favEntryCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  favEntryArrow: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    marginBottom: 12,
  },
  refreshText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-around',
  },
});
