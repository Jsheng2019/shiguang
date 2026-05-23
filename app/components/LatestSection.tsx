import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoType, SearchResult } from '../services/api';
import { Colors } from '../theme/colors';

interface LatestSectionProps {
  data: { type: VideoType; items: SearchResult[] }[];
  onItemPress?: (item: SearchResult) => void;
}

export default function LatestSection({ data }: LatestSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.debug}>LatestSection ({data.length} categories)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debug: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
