import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SearchResult } from '../services/api';
import VideoCard from '../components/VideoCard';
import { storage } from '../services/storage';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/colors';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const [favorites, setFavorites] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const isTV = Platform.isTV;

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const data = await storage.getFavorites();
    setFavorites(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  const handlePress = useCallback(
    (item: SearchResult) => {
      navigation.navigate('Detail', { item });
    },
    [navigation],
  );

  const handleLongPress = useCallback(
    (item: SearchResult) => {
      Alert.alert(
        t('delete'),
        `${t('confirmDelete')}\n"${item.title}"`,
        [
          { text: t('clear'), style: 'cancel' },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              await storage.removeFavorite(item.sourceUrl);
              setFavorites((prev) => prev.filter((f) => f.sourceUrl !== item.sourceUrl));
            },
          },
        ],
      );
    },
    [t],
  );

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <VideoCard item={item} onPress={() => handlePress(item)} isTV={isTV} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {favorites.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>☆</Text>
          <Text style={styles.emptyTitle}>{t('noFavorites')}</Text>
          <Text style={styles.emptyHint}>{t('noFavoritesHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.sourceUrl}
          numColumns={isTV ? 4 : 2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={!isTV ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    padding: 8,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-around',
  },
});
