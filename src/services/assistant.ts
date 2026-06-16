import { getSupabase } from '../lib/supabase';

interface AssistantResponse {
  reply: string;
}

export async function askAssistant(
  message: string,
  organizationId: string,
  context?: string,
): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb.functions.invoke<AssistantResponse>('ai-assistant', {
    body: JSON.stringify({ message, organizationId, context }),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.reply) {
    throw new Error('Réponse invalide de l assistant');
  }

  return data.reply;
}
