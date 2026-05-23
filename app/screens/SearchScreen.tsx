import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors } from '../theme/colors';

type SearchParams = {
  Search: { query: string };
};

const DEBOUNCE_MS = 500;

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SearchParams, 'Search'>>();
  const initialQuery = route.params?.query ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTV = Platform.isTV;

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.search(q.trim());
      setResults(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handlePress = (item: SearchResult) => {
    navigation.navigate('Detail', { item });
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <VideoCard item={item} onPress={() => handlePress(item)} isTV={isTV} />
  );

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
        />
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.centerPad}
        />
      )}

      {error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => doSearch(query)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && results.length === 0 && query.trim() !== '' && (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(_, idx) => String(idx)}
        numColumns={isTV ? 4 : 2}
        contentContainerStyle={styles.list}
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
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
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
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  list: {
    padding: 8,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-around',
  },
});
