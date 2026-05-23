import React from 'react';
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
}

export default function VideoCard({ item, onPress, isTV, focused }: VideoCardProps) {
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
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.poster} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
        {qualityBadge && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{qualityBadge}</Text>
          </View>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    overflow: 'hidden',
    margin: 6,
    width: 160,
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
});
