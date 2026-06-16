import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@3.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('EXPO_PUBLIC_ANTHROPIC_API_KEY');
const ocrSpaceKey = Deno.env.get('OCR_SPACE_API_KEY') || 'helloworld';
if (!anthropicApiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { headers: { 'x-verify-admin': 'true' } },
});

const prompt = (imageHint: string) => `Tu es un assistant qui extrait des informations de documents logistiques et de factures. Analyse le document et réponds uniquement avec un objet JSON valide.

Document: ${imageHint}

Retourne un JSON avec les champs suivants:
- type: "facture", "bon de livraison", "bon de commande", "devis", ou "autre"
- fournisseur: nom du fournisseur si présent
- date: date du document si identifiable
- reference: numéro de document ou référence
- lignes: liste d'articles ou pièces avec article, quantite et prix
- total: montant total si présent

Exemple:
{
  "type": "facture",
  "fournisseur": "Fournisseur X",
  "date": "2026-06-14",
  "reference": "INV-123",
  "lignes": [
    { "article": "Vis M4", "quantite": 50, "prix": 0.12 },
    { "article": "Câble 2m", "quantite": 20, "prix": 4.50 }
  ],
  "total": 120.00
}
`;

serve(async (request: Request) => {
  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { image, organizationId } = body;

    if (!image || !organizationId) {
      return new Response('Missing image or organizationId', { status: 400 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response('Invalid user token', { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('profile_id', userData.user.id)
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return new Response('Access denied', { status: 403 });
    }

    const sanitizedBase64 = typeof image === 'string'
      ? image.replace(/^data:image\/[a-z]+;base64,/, '')
      : '';

    if (!sanitizedBase64) {
      return new Response('Image base64 invalide', { status: 400 });
    }

    const ocrForm = new FormData();
    ocrForm.append('base64Image', `data:image/jpeg;base64,${sanitizedBase64}`);
    ocrForm.append('language', 'fre');
    ocrForm.append('OCREngine', '2');
    ocrForm.append('isOverlayRequired', 'false');
    ocrForm.append('apikey', ocrSpaceKey);

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: ocrForm,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      return new Response(`OCR parse error: ${errorText}`, { status: 502 });
    }

    const ocrResult = await ocrResponse.json();
    const parsedText = ocrResult?.ParsedResults?.[0]?.ParsedText;
    if (!parsedText) {
      return new Response('Impossible de lire le texte du document.', { status: 502 });
    }

    const promptText = prompt(parsedText);

    const response = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anthropicApiKey}`,
      },
      body: JSON.stringify({
        model: 'claude-3.5',
        prompt: `\u0000${promptText}\n\n`,
        max_tokens_to_sample: 600,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`OCR service error: ${errorText}`, { status: 502 });
    }

    const completion = await response.json();
    const assistantReply = completion?.completion || completion?.message || '';
    const jsonMatch = assistantReply.trim().match(/\{[\s\S]*\}$/);
    if (!jsonMatch) {
      return new Response('Impossible d’extraire un JSON valide de la réponse OCR.', { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(`OCR extract failed: ${error.message}`, { status: 500 });
  }
});
