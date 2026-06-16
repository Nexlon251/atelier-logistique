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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Autorisation requise' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Jeton invalide' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const message = String(body.message ?? '').trim();
    const organizationId = String(body.organizationId ?? '').trim();
    const extraContext = String(body.context ?? '').trim();

    if (!message || !organizationId) {
      return new Response(JSON.stringify({ error: 'message et organizationId requis' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userData.user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: 'Accès refusé à cette organisation' }), {
        status: 403,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: lowStock }, { data: overdueTasks }, { data: recentMovements }] = await Promise.all([
      supabase
        .from('parts')
        .select('name, quantity, alert_threshold, unit')
        .eq('organization_id', organizationId)
        .lte('quantity', 'alert_threshold')
        .order('quantity', { ascending: true })
        .limit(5),
      supabase
        .from('tasks')
        .select('title, status, due_date, assigned_to')
        .eq('organization_id', organizationId)
        .neq('status', 'done')
        .lte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('stock_movements')
        .select('type, quantity, reason, created_at, part_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const contextLines: string[] = [];

    if (lowStock?.length) {
      contextLines.push('Stocks critiques:');
      lowStock.forEach((part: any) => {
        contextLines.push(
          `- ${part.name}: ${part.quantity} ${part.unit ?? ''} (seuil ${part.alert_threshold})`,
        );
      });
    } else {
      contextLines.push('Aucun stock critique détecté.');
    }

    if (overdueTasks?.length) {
      contextLines.push('Tâches en retard:');
      overdueTasks.forEach((task: any) => {
        contextLines.push(
          `- ${task.title} (${task.status})${task.due_date ? ' depuis ' + task.due_date.split('T')[0] : ''}`,
        );
      });
    } else {
      contextLines.push('Aucune tâche en retard.');
    }

    if (recentMovements?.length) {
      contextLines.push('Derniers mouvements:');
      recentMovements.forEach((mov: any) => {
        contextLines.push(
          `- ${mov.type} ${mov.quantity} ${mov.reason ?? ''} (${mov.created_at.split('T')[0]})`,
        );
      });
    }

    if (extraContext) {
      contextLines.push(`Contexte supplémentaire: ${extraContext}`);
    }

    const anthropicKey = Deno.env.get('EXPO_PUBLIC_ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Clé Anthropic manquante' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es un assistant logistique expert. Tu aides à gérer les stocks, tâches et documents d'une entreprise. Réponds en français, de façon concise et actionnable.`;
    const prompt = `\n\nSystem: ${systemPrompt}\n\nContexte de l'organisation:\n${contextLines.join('\n')}\n\nUser: ${message}\n\nAssistant:`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': anthropicKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        prompt,
        max_tokens_to_sample: 500,
        temperature: 0.2,
        stop_sequences: ['\n\nHuman:'],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[ai-assistant] anthropic error', errText);
      return new Response(JSON.stringify({ error: 'Erreur externe Anthropic' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const anthropicData = await anthropicRes.json();
    const reply = String(anthropicData.completion ?? anthropicData?.completion?.[0] ?? '').trim();

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ai-assistant]', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
