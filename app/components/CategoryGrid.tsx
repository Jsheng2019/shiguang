import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CategorySection, VideoType } from '../services/api';
import { Colors } from '../theme/colors';

interface CategoryGridProps {
  categories: CategorySection[];
  onPress: (type: VideoType) => void;
  selectedType?: VideoType;
}

export default function CategoryGrid({ categories, onPress, selectedType }: CategoryGridProps) {
  return (
    <View style={styles.container}>
      {categories.map((cat) => {
        const isSelected = selectedType === cat.type;
        return (
          <TouchableOpacity
            key={cat.type}
            style={[styles.item, isSelected && styles.itemSelected]}
            activeOpacity={0.7}
            onPress={() => onPress(cat.type)}
          >
            <Text style={styles.icon}>{cat.icon}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 0,
  },
  item: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  labelSelected: {
    color: Colors.text,
  },
});
