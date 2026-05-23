import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useI18n } from '../services/i18n';
import {
  api,
  CarouselItem,
  SearchResult,
  VideoType,
  HomePageData,
} from '../services/api';
import { watchHistory, WatchRecord } from '../services/watch-history';
import BannerCarousel from '../components/BannerCarousel';
import CategoryGrid from '../components/CategoryGrid';
import HorizontalScrollList from '../components/HorizontalScrollList';
import LatestSection from '../components/LatestSection';
import VideoCard from '../components/VideoCard';

function formatProgress(ms: number, duration: number): string {
  if (duration <= 0) return '';
  const pct = Math.round((ms / duration) * 100);
  return `${Math.min(pct, 99)}%`;
}

export default function HomeScreen() {
  const { t, toggleLang } = useI18n();
  const navigation = useNavigation<any>();
  const [homeData, setHomeData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchRecords, setWatchRecords] = useState<WatchRecord[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getHome();
        setHomeData(data);
      } catch {
        // api.getHome() falls back to demo data internally
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    watchHistory.getHistory().then((records) => {
      setWatchRecords(records.slice(0, 6));
    });
  }, []);

  const handleBannerPress = useCallback(
    (item: CarouselItem) => {
      navigation.navigate('Detail', { item });
    },
    [navigation],
  );

  const handleCategoryPress = useCallback(
    (type: VideoType) => {
      navigation.navigate('Category', { type });
    },
    [navigation],
  );

  const handleItemPress = useCallback(
    (item: SearchResult) => {
      navigation.navigate('Detail', { item });
    },
    [navigation],
  );

  const handleHistoryPress = useCallback(
    (record: WatchRecord) => {
      navigation.navigate('Detail', {
        item: {
          sourceUrl: record.url,
          title: record.title,
          poster: record.poster,
          type: 'movie',
          sources: [],
          sourceName: '',
        } as SearchResult,
      });
    },
    [navigation],
  );

  const handleSeeAllCategory = useCallback(
    (type: VideoType) => {
      navigation.navigate('Category', { type });
    },
    [navigation],
  );

  const handleFavoritesPress = useCallback(() => {
    navigation.navigate('Favorites');
  }, [navigation]);

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header: logo + action buttons */}
        <View style={styles.header}>
          <Text style={styles.logo}>{t('appName')}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleFavoritesPress} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>{t('favorites')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
              <Text style={styles.langBtnText}>{t('langSwitch')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar — tappable, navigates to SearchScreen */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Search', { query: '' })}
        >
          <Text style={styles.searchPlaceholder}>{t('searchPlaceholder')}</Text>
        </TouchableOpacity>

        {/* Banner carousel */}
        <BannerCarousel
          items={homeData?.banners ?? []}
          onPress={handleBannerPress}
        />

        {/* Category grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('categories')}</Text>
        </View>
        <CategoryGrid
          categories={homeData?.categories ?? []}
          onPress={handleCategoryPress}
        />

        {/* Continue watching */}
        {watchRecords.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('continueWatching')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Favorites')}>
                <Text style={styles.seeAllText}>{t('watchHistory')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyRow}>
              {watchRecords.map((record) => {
                const pct = formatProgress(record.position, record.duration);
                return (
                  <TouchableOpacity
                    key={record.url}
                    style={styles.historyCard}
                    activeOpacity={0.7}
                    onPress={() => handleHistoryPress(record)}
                  >
                    <View style={styles.historyPoster}>
                      {record.poster ? (
                        <View style={styles.historyPosterInner}>
                          <Text style={styles.historyPosterPlaceholder}>🎬</Text>
                        </View>
                      ) : (
                        <View style={styles.historyPosterInner} />
                      )}
                      {pct ? (
                        <View style={styles.historyProgressBadge}>
                          <Text style={styles.historyProgressText}>{pct}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {record.title}
                    </Text>
                    <Text style={styles.historySub}>{t('resume')}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Hot ranking */}
        <HorizontalScrollList
          title={t('hotRanking')}
          items={homeData?.hotList ?? []}
          onPress={handleItemPress}
        />

        {/* Latest updates by category */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('latestUpdates')}</Text>
        </View>
        <LatestSection
          sections={homeData?.latestByCategory ?? []}
          onPress={handleItemPress}
          onSeeAll={handleSeeAllCategory}
        />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 6,
  },
  headerBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchPlaceholder: {
    color: Colors.textTertiary,
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  historyRow: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  historyCard: {
    marginRight: 12,
    width: 120,
  },
  historyPoster: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPosterInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPosterPlaceholder: {
    fontSize: 24,
  },
  historyProgressBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyProgressText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  historyTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  historySub: {
    color: Colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
});
