import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SearchResult } from '../services/api';
import { Colors } from '../theme/colors';

interface VideoCardProps {
  item: SearchResult;
  onPress: () => void;
  isTV?: boolean;
  focused?: boolean;
  skeleton?: boolean;
}

function RatingBadge({ rating }: { rating: number }) {
  const stars = rating >= 7 ? '★★★★★' :
    rating >= 5 ? '★★★★' :
    rating >= 3 ? '★★★' : '★★';
  const color = rating >= 7 ? Colors.success : rating >= 5 ? Colors.warning : Colors.textSecondary;
  return (
    <View style={[styles.ratingBadge, { backgroundColor: color + '33' }]}>
      <Text style={[styles.ratingText, { color }]}>{stars}</Text>
      <Text style={[styles.ratingNum, { color }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={styles.posterContainer}>
        <View style={[styles.poster, styles.skeletonPoster]} />
      </View>
      <View style={styles.info}>
        <View style={[styles.skeletonLine, { width: '80%' }]} />
        <View style={[styles.skeletonLine, { width: '50%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

export default function VideoCard({ item, onPress, isTV, focused, skeleton }: VideoCardProps) {
  const [imgError, setImgError] = useState(false);

  if (skeleton) return <SkeletonCard />;

  const qualityBadge =
    item.sources.length > 0
      ? [...new Set(item.sources.map((s) => s.quality))].sort().reverse().join('/')
      : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, isTV && styles.tvCard, focused && styles.focused]}
    >
      <View style={styles.posterContainer}>
        {item.poster && !imgError ? (
          <Image
            source={{ uri: item.poster }}
            style={styles.poster}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
        {qualityBadge && !imgError && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{qualityBadge}</Text>
          </View>
        )}
        {item.rating != null && (
          <RatingBadge rating={item.rating} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.year && <Text style={styles.year}>{item.year}</Text>}
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  item.type === 'movie' ? Colors.primary : Colors.secondary,
              },
            ]}
          >
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>
        <Text style={styles.source}>{item.sourceName}</Text>
      </View>
    </TouchableOpacity>
  );
}

export { RatingBadge, SkeletonCard };

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    overflow: 'hidden',
    margin: 6,
    width: 160,
  },
  skeletonCard: {
    opacity: 0.5,
  },
  tvCard: {
    width: 220,
    margin: 10,
  },
  focused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  posterContainer: {
    position: 'relative',
    aspectRatio: 2 / 3,
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  skeletonPoster: {
    backgroundColor: Colors.surface,
  },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: Colors.textTertiary,
  },
  qualityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 9,
  },
  ratingNum: {
    fontSize: 9,
    fontWeight: '700',
  },
  info: {
    padding: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  year: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  typeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  source: {
    color: Colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  skeletonLine: {
    height: 10,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
  },
});
