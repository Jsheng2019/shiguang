import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SearchResult } from '../services/api';
import { Colors } from '../theme/colors';
import { useI18n } from '../services/i18n';

interface HorizontalScrollListProps {
  title: string;
  items: SearchResult[];
  onPress: (item: SearchResult) => void;
  onSeeAll?: () => void;
  loading?: boolean;
}

function SkeletonItem() {
  return (
    <View style={cardStyles.container}>
      <View style={[cardStyles.poster, cardStyles.skeletonPoster]} />
      <View style={cardStyles.titleBlock}>
        <View style={cardStyles.skeletonTitle} />
      </View>
    </View>
  );
}

function CompactCard({
  item,
  onPress,
}: {
  item: SearchResult;
  onPress: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <TouchableOpacity
      style={cardStyles.container}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={cardStyles.posterContainer}>
        {item.poster && !imgFailed ? (
          <Image
            source={{ uri: item.poster }}
            style={cardStyles.poster}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={[cardStyles.poster, cardStyles.placeholder]} />
        )}
        <View style={cardStyles.typeBadge}>
          <Text style={cardStyles.typeText}>{item.type}</Text>
        </View>
        {item.rating != null && (
          <View style={cardStyles.ratingBadge}>
            <Text style={cardStyles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={cardStyles.titleBlock}>
        <Text style={cardStyles.title} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HorizontalScrollList({
  title,
  items,
  onPress,
  onSeeAll,
  loading,
}: HorizontalScrollListProps) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAll}>{t('searchBtn')} 全部</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)
          : items.map((item, i) => (
              <CompactCard
                key={`${item.sourceUrl}-${i}`}
                item={item}
                onPress={() => onPress(item)}
              />
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingLeft: 12,
    paddingRight: 16,
    gap: 8,
  },
});

const cardStyles = StyleSheet.create({
  container: {
    width: 120,
  },
  posterContainer: {
    width: 120,
    height: 170,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  poster: {
    width: 120,
    height: 170,
    backgroundColor: Colors.surface,
  },
  skeletonPoster: {
    backgroundColor: Colors.surface,
  },
  placeholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  typeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  ratingText: {
    color: Colors.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  titleBlock: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  title: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  skeletonTitle: {
    height: 12,
    width: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 4,
  },
});
