// supabase/functions/send-invitation/index.ts
// Deploy: supabase functions deploy send-invitation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { invitation_id } = await req.json();

    // Récupérer l'invitation et l'organisation
    const { data: inv, error } = await supabase
      .from('invitations')
      .select('*, organizations(name)')
      .eq('id', invitation_id)
      .single();

    if (error || !inv) {
      return new Response(JSON.stringify({ error: 'Invitation introuvable' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://atelierlogistique.fr';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const orgName = (inv.organizations as { name: string })?.name ?? 'l\'atelier';
    const inviteUrl = `${appUrl}/invite?token=${inv.token}`;

    // Envoyer via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
       from: 'Atelier Logistique <onboarding@resend.dev>',
        to: [inv.email],
        subject: `Invitation à rejoindre ${orgName} sur Atelier Logistique`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #2563EB; font-size: 28px; margin: 0;">🔧 Atelier Logistique</h1>
            </div>

            <div style="background: #F8FAFC; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
              <h2 style="color: #0F172A; margin-top: 0;">Vous êtes invité !</h2>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                Vous avez été invité à rejoindre <strong>${orgName}</strong>
                sur Atelier Logistique en tant que <strong>${inv.role === 'admin' ? 'Administrateur' : 'Membre'}</strong>.
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                Gérez vos tâches d'atelier, documents et stock depuis votre téléphone.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}"
                 style="background: #2563EB; color: white; padding: 16px 32px; border-radius: 12px;
                        text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block;">
                Accepter l'invitation →
              </a>
            </div>

            <p style="color: #94A3B8; font-size: 13px; text-align: center;">
              Ce lien expire dans 7 jours.<br>
              Si vous n'attendiez pas cette invitation, ignorez cet email.
            </p>

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
            <p style="color: #94A3B8; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Atelier Logistique
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('[send-invitation] Resend error:', err);
      return new Response(JSON.stringify({ error: 'Envoi email échoué', detail: err }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, to: inv.email }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-invitation]', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
