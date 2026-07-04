import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AgentAction,
  AgentRecommendation,
  AgentRecommendationDraft,
  AgentRecommendationKind,
  AgentRecommendationStatus,
  AgentPriority,
} from '@/lib/agent-readiness';
import { analytics } from '@/lib/analytics';
import type { Database, Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

type AgentRecommendationRow = Database['public']['Tables']['agent_recommendations']['Row'];

function isObject(value: Json): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowAction(row: AgentRecommendationRow): AgentAction {
  const payload = row.action_payload;
  if (isObject(payload) && payload.type === 'navigate') {
    if (payload.route === 'claims') {
      return { type: 'navigate', route: 'claims' };
    }
    if (
      (payload.route === 'warranty_detail' || payload.route === 'extend_warranty') &&
      typeof payload.warrantyId === 'string'
    ) {
      return {
        type: 'navigate',
        route: payload.route,
        warrantyId: payload.warrantyId,
      };
    }
  }

  if (row.warranty_id) {
    return { type: 'navigate', route: 'warranty_detail', warrantyId: row.warranty_id };
  }
  return { type: 'navigate', route: 'claims' };
}

function rowEvidence(row: AgentRecommendationRow): AgentRecommendationDraft['evidence'] {
  if (!isObject(row.evidence)) return {};
  const out: AgentRecommendationDraft['evidence'] = {};
  for (const [key, value] of Object.entries(row.evidence)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

function rowToRecommendation(row: AgentRecommendationRow): AgentRecommendation {
  return {
    id: row.id,
    userId: row.user_id,
    warrantyId: row.warranty_id,
    kind: row.kind as AgentRecommendationKind,
    status: row.status as AgentRecommendationStatus,
    priority: row.priority as AgentPriority,
    title: row.title,
    body: row.body,
    action: rowAction(row),
    evidence: rowEvidence(row),
    fingerprint: row.fingerprint,
    lastEvaluatedAt: row.last_evaluated_at,
    dismissedAt: row.dismissed_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PRIORITY_RANK: Record<AgentPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function sortRecommendations(items: AgentRecommendation[]): AgentRecommendation[] {
  return [...items].sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (priorityDelta !== 0) return priorityDelta;

    const aDays = typeof a.evidence.days_until_expiry === 'number' ? a.evidence.days_until_expiry : 9999;
    const bDays = typeof b.evidence.days_until_expiry === 'number' ? b.evidence.days_until_expiry : 9999;
    if (aDays !== bDays) return aDays - bDays;

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export const agentRecommendationKeys = {
  all: ['agent_recommendations'] as const,
  list: (userId: string | undefined) => ['agent_recommendations', 'list', userId] as const,
};

export function useAgentRecommendations() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: agentRecommendationKeys.list(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { error: refreshError } = await supabase.functions.invoke('refresh-agent-readiness');
      if (refreshError) {
        analytics.captureException(refreshError, { query: 'refreshAgentReadiness' });
      }

      const { data, error } = await supabase
        .from('agent_recommendations')
        .select('*')
        .eq('status', 'open');
      if (error) throw error;

      return sortRecommendations((data ?? []).map(rowToRecommendation));
    },
  });
}

export function useDismissAgentRecommendation() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_recommendations')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          resolved_at: null,
        })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentRecommendationKeys.list(userId) });
    },
    onError: (err) => {
      analytics.captureException(err, { mutation: 'dismissAgentRecommendation' });
    },
  });
}
