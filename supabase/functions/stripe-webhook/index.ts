// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook
// Register webhook in Stripe Dashboard pointing to:
// https://<project>.supabase.co/functions/v1/stripe-webhook
//
// Events to listen: checkout.session.completed, customer.subscription.updated,
//                   customer.subscription.deleted, invoice.payment_failed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

async function updateOrgBilling(
  customerId: string,
  updates: {
    billing_status?: string;
    stripe_subscription_id?: string;
  },
) {
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('stripe_customer_id', customerId);

  if (error) console.error('[webhook] updateOrgBilling error', error);
}

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature invalid', err);
    return new Response('Webhook signature invalid', { status: 400 });
  }

  console.log('[webhook]', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          await updateOrgBilling(session.customer as string, {
            billing_status: 'active',
            stripe_subscription_id: session.subscription as string,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const statusMap: Record<string, string> = {
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'past_due',
          incomplete: 'past_due',
          incomplete_expired: 'canceled',
          paused: 'canceled',
        };
        await updateOrgBilling(sub.customer as string, {
          billing_status: statusMap[sub.status] ?? 'none',
          stripe_subscription_id: sub.id,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await updateOrgBilling(sub.customer as string, {
          billing_status: 'canceled',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await updateOrgBilling(invoice.customer as string, {
            billing_status: 'past_due',
          });
        }
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error', err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
