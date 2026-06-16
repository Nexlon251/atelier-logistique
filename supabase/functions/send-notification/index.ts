import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  const { type, to, subject, html, push_token, push_title, push_body } = await req.json();

  const results: Record<string, unknown> = {};

  // ── Email via Resend ──────────────────────────────────────────────────────
  if (type === 'email' || type === 'both') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Atelier <noreply@atelierlogistique.fr>', to, subject, html }),
    });
    results.email = res.ok ? 'sent' : await res.text();
  }

  // ── Push via Expo ─────────────────────────────────────────────────────────
  if ((type === 'push' || type === 'both') && push_token) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: push_token, title: push_title, body: push_body }),
    });
    results.push = res.ok ? 'sent' : await res.text();
  }

  // ── Log dans notifications table ──────────────────────────────────────────
  if (SUPABASE_URL && SUPABASE_KEY) {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    await sb.from('notifications').insert({
      type, recipient: Array.isArray(to) ? to[0] : to,
      subject, status: 'sent', sent_at: new Date().toISOString(),
    }).throwOnError();
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
});
