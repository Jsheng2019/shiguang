import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import DetailScreen from './screens/DetailScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import CategoryScreen from './screens/CategoryScreen';
import { I18nProvider, useI18n } from './services/i18n';
import { Colors } from './theme/colors';

const Stack = createNativeStackNavigator();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.card,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.primary,
  },
};

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>App Error</Text>
          <Text style={errorStyles.message}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e50914',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
});

function AppNavigator() {
  const { t } = useI18n();

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: t('search') }}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{ title: t('details') }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ title: t('favorites') }}
        />
        <Stack.Screen
          name="Category"
          component={CategoryScreen}
          options={{ title: t('categories') }}
        />
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <I18nProvider>
          <AppNavigator />
        </I18nProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
