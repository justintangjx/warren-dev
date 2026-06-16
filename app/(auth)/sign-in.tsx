import * as Linking from 'expo-linking';
import { Check, Clock3, FileCheck2, Mail, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const warrantyRows = [
  {
    title: 'MacBook Pro',
    detail: 'AppleCare+',
    status: '42 days left',
    tone: 'text-amber-700',
    marker: 'bg-amber-500',
  },
  {
    title: 'Washer',
    detail: 'Receipt and serial saved',
    status: 'Covered',
    tone: 'text-emerald-700',
    marker: 'bg-emerald-500',
  },
  {
    title: 'Camera lens',
    detail: 'Claim packet ready',
    status: 'Ready',
    tone: 'text-sky-700',
    marker: 'bg-sky-500',
  },
];

const trustItems = [
  { icon: FileCheck2, label: 'Receipts' },
  { icon: Clock3, label: 'Expiry dates' },
  { icon: ShieldCheck, label: 'Claims' },
];

function LedgerPreview() {
  return (
    <View className="min-h-[430px] overflow-hidden rounded-lg bg-[#111827] p-5">
      <View className="mb-5 h-1.5 w-28 rounded-sm bg-[#fcd34d]" />
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semibold uppercase text-slate-400">Warren</Text>
          <Text className="mt-1 text-2xl font-bold text-white">Coverage ledger</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-lg bg-white/10">
          <ShieldCheck size={22} color="white" />
        </View>
      </View>

      <View className="gap-3">
        {warrantyRows.map((item) => (
          <View key={item.title} className="rounded-lg bg-white p-4">
            <View className="flex-row items-center gap-3">
              <View className={`h-3 w-3 rounded-full ${item.marker}`} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-950">{item.title}</Text>
                <Text className="mt-0.5 text-xs text-slate-500">{item.detail}</Text>
              </View>
              <Text className={`text-xs font-bold ${item.tone}`}>{item.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-white">Next useful reminder</Text>
          <Text className="text-xs font-semibold text-[#fcd34d]">Jun 28</Text>
        </View>
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <View className="h-2 w-2/3 rounded-full bg-[#fcd34d]" />
        </View>
        <Text className="mt-3 text-xs leading-5 text-slate-300">
          Warranty window closes soon. Receipt, serial, and provider contact are already attached.
        </Text>
      </View>
    </View>
  );
}

function TrustStrip() {
  return (
    <View className="gap-2 wide:flex-row">
      {trustItems.map(({ icon: Icon, label }) => (
        <View
          key={label}
          className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Icon size={14} color="rgb(15 23 42)" />
          <Text className="text-xs font-semibold text-slate-900">{label}</Text>
        </View>
      ))}
    </View>
  );
}

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
    <Screen scroll className="bg-[#f8faf7] px-0">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="min-h-screen px-5 py-5 md:px-10 md:py-8">
          <View className="mx-auto w-full max-w-6xl">
            <View className="mb-8 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-950">
                  <ShieldCheck size={20} color="white" />
                </View>
                <Text className="text-lg font-bold text-slate-950">Warren</Text>
              </View>
              <Text className="text-xs font-semibold uppercase text-slate-500">Warranty desk</Text>
            </View>

            <View className="gap-8 wide:flex-row wide:items-center wide:gap-12">
              <View className="wide:flex-1">
                <View className="mb-5 self-start rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                  <Text className="text-xs font-bold uppercase text-emerald-800">
                    Keep the coverage you paid for
                  </Text>
                </View>

                <Text className="max-w-2xl text-[42px] font-black leading-[46px] text-slate-950">
                  Your warranties should be useful before something breaks.
                </Text>

                <Text className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                  Warren stores receipts, serials, expiry dates, and claim details in one calm
                  place, then reminds you while there is still time to act.
                </Text>

                <View className="mt-7">
                  <TrustStrip />
                </View>

                {!isSupabaseConfigured && (
                  <View className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <Text className="text-sm font-semibold text-amber-950">
                      Backend not configured
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-amber-900">
                      Copy .env.example to .env.local, add your Supabase URL and anon key, then
                      restart the dev server.
                    </Text>
                  </View>
                )}

                <View className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:max-w-md">
                  {sent ? (
                    <View className="gap-3">
                      <View className="h-11 w-11 items-center justify-center rounded-lg bg-emerald-100">
                        <Check size={22} color="rgb(4 120 87)" />
                      </View>
                      <View>
                        <Text className="text-xl font-bold text-slate-950">Check your inbox</Text>
                        <Text className="mt-1 text-sm leading-6 text-slate-600">
                          We sent a sign-in link to {email}. Tap it on this device to continue.
                        </Text>
                      </View>
                      <Pressable
                        className="self-start rounded-lg px-1 py-2"
                        onPress={() => setSent(false)}>
                        <Text className="text-sm font-bold text-slate-950">
                          Use a different email
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View className="gap-3">
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Mail size={19} color="rgb(15 23 42)" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-bold text-slate-950">
                            Sign in without a password
                          </Text>
                          <Text className="text-xs text-slate-500">
                            One secure link, no account ceremony.
                          </Text>
                        </View>
                      </View>
                      <Input
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        inputMode="email"
                        className="border-slate-200 bg-slate-50"
                      />
                      <Button
                        label="Send magic link"
                        loading={loading}
                        disabled={!email.trim() || !isSupabaseConfigured}
                        onPress={handleSendLink}
                        fullWidth
                        className="rounded-lg bg-slate-950"
                      />
                    </View>
                  )}
                </View>
              </View>

              <View className="wide:w-[430px]">
                <LedgerPreview />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
