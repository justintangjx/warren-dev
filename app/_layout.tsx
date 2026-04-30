import 'react-native-reanimated';
import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Providers } from '@/providers';
import { useAuth } from '@/providers/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

function ProtectedRouter() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="warranties/new" options={{ headerShown: true, title: 'Add warranty', presentation: 'modal' }} />
      <Stack.Screen name="warranties/[id]/index" options={{ headerShown: true, title: 'Warranty' }} />
      <Stack.Screen name="warranties/[id]/contact" options={{ headerShown: true, title: 'Contact provider', presentation: 'modal' }} />
      <Stack.Screen name="warranties/[id]/extend" options={{ headerShown: true, title: 'Extend warranty', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Providers>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ProtectedRouter />
        <StatusBar style="auto" />
      </ThemeProvider>
    </Providers>
  );
}
