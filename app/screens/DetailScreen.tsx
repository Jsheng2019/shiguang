import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dimensions,
  Modal,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { api, SearchResult, VideoSource, Episode } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import { Colors } from '../theme/colors';
import { storage } from '../services/storage';
import { useI18n } from '../services/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.6;
const MAX_DESC_LINES = 4;

type DetailParams = {
  Detail: { item: SearchResult };
};

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 7 ? Colors.success : rating >= 5 ? Colors.warning : Colors.textSecondary;
  return (
    <View style={[styles.ratingBadge, { backgroundColor: color }]}>
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function TypeBadgeIcon({ type }: { type: string }) {
  const color = type === 'movie' ? Colors.primary : Colors.secondary;
  return (
    <View style={[styles.typeBadgeIcon, { backgroundColor: color }]}>
      <Text style={styles.typeBadgeIconText}>{type}</Text>
    </View>
  );
}

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
  const [descExpanded, setDescExpanded] = useState(false);
  const [descTruncatable, setDescTruncatable] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const descRef = useRef<Text>(null);
  const posterAspect = 2 / 3;
  const posterHeight = HERO_HEIGHT * 0.75;
  const posterWidth = posterHeight * posterAspect;

  // Check favorite status and load detail on mount
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
      if (data) {
        setDetail(data);
        setLoadingRecs(true);
        api.getRecommendations(data.sourceUrl, data.sourceName).then((recs) => {
          setRecommendations(recs.slice(0, 12));
        }).catch(() => {}).finally(() => setLoadingRecs(false));
      }
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

  // Header favorite button
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

  const handlePlay = useCallback(() => {
    const srcs = detail?.sources ?? [];
    if (srcs.length === 0) return;
    if (srcs.length === 1) {
      setPlayingSource(srcs[0]);
    } else {
      setShowSourcePicker(true);
    }
  }, [detail]);

  const handleSourceSelect = useCallback((source: VideoSource) => {
    setShowSourcePicker(false);
    setPlayingSource(source);
  }, []);

  const handleEpisodeSelect = useCallback((episode: Episode) => {
    setSelectedEpisode(episode);
    const episodeSource: VideoSource = {
      url: episode.url,
      quality: '720p',
      format: episode.url.includes('.m3u8') ? 'hls' : 'mp4',
    };
    setPlayingSource(episodeSource);
  }, []);

  const handleRelatedPress = useCallback(
    (item: SearchResult) => {
      navigation.push('Detail', { item });
    },
    [navigation],
  );

  const onDescTextLayout = useCallback(
    (e: { nativeEvent: { lines: { lineNumber: number }[] } }) => {
      if (e.nativeEvent.lines.length > MAX_DESC_LINES) {
        setDescTruncatable(true);
      }
    },
    [],
  );

  // If playing a source, show player
  if (playingSource) {
    return (
      <SafeAreaView style={styles.container}>
        <VideoPlayer
          source={playingSource}
          onClose={() => setPlayingSource(null)}
          watchMeta={
            detail
              ? { url: detail.sourceUrl, title: detail.title, poster: detail.poster }
              : undefined
          }
        />
      </SafeAreaView>
    );
  }

  const sources = detail?.sources ?? [];
  const hasMultipleSources = sources.length > 1;
  const episodes = detail?.episodes ?? [];
  const hasEpisodes = episodes.length > 0;
  const showDescription = detail?.description && detail.description.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          {detail?.poster ? (
            <Image source={{ uri: detail.poster }} style={styles.backdrop} />
          ) : (
            <View style={styles.backdropPlaceholder} />
          )}
          <View style={styles.backdropOverlay1} />
          <View style={styles.backdropOverlay2} />

          <View style={styles.heroContent}>
            {detail?.poster && (
              <Image
                source={{ uri: detail.poster }}
                style={[styles.poster, { width: posterWidth, height: posterHeight }]}
              />
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {detail?.title ?? ''}
              </Text>
              <View style={styles.heroMetaRow}>
                {detail?.year && <Text style={styles.heroMeta}>{String(detail.year)}</Text>}
                {detail?.type && <TypeBadgeIcon type={detail.type} />}
                {(detail?.region || detail?.country) && (
                  <Text style={styles.heroMeta}>{detail.region ?? detail.country}</Text>
                )}
              </View>
              {detail?.rating != null && <RatingBadge rating={detail.rating} />}
            </View>
          </View>
        </View>

        {/* Play Button */}
        <View style={styles.playSection}>
          <TouchableOpacity
            style={[styles.playBtn, sources.length === 0 && styles.playBtnDisabled]}
            onPress={handlePlay}
            disabled={sources.length === 0}
          >
            <Text style={styles.playBtnIcon}>{'▶'}</Text>
            <Text style={styles.playBtnText}>
              {hasMultipleSources ? t('selectSource') : t('play')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Meta Info Row */}
        {(detail?.director || detail?.actors || detail?.duration || detail?.language) && (
          <View style={styles.metaSection}>
            {detail?.director && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('director')}</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{detail.director}</Text>
              </View>
            )}
            {detail?.actors && detail.actors.length > 0 && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('actors')}</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {detail.actors.slice(0, 5).join(', ')}
                </Text>
              </View>
            )}
            <View style={styles.metaRowInline}>
              {detail?.duration && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{detail.duration}</Text>
                </View>
              )}
              {detail?.language && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{detail.language}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Episode Selector */}
        {hasEpisodes && (
          <View style={styles.episodeSection}>
            <Text style={styles.sectionTitle}>{t('chooseEpisode')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.episodeGrid}>
                {episodes.map((ep, idx) => {
                  const isSelected = selectedEpisode?.url === ep.url;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.episodeBtn, isSelected && styles.episodeBtnActive]}
                      onPress={() => handleEpisodeSelect(ep)}
                    >
                      <Text style={[styles.episodeBtnText, isSelected && styles.episodeBtnTextActive]}>
                        {ep.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Description */}
        {showDescription && (
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>{t('description')}</Text>
            <Text
              ref={descRef}
              style={styles.descText}
              numberOfLines={descExpanded ? undefined : MAX_DESC_LINES}
              onTextLayout={onDescTextLayout}
            >
              {detail.description}
            </Text>
            {descTruncatable && (
              <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
                <Text style={styles.descToggle}>
                  {descExpanded ? t('collapse') : t('expand')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
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

        {/* Source list (when single source) */}
        {!loading && sources.length > 0 && !hasMultipleSources && (
          <View style={styles.sourcesSection}>
            <Text style={styles.sectionTitle}>{t('sources')}</Text>
            {sources.map((source, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sourceRow}
                onPress={() => setPlayingSource(source)}
              >
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceQuality}>{source.quality}</Text>
                  <View style={styles.sourceFormatBadge}>
                    <Text style={styles.sourceFormatText}>{source.format.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.sourceArrow}>{'>'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recsSection}>
            <Text style={styles.sectionTitle}>{t('youMayAlsoLike')}</Text>
            {loadingRecs && (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.recsLoader} />
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.recsRow}>
                {recommendations.map((rec, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recCard}
                    onPress={() => handleRelatedPress(rec)}
                  >
                    {rec.poster ? (
                      <Image source={{ uri: rec.poster }} style={styles.recPoster} />
                    ) : (
                      <View style={styles.recPosterPlaceholder}>
                        <Text style={styles.recPlaceholderText}>{rec.title[0]}</Text>
                      </View>
                    )}
                    <Text style={styles.recTitle} numberOfLines={2}>
                      {rec.title}
                    </Text>
                    {rec.rating != null && (
                      <Text style={styles.recRating}>{rec.rating.toFixed(1)}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Empty sources state */}
        {!loading && sources.length === 0 && !error && (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>{t('noSources')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Source Picker Modal */}
      <Modal
        visible={showSourcePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourcePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSourcePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('selectSource')}</Text>
            {sources.map((source, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sourceOption}
                onPress={() => handleSourceSelect(source)}
              >
                <View style={styles.sourceOptionInfo}>
                  <Text style={styles.sourceOptionQuality}>{source.quality}</Text>
                  <View style={styles.sourceOptionBadge}>
                    <Text style={styles.sourceOptionBadgeText}>
                      {source.format.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sourceOptionArrow}>{'>'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scroll: {
    paddingBottom: 40,
  },

  // Hero
  hero: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  backdropPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1A1A',
  },
  backdropOverlay1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13,13,13,0.3)',
  },
  backdropOverlay2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13,13,13,0.7)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
    alignItems: 'flex-end',
  },
  poster: {
    borderRadius: 8,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroInfo: {
    flex: 1,
    paddingBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heroMeta: {
    color: '#CCCCCC',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ratingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  typeBadgeIcon: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Play Button
  playSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  playBtnDisabled: {
    backgroundColor: '#333333',
  },
  playBtnIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Meta Info
  metaSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  metaItem: {
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
  },
  metaRowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaChipText: {
    color: '#AAAAAA',
    fontSize: 12,
  },

  // Episodes
  episodeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  episodeBtn: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 60,
    alignItems: 'center',
  },
  episodeBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  episodeBtnText: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '500',
  },
  episodeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Description
  descSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  descText: {
    color: '#BBBBBB',
    fontSize: 14,
    lineHeight: 22,
  },
  descToggle: {
    color: '#E50914',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  // Loading / Error / Empty
  loader: {
    paddingVertical: 20,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#E50914',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    color: '#888888',
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },

  // Source List
  sourcesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceQuality: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sourceFormatBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceFormatText: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceArrow: {
    color: '#888888',
    fontSize: 16,
  },

  // Source Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444444',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  sourceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  sourceOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceOptionQuality: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sourceOptionBadge: {
    backgroundColor: '#444444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceOptionBadgeText: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceOptionArrow: {
    color: '#888888',
    fontSize: 16,
  },

  // Recommendations
  recsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  recsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  recCard: {
    width: 110,
  },
  recPoster: {
    width: 110,
    height: 165,
    borderRadius: 6,
    resizeMode: 'cover',
    backgroundColor: '#1A1A1A',
  },
  recPosterPlaceholder: {
    width: 110,
    height: 165,
    borderRadius: 6,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recPlaceholderText: {
    color: '#555555',
    fontSize: 32,
    fontWeight: '800',
  },
  recTitle: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  recRating: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  recsLoader: {
    paddingVertical: 12,
  },

  // Favorite
  favBtn: {
    marginRight: 8,
    padding: 4,
  },
  favIcon: {
    fontSize: 24,
    color: '#888888',
  },
  favIconActive: {
    color: '#E50914',
  },
});
