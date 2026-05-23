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
import BannerCarousel from '../components/BannerCarousel';
import CategoryGrid from '../components/CategoryGrid';
import HorizontalScrollList from '../components/HorizontalScrollList';
import LatestSection from '../components/LatestSection';

export default function HomeScreen() {
  const { t, toggleLang } = useI18n();
  const navigation = useNavigation<any>();
  const [homeData, setHomeData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSeeAllCategory = useCallback(
    (type: VideoType) => {
      navigation.navigate('Category', { type });
    },
    [navigation],
  );

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
        {/* Header: logo + lang toggle */}
        <View style={styles.header}>
          <Text style={styles.logo}>{t('appName')}</Text>
          <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
            <Text style={styles.langBtnText}>{t('langSwitch')}</Text>
          </TouchableOpacity>
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
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
});
