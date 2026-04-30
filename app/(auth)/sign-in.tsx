import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendLink() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: Linking.createURL('/'),
        },
      });
      if (error) throw error;
      analytics.capture('magic_link_requested', { has_email: true });
      setSent(true);
    } catch (err) {
      analytics.captureException(err, { action: 'magic_link_request' });
      Alert.alert('Sign-in failed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center">
        <View className="gap-2">
          <Text variant="title">Welcome to Warren</Text>
          <Text variant="muted">
            Track every warranty in one place. Sign in with a magic link — no password needed.
          </Text>
        </View>

        {!isSupabaseConfigured && (
          <View className="mt-4 rounded-xl border border-warning bg-warning/10 p-3">
            <Text className="text-warning-foreground" variant="small">
              Backend not configured. Copy .env.example to .env.local and add your Supabase URL
              and anon key, then restart the dev server.
            </Text>
          </View>
        )}

        {sent ? (
          <View className="mt-8 gap-2">
            <Text variant="heading">Check your inbox</Text>
            <Text variant="muted">
              We sent a sign-in link to {email}. Tap it on this device to continue.
            </Text>
            <Button
              label="Use a different email"
              variant="ghost"
              className="mt-2"
              onPress={() => setSent(false)}
            />
          </View>
        ) : (
          <View className="mt-8 gap-3">
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />
            <Button
              label="Send magic link"
              loading={loading}
              disabled={!email.trim() || !isSupabaseConfigured}
              onPress={handleSendLink}
              fullWidth
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
