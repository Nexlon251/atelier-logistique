import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL      = Deno.env.get('APP_URL') ?? 'https://atelierlogistique.fr';

serve(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Pièces sous seuil, toutes orgs actives
  const { data: parts, error } = await sb
    .from('parts')
    .select('id, name, quantity, minimum_threshold, organization_id, organizations(name, billing_status)')
    .lt('quantity', sb.raw('minimum_threshold'))
    .not('organizations.billing_status', 'eq', 'canceled');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const alerts = parts ?? [];
  let sent = 0;

  for (const part of alerts) {
    const org = part.organizations as { name: string } | null;

    // 2. Récupère les admins/owners de l'org
    const { data: members } = await sb
      .from('memberships')
      .select('profiles(email, full_name)')
      .eq('organization_id', part.organization_id)
      .in('role', ['owner', 'admin']);

    const emails = (members ?? [])
      .map((m: { profiles: { email: string } | null }) => m.profiles?.email)
      .filter(Boolean) as string[];

    if (emails.length === 0) continue;

    // 3. Envoie la notification
    await fetch(`${APP_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({
        type: 'email',
        to: emails,
        subject: `⚠️ Stock bas — ${part.name}`,
        html: `<p>La pièce <strong>${part.name}</strong> (org: ${org?.name ?? '—'}) 
               est passée sous son seuil minimum.<br>
               Stock actuel : <strong>${part.quantity}</strong> · 
               Seuil : <strong>${part.minimum_threshold}</strong></p>
               <p><a href="${APP_URL}">Gérer le stock →</a></p>`,
      }),
    });
    sent++;
  }

  return new Response(JSON.stringify({ checked: alerts.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
