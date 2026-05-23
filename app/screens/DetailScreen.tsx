import React, { useState, useEffect } from 'react';
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
import { useRoute, RouteProp } from '@react-navigation/native';
import { api, SearchResult, VideoSource } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import { Colors } from '../theme/colors';

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

export default function DetailScreen() {
  const route = useRoute<RouteProp<DetailParams, 'Detail'>>();
  const initialItem = route.params?.item;
  const isTV = Platform.isTV;

  const [detail, setDetail] = useState<SearchResult | null>(initialItem);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingSource, setPlayingSource] = useState<VideoSource | null>(null);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDetail(initialItem.sourceUrl, initialItem.sourceName);
      if (data) setDetail(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (playingSource) {
    return (
      <SafeAreaView style={styles.container}>
        <VideoPlayer source={playingSource} onClose={() => setPlayingSource(null)} />
      </SafeAreaView>
    );
  }

  const qualityGroups = detail?.sources ? groupByQuality(detail.sources) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, isTV && styles.tvHero]}>
          {detail?.poster ? (
            <Image source={{ uri: detail.poster }} style={styles.poster} />
          ) : (
            <View style={styles.posterPlaceholder} />
          )}
          <View style={styles.heroInfo}>
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
            <Text style={styles.sourceLine}>Source: {detail?.sourceName}</Text>
          </View>
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.loader}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        {qualityGroups.length > 0 && (
          <View style={styles.sourcesSection}>
            <Text style={styles.sectionTitle}>Sources</Text>
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

        {!loading && qualityGroups.length === 0 && !error && (
          <Text style={styles.noSources}>No sources available</Text>
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
    width: 130,
    height: 195,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: 130,
    height: 195,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  tvTitle: {
    fontSize: 28,
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
  loader: {
    paddingVertical: 20,
  },
  error: {
    color: Colors.error,
    textAlign: 'center',
    padding: 20,
  },
  sourcesSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
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
});
