import { getSupabase } from '../lib/supabase';

type StripeFunctionResponse = {
  url?: string;
  error?: string;
};

async function invokeStripeFunction(
  functionName: 'stripe-checkout' | 'stripe-portal',
  organizationId: string,
): Promise<string> {
  if (!organizationId) {
    throw new Error('organization_id est requis');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: JSON.stringify({ organization_id: organizationId }),
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = data as StripeFunctionResponse | null;
  const url = payload?.url;
  if (!url) {
    throw new Error(payload?.error ?? 'URL introuvable depuis Stripe');
  }

  return url;
}

export async function startCheckout(organizationId: string): Promise<string> {
  return invokeStripeFunction('stripe-checkout', organizationId);
}

export async function openPortal(organizationId: string): Promise<string> {
  return invokeStripeFunction('stripe-portal', organizationId);
}
