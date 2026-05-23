import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const isTV = Platform.isTV;

  const handleSearch = () => {
    if (query.trim()) {
      navigation.navigate('Search', { query: query.trim() });
    }
  };

  const quickLinks = [
    { label: 'Movies', color: Colors.primary },
    { label: 'Series', color: Colors.secondary },
    { label: 'Documentary', color: Colors.success },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>Video App</Text>
          <Text style={styles.tagline}>Search and stream videos</Text>
        </View>

        <Text style={styles.label}>What do you want to watch?</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, isTV && styles.tvInput]}
            placeholder="Search movies, series..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linksSection}>
          <Text style={styles.sectionTitle}>Browse</Text>
          {quickLinks.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.linkCard, { borderLeftColor: item.color }]}
              onPress={() => navigation.navigate('Search', { query: item.label })}
            >
              <Text style={styles.linkLabel}>{item.label}</Text>
              <Text style={styles.linkArrow}>{'>'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.primary,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 10,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 16,
  },
  tvInput: {
    height: 56,
    fontSize: 20,
  },
  searchBtn: {
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  linksSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  linkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 18,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  linkLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  linkArrow: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
});
