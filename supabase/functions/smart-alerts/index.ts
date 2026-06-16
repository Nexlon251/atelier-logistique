import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@3.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { headers: { 'x-verify-admin': 'true' } },
});

serve(async (request: Request) => {
  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response('Invalid token', { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;
    if (!organizationId) {
      return new Response('Missing organizationId', { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userData.user.id)
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return new Response('Access denied', { status: 403 });
    }

    const now = new Date();
    const overdueCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const recentMovementCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: parts }, { data: tasks }, { data: movements }] = await Promise.all([
      supabase.from('parts').select('*').eq('organization_id', organizationId).is('archived_at', null),
      supabase.from('tasks').select('*').eq('organization_id', organizationId).neq('status', 'done'),
      supabase.from('stock_movements').select('*').eq('organization_id', organizationId).gte('created_at', recentMovementCutoff),
    ]);

    if (!parts || !tasks || !movements) {
      return new Response('Impossible de récupérer les données de surveillance', { status: 500 });
    }

    const alerts: Array<Record<string, unknown>> = [];

    for (const part of parts) {
      if (part.quantity <= part.alert_threshold) {
        alerts.push({
          organization_id: organizationId,
          type: 'stock_low',
          severity: part.quantity === 0 ? 'critical' : 'attention',
          message: `Stock bas pour ${part.name} (${part.quantity} restant${part.quantity > 1 ? 's' : ''})`,
          entity_id: part.id,
        });
      }
    }

    for (const task of tasks) {
      if (task.due_date && task.due_date < overdueCutoff) {
        alerts.push({
          organization_id: organizationId,
          type: 'task_overdue',
          severity: 'critical',
          message: `Tâche en retard : ${task.title}`,
          entity_id: task.id,
        });
      }
    }

    for (const movement of movements) {
      if (
        movement.type === 'out' && movement.quantity > 50 ||
        movement.type === 'adjustment' && movement.quantity > 100
      ) {
        alerts.push({
          organization_id: organizationId,
          type: 'movement_anomaly',
          severity: 'attention',
          message: `Mouvement suspect : ${movement.type} ${movement.quantity}`,
          entity_id: movement.part_id,
        });
      }
    }

    if (alerts.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: insertError } = await supabase.from('alerts').insert(alerts);
    if (insertError) {
      return new Response(insertError.message, { status: 500 });
    }

    return new Response(JSON.stringify({ inserted: alerts.length }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(`Error: ${err instanceof Error ? err.message : 'unknown'}`, { status: 500 });
  }
});
