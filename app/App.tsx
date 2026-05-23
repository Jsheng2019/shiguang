import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import DetailScreen from './screens/DetailScreen';
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

export default function App() {
  return (
    <SafeAreaProvider>
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
            options={{ title: 'Search' }}
          />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{ title: 'Details' }}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
