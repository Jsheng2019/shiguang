import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { CarouselItem } from '../services/api';
import { Colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BannerCarouselProps {
  items: CarouselItem[];
  onPress: (item: CarouselItem) => void;
}

export default function BannerCarousel({ items, onPress }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const activeRef = useRef(0);

  activeRef.current = activeIndex;

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = setInterval(() => {
      const next = (activeRef.current + 1) % items.length;
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setActiveIndex(next);
    }, 4000);
    return () => clearInterval(id);
  }, [paused, items.length]);

  if (items.length === 0) return null;

  const handleMomentumEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
      >
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.9}
            onPress={() => onPress(item)}
            style={styles.slide}
          >
            <Image
              source={{ uri: item.poster }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.textBlock}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.dotsContainer}>
        {items.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    position: 'relative',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: 200,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: 200,
    backgroundColor: Colors.surface,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  textBlock: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeDot: {
    backgroundColor: Colors.primary,
    width: 18,
    borderRadius: 3,
  },
});
