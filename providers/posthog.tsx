import { useEffect, useMemo, type ReactNode } from 'react';
import { PostHog, PostHogProvider } from 'posthog-react-native';

import { setAnalyticsClient } from '@/lib/analytics';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const isPostHogConfigured = Boolean(apiKey);

if (!isPostHogConfigured && __DEV__) {
  console.info(
    '[posthog] EXPO_PUBLIC_POSTHOG_KEY not set — analytics calls will no-op. ' +
      'Set it in .env.local to enable.',
  );
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    if (!isPostHogConfigured) return null;
    return new PostHog(apiKey, {
      host,
      // TODO(phase-4): enable session replay.
      //   - Web: install `posthog-js` separately and call posthog.init(...) on Platform.OS === 'web'.
      //   - Native: install `posthog-react-native-session-replay` and switch from Expo Go to a
      //     custom dev client, then set enableSessionReplay: true here.
      captureAppLifecycleEvents: true,
    });
  }, []);

  useEffect(() => {
    setAnalyticsClient(client);
    return () => setAnalyticsClient(null);
  }, [client]);

  if (!client) return <>{children}</>;

  return (
    <PostHogProvider client={client} autocapture={{ captureScreens: true, captureTouches: false }}>
      {children}
    </PostHogProvider>
  );
}
