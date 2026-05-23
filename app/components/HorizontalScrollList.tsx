import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SearchResult } from '../services/api';
import { Colors } from '../theme/colors';

interface HorizontalScrollListProps {
  title: string;
  data: SearchResult[];
  onItemPress?: (item: SearchResult) => void;
}

export default function HorizontalScrollList({ title, data }: HorizontalScrollListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.debug}>HorizontalScrollList - {title} ({data.length} items)</Text>
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
