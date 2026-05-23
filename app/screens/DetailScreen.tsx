import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { api, SearchResult, VideoSource } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import { Colors } from '../theme/colors';
import { storage } from '../services/storage';
import { useI18n } from '../services/i18n';

type DetailParams = {
  Detail: { item: SearchResult };
};

interface QualityGroup {
  quality: string;
  sources: VideoSource[];
}

function groupByQuality(sources: VideoSource[]): QualityGroup[] {
  const map: Record<string, VideoSource[]> = {};
  const order = ['1080p', '720p', '480p', '360p'];
  for (const s of sources) {
    if (!map[s.quality]) map[s.quality] = [];
    map[s.quality].push(s);
  }
  return order.filter((q) => map[q]).map((q) => ({ quality: q, sources: map[q] }));
}

function RatingDisplay({ rating }: { rating: number }) {
  const stars =
    rating >= 8
      ? '★★★★★'
      : rating >= 6
        ? '★★★★'
        : rating >= 4
          ? '★★★'
          : '★★';
  const color =
    rating >= 7
      ? Colors.success
      : rating >= 5
        ? Colors.warning
        : Colors.textSecondary;
  const fill = Math.min(rating / 10, 1);

  return (
    <View style={ratingStyles.container}>
      <View style={[ratingStyles.bar, { backgroundColor: Colors.surface }]}>
        <View
          style={[
            ratingStyles.fill,
            {
              width: `${fill * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={[ratingStyles.stars, { color }]}>{stars}</Text>
      <Text style={[ratingStyles.num, { color }]}>{rating.toFixed(1)} / 10</Text>
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  stars: {
    fontSize: 14,
  },
  num: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default function DetailScreen() {
  const route = useRoute<RouteProp<DetailParams, 'Detail'>>();
  const navigation = useNavigation<any>();
  const initialItem = route.params?.item;
  const { t } = useI18n();
  const isTV = Platform.isTV;

  const [detail, setDetail] = useState<SearchResult | null>(initialItem);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingSource, setPlayingSource] = useState<VideoSource | null>(null);
  const [isFav, setIsFav] = useState(false);

  // Load detail and check favorite status on mount
  useEffect(() => {
    if (initialItem) {
      storage.isFavorite(initialItem.sourceUrl).then(setIsFav);
    }
    loadDetail();
  }, []);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDetail(initialItem.sourceUrl, initialItem.sourceName);
      if (data) setDetail(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('videoError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback(async () => {
    if (!detail) return;
    if (isFav) {
      await storage.removeFavorite(detail.sourceUrl);
      setIsFav(false);
    } else {
      await storage.addFavorite(detail);
      setIsFav(true);
    }
  }, [detail, isFav]);

  // Set up header right button for favorite
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
          <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
            {isFav ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, toggleFavorite, isFav]);

  if (playingSource) {
    return (
      <SafeAreaView style={styles.container}>
        <VideoPlayer source={playingSource} onClose={() => setPlayingSource(null)} />
      </SafeAreaView>
    );
  }

  const qualityGroups = detail?.sources ? groupByQuality(detail.sources) : [];
  const showDescription = detail?.description && detail.description.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Poster + Info hero section */}
        <View style={[styles.hero, isTV && styles.tvHero]}>
          {detail?.poster ? (
            <Image
              source={{ uri: detail.poster }}
              style={[styles.poster, isTV && styles.tvPoster]}
            />
          ) : (
            <View style={[styles.posterPlaceholder, isTV && styles.tvPoster]} />
          )}
          <View style={[styles.heroInfo, isTV && styles.tvHeroInfo]}>
            <Text style={[styles.title, isTV && styles.tvTitle]}>
              {detail?.title ?? ''}
            </Text>
            <View style={styles.metaRow}>
              {detail?.year && <Text style={styles.meta}>{detail.year}</Text>}
              {detail?.type && (
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        detail.type === 'movie' ? Colors.primary : Colors.secondary,
                    },
                  ]}
                >
                  <Text style={styles.typeBadgeText}>{detail.type}</Text>
                </View>
              )}
              {detail?.country && (
                <Text style={styles.meta}>{detail.country}</Text>
              )}
            </View>
            {detail?.rating != null && <RatingDisplay rating={detail.rating} />}
            <Text style={styles.sourceLine}>
              {t('sources')}: {detail?.sourceName}
            </Text>
          </View>
        </View>

        {/* Description section */}
        {showDescription && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>{t('description')}</Text>
            <Text style={styles.descriptionText}>{detail.description}</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.loader}
          />
        )}

        {/* Error */}
        {error && (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadDetail} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sources */}
        {qualityGroups.length > 0 && (
          <View style={styles.sourcesSection}>
            <Text style={styles.sectionTitle}>{t('sources')}</Text>
            {qualityGroups.map((group) => (
              <View key={group.quality} style={styles.qualityGroup}>
                <Text style={styles.qualityLabel}>{group.quality}</Text>
                {group.sources.map((source, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.sourceBtn, isTV && styles.sourceBtnTv]}
                    onPress={() => setPlayingSource(source)}
                  >
                    <Text style={styles.sourceBtnText}>
                      {source.format.toUpperCase()}
                    </Text>
                    <Text style={styles.sourceBtnArrow}>{'>'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* No sources */}
        {!loading && qualityGroups.length === 0 && !error && (
          <Text style={styles.noSources}>{t('noSources')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  hero: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  tvHero: {
    padding: 24,
    gap: 24,
  },
  poster: {
    width: 150,
    height: 225,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  tvPoster: {
    width: 200,
    height: 300,
  },
  posterPlaceholder: {
    width: 150,
    height: 225,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tvHeroInfo: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  tvTitle: {
    fontSize: 30,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  meta: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sourceLine: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  descriptionSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  descriptionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  loader: {
    paddingVertical: 20,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 20,
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
  sourcesSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  qualityGroup: {
    marginBottom: 16,
  },
  qualityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 8,
  },
  sourceBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  sourceBtnTv: {
    padding: 20,
  },
  sourceBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  sourceBtnArrow: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  noSources: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  favBtn: {
    marginRight: 8,
    padding: 4,
  },
  favIcon: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  favIconActive: {
    color: Colors.warning,
  },
});
