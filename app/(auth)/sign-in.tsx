import * as Linking from 'expo-linking';
import Head from 'expo-router/head';
import {
  BellRing,
  CalendarClock,
  Check,
  FileCheck2,
  FolderCheck,
  Mail,
  ScanLine,
  ShieldCheck,
} from 'lucide-react-native';
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

const benefits = [
  {
    icon: FolderCheck,
    title: 'Everything a claim needs',
    detail: 'Keep receipts, serial numbers, coverage terms, and provider contacts together.',
    marker: 'bg-emerald-500',
  },
  {
    icon: BellRing,
    title: 'A warning before coverage lapses',
    detail: 'See what expires next and get reminded while there is still time to act.',
    marker: 'bg-amber-500',
  },
  {
    icon: FileCheck2,
    title: 'Less scrambling when something breaks',
    detail: 'Open a claim with the purchase details and documents already in hand.',
    marker: 'bg-emerald-500',
  },
];

const steps = [
  {
    icon: ScanLine,
    number: '01',
    title: 'Add the purchase',
    detail: 'Scan a receipt on web or enter the product details yourself.',
  },
  {
    icon: CalendarClock,
    number: '02',
    title: 'Know the window',
    detail: 'Warren keeps the purchase date, warranty term, and expiry in view.',
  },
  {
    icon: ShieldCheck,
    number: '03',
    title: 'Claim with confidence',
    detail: 'Use the saved receipt, serial, and provider details when you need them.',
  },
];

const faqs = [
  {
    question: 'Is Warren free to use?',
    answer:
      'Yes. You can start tracking warranties for free. If paid coverage extensions are offered later, they will always be optional.',
  },
  {
    question: 'Do I need a password?',
    answer:
      'No. Warren emails you a secure sign-in link, so there is no password to create or remember.',
  },
  {
    question: 'What information can I save?',
    answer:
      'You can keep receipts, serial numbers, purchase dates, warranty durations, provider contacts, registration status, and claim history.',
  },
  {
    question: 'Can Warren scan my receipts?',
    answer:
      'On web, Warren can read a receipt image and suggest purchase details for you to review. Manual entry remains available on every platform.',
  },
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

function BenefitsLedger() {
  return (
    <View className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {benefits.map(({ icon: Icon, title, detail, marker }, index) => (
        <View key={title} className={`flex-row gap-4 p-5 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
          <View className="mt-1 h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Icon size={19} color="rgb(15 23 42)" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <View className={`h-2.5 w-2.5 rounded-full ${marker}`} />
              <Text className="flex-1 text-base font-bold text-slate-950">{title}</Text>
            </View>
            <Text className="mt-1.5 text-sm leading-6 text-slate-600">{detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendLink() {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
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
      <Head>
        <title>Warren — Never miss a warranty window again</title>
        <meta
          name="description"
          content="Track receipts, serial numbers, warranty expiry dates, and claim details in one place. Warren reminds you before coverage lapses."
        />
        <meta property="og:title" content="Never miss a warranty window again | Warren" />
        <meta
          property="og:description"
          content="Keep every receipt, serial number, and expiry date together—and act before your coverage lapses."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Head>
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

                <Text className="max-w-2xl text-[42px] font-black leading-[46px] text-slate-950 md:text-5xl md:leading-[52px]">
                  Never miss a warranty window again.
                </Text>

                <Text className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                  Warren keeps every receipt, serial, and expiry date in one place — and reminds
                  you before coverage lapses, while you can still claim.
                </Text>

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
                            Start with your first warranty
                          </Text>
                          <Text className="text-xs text-slate-500">
                            Free to start. No password needed.
                          </Text>
                        </View>
                      </View>
                      <Input
                        label="Email"
                        value={email}
                        onChangeText={(value) => {
                          setEmail(value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        inputMode="email"
                        error={emailError}
                        className="border-slate-200 bg-slate-50"
                      />
                      <Button
                        label="Start tracking free"
                        loading={loading}
                        disabled={!isSupabaseConfigured}
                        onPress={handleSendLink}
                        fullWidth
                        className="rounded-lg bg-slate-950"
                      />
                      <Text className="text-center text-xs text-slate-500">
                        No password needed — we’ll email one secure link.
                      </Text>
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

        <View className="border-y border-slate-200 bg-slate-50 px-5 py-16 md:px-10 md:py-24">
          <View className="mx-auto w-full max-w-6xl gap-10 wide:flex-row wide:items-center wide:gap-16">
            <View className="wide:flex-1">
              <Text className="text-xs font-bold uppercase text-slate-500">Coverage, made useful</Text>
              <Text className="mt-3 text-3xl font-black leading-9 text-slate-950">
                The details you need, before you need them.
              </Text>
              <Text className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                A warranty buried in an inbox or drawer cannot help much. Warren keeps the proof,
                dates, and next action together so paid-for coverage does not quietly go unused.
              </Text>
            </View>
            <View className="wide:flex-1">
              <BenefitsLedger />
            </View>
          </View>
        </View>

        <View className="bg-slate-950 px-5 py-16 md:px-10 md:py-24">
          <View className="mx-auto w-full max-w-6xl">
            <Text className="text-xs font-bold uppercase text-slate-400">How Warren works</Text>
            <Text className="mt-3 max-w-xl text-3xl font-black leading-9 text-white">
              From purchase to claim in three calm steps.
            </Text>
            <View className="mt-10 gap-8 wide:flex-row wide:gap-0">
              {steps.map(({ icon: Icon, number, title, detail }, index) => (
                <View
                  key={number}
                  className={`wide:flex-1 ${index > 0 ? 'wide:border-l wide:border-white/15 wide:pl-8' : ''} ${index < steps.length - 1 ? 'wide:pr-8' : ''}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                      <Icon size={21} color="#fcd34d" />
                    </View>
                    <Text className="text-xs font-bold text-slate-500">{number}</Text>
                  </View>
                  <Text className="mt-5 text-xl font-bold text-white">{title}</Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-300">{detail}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="px-5 py-16 md:px-10 md:py-24">
          <View className="mx-auto w-full max-w-4xl">
            <Text className="text-xs font-bold uppercase text-slate-500">Frequently asked questions</Text>
            <Text className="mt-3 text-3xl font-black leading-9 text-slate-950">
              A few useful details before you start.
            </Text>
            <View className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {faqs.map(({ question, answer }, index) => (
                <View key={question} className={`p-5 md:p-6 ${index > 0 ? 'border-t border-slate-200' : ''}`}>
                  <Text className="text-base font-bold text-slate-950">{question}</Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">{answer}</Text>
                </View>
              ))}
            </View>
            <View className="mt-10 items-start rounded-lg bg-amber-300 p-6 md:flex-row md:items-center md:justify-between md:gap-8">
              <View className="flex-1">
                <Text className="text-xl font-black text-slate-950">Put your next expiry date to work.</Text>
                <Text className="mt-1 text-sm leading-6 text-slate-800">
                  Add your first warranty free. One secure email link gets you in.
                </Text>
              </View>
              <View className="mt-5 w-full md:mt-0 md:w-auto">
                <Button
                  label="Start tracking free"
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="bg-slate-950 md:px-7"
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
