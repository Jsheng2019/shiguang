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
import { useNavigation } from '@react-navigation/native';
import { api, SearchResult } from '../services/api';
import VideoCard from '../components/VideoCard';

const MAX_RECENT = 5;

type RecentSearch = { query: string; timestamp: number };

// Simple in-memory fallback if AsyncStorage not available
let globalRecentSearches: RecentSearch[] = [];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => globalRecentSearches);
  const [refreshing, setRefreshing] = useState(false);
  const isTV = Platform.isTV;

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

  const updateRecent = (updated: RecentSearch[]) => {
    setRecentSearches(updated);
    globalRecentSearches = updated;
  };

  const handleSearch = () => {
    if (query.trim()) {
      const trimmed = query.trim();
      const updated = [
        { query: trimmed, timestamp: Date.now() },
        ...recentSearches.filter((s) => s.query !== trimmed),
      ].slice(0, MAX_RECENT);
      updateRecent(updated);
      navigation.navigate('Search', { query: trimmed });
    }
  };

  const handleRecentPress = (q: string) => {
    setQuery(q);
    const updated = [
      { query: q, timestamp: Date.now() },
      ...recentSearches.filter((s) => s.query !== q),
    ].slice(0, MAX_RECENT);
    updateRecent(updated);
    navigation.navigate('Search', { query: q });
  };

  const handleClearRecent = () => {
    updateRecent([]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTrending();
  };

  const handleTrendingPress = (item: SearchResult) => {
    navigation.navigate('Detail', { item });
  };

  const quickLinks = [
    { label: 'Movies', query: 'movie', color: Colors.primary },
    { label: 'Series', query: 'series', color: Colors.secondary },
    { label: 'Documentary', query: 'documentary', color: Colors.success },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerSection}>
              <View style={styles.header}>
                <Text style={styles.logo}>Video App</Text>
                <Text style={styles.tagline}>Search and stream videos</Text>
              </View>

              <Text style={styles.label}>What do you want to watch?</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, isTV && styles.tvInput]}
                  placeholder="Search movies, series..."
                  placeholderTextColor={Colors.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
                  <Text style={styles.searchBtnText}>Go</Text>
                </TouchableOpacity>
              </View>

              {/* Quick browse links */}
              <Text style={styles.sectionTitle}>Browse</Text>
              <View style={styles.linksRow}>
                {quickLinks.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.linkCard, { borderLeftColor: item.color }]}
                    onPress={() => {
                      handleRecentPress(item.query);
                    }}
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
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={handleClearRecent}>
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.recentChips}>
                    {recentSearches.map((s) => (
                      <TouchableOpacity
                        key={s.query}
                        style={styles.chip}
                        onPress={() => handleRecentPress(s.query)}
                      >
                        <Text style={styles.chipText}>{s.query}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Trending header */}
              <View style={styles.trendingHeader}>
                <Text style={styles.sectionTitle}>Trending</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                  <Text style={styles.refreshText}>{refreshing ? '...' : 'Refresh'}</Text>
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
  chip: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    color: Colors.text,
    fontSize: 13,
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
