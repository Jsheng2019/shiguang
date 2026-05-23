import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CarouselItem } from '../services/api';
import { Colors } from '../theme/colors';

interface BannerCarouselProps {
  banners: CarouselItem[];
  onBannerPress?: (item: CarouselItem) => void;
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.debug}>BannerCarousel ({banners.length} items)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginBottom: 12,
    borderRadius: 8,
    marginHorizontal: 14,
  },
  debug: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
