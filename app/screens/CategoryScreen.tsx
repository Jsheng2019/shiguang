import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useI18n, TranslationKey } from '../services/i18n';
import { api, SearchResult, VideoType } from '../services/api';

type Region = 'mainland' | 'hongkong_taiwan' | 'japan_korea' | 'west' | 'other';
type SortMode = 'latest' | 'hot' | 'rating';

const DECADES = [2020, 2010, 2000, 1990, 1980, 1970];

const REGIONS: { key: Region | 'all'; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'mainland', labelKey: 'mainland' },
  { key: 'hongkong_taiwan', labelKey: 'hongkong_taiwan' },
  { key: 'japan_korea', labelKey: 'japan_korea' },
  { key: 'west', labelKey: 'west' },
  { key: 'other', labelKey: 'otherRegion' },
];

const SORTS: { key: SortMode; labelKey: TranslationKey }[] = [
  { key: 'latest', labelKey: 'sortLatest' },
  { key: 'hot', labelKey: 'sortHot' },
  { key: 'rating', labelKey: 'sortRating' },
];

function GridCard({
  item,
  onPress,
}: {
  item: SearchResult;
  onPress: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <TouchableOpacity
      style={gridStyles.container}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={gridStyles.posterContainer}>
        {item.poster && !imgFailed ? (
          <Image
            source={{ uri: item.poster }}
            style={gridStyles.poster}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={[gridStyles.poster, gridStyles.placeholder]} />
        )}
        {item.rating != null && (
          <View style={gridStyles.ratingBadge}>
            <Text style={gridStyles.ratingText}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <Text style={gridStyles.title} numberOfLines={2} ellipsizeMode="tail">
        {item.title}
      </Text>
      {item.year && (
        <Text style={gridStyles.year}>{item.year}</Text>
      )}
    </TouchableOpacity>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 16,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
  },
  placeholder: {
    backgroundColor: Colors.surface,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  ratingText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  year: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
});

export default function CategoryScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Category: { type: VideoType } }, 'Category'>>();
  const videoType = route.params.type;

  const [items, setItems] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [region, setRegion] = useState<Region | undefined>();
  const [decade, setDecade] = useState<number | undefined>();
  const [sort, setSort] = useState<SortMode>('latest');

  const fetchData = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const res = await api.browse({
          type: videoType,
          region,
          decade,
          sort,
          page: pageNum,
          pageSize: 20,
        });
        if (append) {
          setItems((prev) => [...prev, ...res.items]);
        } else {
          setItems(res.items);
        }
        setHasMore(res.hasMore);
        setPage(pageNum);
      } catch {
        // fallback handled by api.browse()
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [videoType, region, decade, sort],
  );

  useEffect(() => {
    fetchData(1, false);
  }, [fetchData]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      fetchData(page + 1, true);
    }
  }, [hasMore, loadingMore, loading, page, fetchData]);

  const handleRegionChange = useCallback((r: Region | 'all') => {
    setRegion(r === 'all' ? undefined : r);
  }, []);

  const handleDecadeChange = useCallback((d: number | undefined) => {
    setDecade(d);
  }, []);

  const handleSortChange = useCallback((s: SortMode) => {
    setSort(s);
  }, []);

  const renderFilterBar = () => (
    <View style={styles.filterSection}>
      {/* Region filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>{t('region')}</Text>
        <View style={styles.chipRow}>
          {REGIONS.map((r) => {
            const active =
              r.key === 'all'
                ? region === undefined
                : region === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleRegionChange(r.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(r.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Decade filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>{t('year')}</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, decade === undefined && styles.chipActive]}
            onPress={() => handleDecadeChange(undefined)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                decade === undefined && styles.chipTextActive,
              ]}
            >
              {t('all')}
            </Text>
          </TouchableOpacity>
          {DECADES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, decade === d && styles.chipActive]}
              onPress={() => handleDecadeChange(d)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.chipText, decade === d && styles.chipTextActive]}
              >
                {d}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sort filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>{t('sortBy')}</Text>
        <View style={styles.chipRow}>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleSortChange(s.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(s.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: SearchResult }) => (
    <GridCard
      item={item}
      onPress={() => navigation.navigate('Detail', { item })}
    />
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      );
    }
    if (!hasMore && items.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('noMore')}</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item, i) => `${item.sourceUrl}-${i}`}
        numColumns={2}
        ListHeaderComponent={renderFilterBar}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noResults')}</Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnRow}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  columnRow: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 15,
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
