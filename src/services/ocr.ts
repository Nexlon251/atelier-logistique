import { getSupabase } from '../lib/supabase';

type OCRResponse = {
  type?: string;
  fournisseur?: string;
  date?: string;
  reference?: string;
  lignes?: Array<{ article?: string; quantite?: number; prix?: number }>;
  total?: number;
};

export async function extractDocument(
  imageBase64: string,
  organizationId: string,
): Promise<OCRResponse> {
  const sb = getSupabase();
  const { data, error } = await sb.functions.invoke<OCRResponse>('ocr-extract', {
    body: JSON.stringify({ image: imageBase64, organizationId }),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Réponse OCR invalide');
  }

  return data;
}
