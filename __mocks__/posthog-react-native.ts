// Manual Jest mock for `posthog-react-native`.
// Auto-loaded by Jest for any test that imports the module (directly or
// transitively, e.g. via providers/posthog.tsx). Each PostHog instance gets
// its own jest.fn() methods so tests can assert on calls when needed.

import type { ReactNode } from 'react';

export class PostHog {
  constructor(_apiKey: string, _options?: unknown) {}
  capture = jest.fn();
  identify = jest.fn();
  reset = jest.fn();
  captureException = jest.fn();
  screen = jest.fn();
  group = jest.fn();
  register = jest.fn();
  optIn = jest.fn();
  optOut = jest.fn();
  flush = jest.fn().mockResolvedValue(undefined);
  shutdown = jest.fn().mockResolvedValue(undefined);
}

export const PostHogProvider = ({ children }: { children: ReactNode }) => children;

export default PostHog;
