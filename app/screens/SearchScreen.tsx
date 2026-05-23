import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { api, SearchResult } from '../services/api';
import VideoCard from '../components/VideoCard';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/colors';

type SearchParams = {
  Search: { query: string };
};

const SUGGESTIONS = ['action', 'comedy', 'drama', 'thriller', 'sci-fi', 'animation'];
const DEBOUNCE_MS = 400;
const PAGE_SIZE = 20;

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SearchParams, 'Search'>>();
  const initialQuery = route.params?.query ?? '';
  const { t } = useI18n();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTV = Platform.isTV;

  const doSearch = useCallback(async (q: string, pageNum = 1, append = false) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      setInitialLoading(false);
      return;
    }
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await api.search(q.trim(), pageNum, PAGE_SIZE);
      if (append) {
        setResults((prev) => [...prev, ...data.results]);
      } else {
        setResults(data.results);
      }
      setHasMore(pageNum * PAGE_SIZE < data.total);
      setPage(pageNum);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed. Check your connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setInitialLoading(false);
    }
  }, []);

  // Initial search on mount
  useEffect(() => {
    doSearch(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on query change (resets pagination)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      doSearch(query, page + 1, true);
    }
  }, [hasMore, loadingMore, loading, query, page, doSearch]);

  const handlePress = (item: SearchResult) => {
    navigation.navigate('Detail', { item });
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <VideoCard item={item} onPress={() => handlePress(item)} isTV={isTV} />
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      );
    }
    if (!hasMore && results.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('noMore')}</Text>
        </View>
      );
    }
    return null;
  };

  const renderSkeleton = () => {
    const skeletons = Array(6).fill(null);
    return (
      <FlatList
        data={skeletons}
        renderItem={() => (
          <VideoCard
            item={{} as SearchResult}
            onPress={() => {}}
            isTV={isTV}
            skeleton
          />
        )}
        keyExtractor={(_, idx) => 'skeleton-' + String(idx)}
        numColumns={isTV ? 4 : 2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={!isTV ? styles.row : undefined}
        scrollEnabled={false}
      />
    );
  };

  const showEmpty =
    !loading && !initialLoading && !error && results.length === 0 && query.trim() !== '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={[styles.input, isTV && styles.tvInput]}
          placeholder="Search..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query)}
        />
      </View>

      {/* Skeleton loading state */}
      {initialLoading && renderSkeleton()}

      {/* Spinner overlay when refining search */}
      {loading && !initialLoading && (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.centerPad}
        />
      )}

      {/* Error state */}
      {error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => doSearch(query)} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state with suggestions */}
      {showEmpty && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>?</Text>
          <Text style={styles.emptyTitle}>{t('noResults')}</Text>
          <Text style={styles.emptySub}>{t('noResultsHint')}</Text>
          <View style={styles.suggestionRow}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => handleSuggestion(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results grid with infinite scroll */}
      {!initialLoading && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(_, idx) => String(idx)}
          numColumns={isTV ? 4 : 2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={!isTV ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    height: 44,
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
  centerPad: {
    paddingVertical: 40,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.text,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySub: {
    color: Colors.textTertiary,
    fontSize: 14,
    marginBottom: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  list: {
    padding: 8,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-around',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
});
