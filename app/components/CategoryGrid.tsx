import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CategorySection } from '../services/api';
import { Colors } from '../theme/colors';

interface CategoryGridProps {
  categories: CategorySection[];
  onCategoryPress?: (category: CategorySection) => void;
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.debug}>CategoryGrid ({categories.length} categories)</Text>
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
