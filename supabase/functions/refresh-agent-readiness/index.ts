// @ts-nocheck
// Supabase Edge Function. Kept server-side so future model/provider secrets never ship
// in Expo client JavaScript. V1 is rule-derived and suggest-only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPEN_CLAIM_STATUSES = new Set(['submitted', 'in_review']);
const REGISTRATION_WINDOW_DAYS = 120;

function addMonths(date, months) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
  if (next.getUTCDate() !== date.getUTCDate()) {
    next.setUTCDate(0);
  }
  return next;
}

function daysBetween(later, earlier) {
  const msPerDay = 86_400_000;
  const laterDate = Date.UTC(later.getUTCFullYear(), later.getUTCMonth(), later.getUTCDate());
  const earlierDate = Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth(), earlier.getUTCDate());
  return Math.round((laterDate - earlierDate) / msPerDay);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeExpiry(daysUntilExpiry) {
  if (daysUntilExpiry === 0) return 'Expires today';
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  if (daysUntilExpiry < 30) return `Expires in ${daysUntilExpiry} days`;
  const months = Math.round(daysUntilExpiry / 30);
  return `Expires in ${months} month${months === 1 ? '' : 's'}`;
}

function warrantyLabel(row) {
  return `${row.brand} ${row.model_number}`.trim();
}

function buildDrafts({ warranties, claims, registrationsByWarrantyId, now }) {
  const drafts = [];

  for (const row of warranties) {
    const purchaseDate = parseDate(row.purchase_date);
    if (!purchaseDate) continue;

    const expiry = row.is_extended && row.extended_until
      ? parseDate(row.extended_until)
      : addMonths(purchaseDate, row.warranty_duration_months);
    if (!expiry) continue;

    const daysUntilExpiry = daysBetween(expiry, now);
    const isActive = daysUntilExpiry >= 0;
    const registrationStatus = registrationsByWarrantyId[row.id] ?? 'not_started';
    const daysSincePurchase = daysBetween(now, purchaseDate);
    const shouldPromptRegistration =
      isActive &&
      registrationStatus !== 'registered' &&
      registrationStatus !== 'not_available' &&
      daysSincePurchase >= 0 &&
      daysSincePurchase <= REGISTRATION_WINDOW_DAYS;

    if (shouldPromptRegistration) {
      const soon = daysSincePurchase >= REGISTRATION_WINDOW_DAYS * 0.75;
      drafts.push({
        warranty_id: row.id,
        kind: 'register_product',
        priority: soon ? 'high' : 'medium',
        title: `Register ${warrantyLabel(row)}`,
        body: soon
          ? 'The manufacturer registration window is getting tight. Open the warranty details and finish registration while it still counts.'
          : 'Register this product with the manufacturer so the full warranty and recall notices are active.',
        action_payload: { type: 'navigate', route: 'warranty_detail', warrantyId: row.id },
        evidence: {
          purchase_date: row.purchase_date,
          days_since_purchase: daysSincePurchase,
          registration_status: registrationStatus,
          registration_urgency: soon ? 'soon' : 'info',
        },
        fingerprint: `register_product:${row.id}`,
      });
    }

    if (isActive && !row.is_extended && daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
      drafts.push({
        warranty_id: row.id,
        kind: 'extend_before_expiry',
        priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
        title: `Review coverage for ${warrantyLabel(row)}`,
        body: `${formatRelativeExpiry(daysUntilExpiry)}. Check extension options before the original coverage lapses.`,
        action_payload: { type: 'navigate', route: 'extend_warranty', warrantyId: row.id },
        evidence: {
          expiration_date: expiry.toISOString().slice(0, 10),
          days_until_expiry: daysUntilExpiry,
          is_extended: row.is_extended,
        },
        fingerprint: `extend_before_expiry:${row.id}`,
      });
    }
  }

  const warrantyById = new Map(warranties.map((row) => [row.id, row]));
  for (const row of claims) {
    if (!OPEN_CLAIM_STATUSES.has(row.status)) continue;
    const createdAt = parseDate(row.created_at);
    if (!createdAt) continue;

    const daysOpen = daysBetween(now, createdAt);
    if (daysOpen < 7) continue;

    const warranty = warrantyById.get(row.warranty_id);
    drafts.push({
      warranty_id: row.warranty_id,
      kind: 'claim_follow_up',
      priority: daysOpen >= 14 ? 'high' : 'medium',
      title: warranty ? `Follow up on ${warrantyLabel(warranty)} claim` : 'Follow up on open claim',
      body: `This claim has been ${row.status === 'in_review' ? 'in review' : 'submitted'} for ${daysOpen} days. Check its status while the details are fresh.`,
      action_payload: { type: 'navigate', route: 'claims' },
      evidence: {
        claim_id: row.id,
        claim_status: row.status,
        claim_created_at: row.created_at,
        days_open: daysOpen,
      },
      fingerprint: `claim_follow_up:${row.id}`,
    });
  }

  const seen = new Set();
  return drafts
    .filter((draft) => {
      if (seen.has(draft.fingerprint)) return false;
      seen.add(draft.fingerprint);
      return true;
    })
    .sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      const priorityDelta = rank[b.priority] - rank[a.priority];
      if (priorityDelta !== 0) return priorityDelta;
      const aDays = typeof a.evidence.days_until_expiry === 'number' ? a.evidence.days_until_expiry : 9999;
      const bDays = typeof b.evidence.days_until_expiry === 'number' ? b.evidence.days_until_expiry : 9999;
      return aDays - bDays || a.fingerprint.localeCompare(b.fingerprint);
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration or auth.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: warranties, error: warrantyError }, { data: claims, error: claimError }, { data: registrations, error: registrationError }] =
      await Promise.all([
        supabase.from('warranties').select('*'),
        supabase.from('claims').select('*'),
        supabase.from('product_registrations').select('warranty_id, status'),
      ]);

    if (warrantyError) throw warrantyError;
    if (claimError) throw claimError;
    if (registrationError) throw registrationError;

    const registrationsByWarrantyId = {};
    for (const row of registrations ?? []) {
      registrationsByWarrantyId[row.warranty_id] = row.status;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const drafts = buildDrafts({
      warranties: warranties ?? [],
      claims: claims ?? [],
      registrationsByWarrantyId,
      now,
    });
    const draftFingerprints = drafts.map((draft) => draft.fingerprint);

    const { data: existingRows, error: existingError } = await supabase
      .from('agent_recommendations')
      .select('id, fingerprint, status')
      .eq('user_id', user.id);
    if (existingError) throw existingError;

    const existingByFingerprint = new Map((existingRows ?? []).map((row) => [row.fingerprint, row]));
    const upserts = drafts
      .filter((draft) => existingByFingerprint.get(draft.fingerprint)?.status !== 'dismissed')
      .map((draft) => ({
        user_id: user.id,
        warranty_id: draft.warranty_id,
        kind: draft.kind,
        status: 'open',
        priority: draft.priority,
        title: draft.title,
        body: draft.body,
        action_payload: draft.action_payload,
        evidence: draft.evidence,
        fingerprint: draft.fingerprint,
        last_evaluated_at: nowIso,
        dismissed_at: null,
        resolved_at: null,
      }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('agent_recommendations')
        .upsert(upserts, { onConflict: 'user_id,fingerprint' });
      if (upsertError) throw upsertError;
    }

    let resolveQuery = supabase
      .from('agent_recommendations')
      .update({ status: 'resolved', resolved_at: nowIso, dismissed_at: null, last_evaluated_at: nowIso })
      .eq('user_id', user.id)
      .eq('status', 'open');

    if (draftFingerprints.length > 0) {
      resolveQuery = resolveQuery.not('fingerprint', 'in', `(${draftFingerprints.map((fp) => `"${fp}"`).join(',')})`);
    }

    const { error: resolveError } = await resolveQuery;
    if (resolveError) throw resolveError;

    return new Response(JSON.stringify({ refreshed: drafts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
