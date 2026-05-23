import React from 'react';
import { StyleSheet } from 'react-native';
import { VideoType, SearchResult } from '../services/api';
import { useI18n } from '../services/i18n';
import HorizontalScrollList from './HorizontalScrollList';

interface LatestSectionProps {
  sections: { type: VideoType; items: SearchResult[] }[];
  onPress: (item: SearchResult) => void;
  onSeeAll: (type: VideoType) => void;
}

export default function LatestSection({ sections, onPress, onSeeAll }: LatestSectionProps) {
  const { t } = useI18n();

  // Map VideoType to i18n key
  const typeLabel = (type: VideoType): string => {
    const key = type as keyof typeof t;
    const label = t(key as any);
    return typeof label === 'string' ? label : type;
  };

  return (
    <>
      {sections.map((section) => {
        if (section.items.length === 0) return null;
        return (
          <HorizontalScrollList
            key={section.type}
            title={typeLabel(section.type)}
            items={section.items}
            onPress={onPress}
            onSeeAll={() => onSeeAll(section.type)}
          />
        );
      })}
    </>
  );
}
