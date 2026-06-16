import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { Button, Card, Input } from '../components/ui';
import { extractDocument } from '../services/ocr';

const mapCategory = (type: string) => {
  const normalized = type?.toLowerCase() || '';
  if (normalized.includes('facture')) return 'invoice';
  if (normalized.includes('bon de livraison') || normalized.includes('livraison')) return 'delivery';
  if (normalized.includes('bon de commande') || normalized.includes('commande')) return 'manual';
  if (normalized.includes('devis')) return 'receipt';
  return 'other';
};

const sanitizeNumber = (value: string | number) => {
  const parsed = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ScanScreen() {
  const { organization, parts, recordMovement, addDocument, showToast } = useApp();
  const [photoUri, setPhotoUri] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [total, setTotal] = useState('');
  const [lines, setLines] = useState<Array<{ article: string; quantite: string; prix: string }>>([]);

  const pickImage = async (fromCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        base64: true,
        quality: 0.8,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      const cancelled = 'cancelled' in result ? result.cancelled : result.assets?.length === 0;
      if (cancelled) {
        return;
      }

      const asset = 'assets' in result ? result.assets?.[0] : result;
      const uri = asset?.uri || '';
      const base64 = asset?.base64 || '';
      if (!uri) {
        showToast('error', 'Impossible de récupérer l’image.');
        return;
      }

      setPhotoUri(uri);
      setImageBase64(base64);
      clearExtracted();
    } catch (error) {
      showToast('error', 'Impossible d’ouvrir la caméra ou la galerie.');
    }
  };

  const clearExtracted = () => {
    setDocumentType('');
    setFournisseur('');
    setDate('');
    setReference('');
    setTotal('');
    setLines([]);
  };

  const handleExtract = async () => {
    if (!imageBase64 || !organization?.id) {
      showToast('warning', 'Sélectionnez d’abord une photo.');
      return;
    }

    setLoading(true);
    try {
      const response = await extractDocument(imageBase64, organization.id);
      setDocumentType(response.type || 'autre');
      setFournisseur(response.fournisseur || '');
      setDate(response.date || '');
      setReference(response.reference || '');
      setTotal(response.total !== undefined ? String(response.total) : '');
      setLines((response.lignes || []).map((ligne) => ({
        article: ligne.article || '',
        quantite: ligne.quantite ? String(ligne.quantite) : '',
        prix: ligne.prix ? String(ligne.prix) : '',
      })));
      if (!response.lignes?.length) {
        showToast('warning', 'Aucune ligne détectée. Vérifiez le document ou corrigez manuellement.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Échec de l’extraction OCR.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportStock = async () => {
    if (!lines.length) {
      showToast('warning', 'Aucune ligne à importer.');
      return;
    }

    setLoading(true);
    const unmatched: string[] = [];
    try {
      for (const line of lines) {
        const article = line.article.trim();
        const quantity = sanitizeNumber(line.quantite);
        if (!article || quantity <= 0) {
          continue;
        }

        const match = parts.find((part) =>
          part.name.toLowerCase() === article.toLowerCase() ||
          (part.reference || '').toLowerCase() === article.toLowerCase(),
        );

        if (!match) {
          unmatched.push(article);
          continue;
        }

        await recordMovement(match.id, 'in', quantity, `Import OCR ${reference || ''}`);
      }

      showToast('success', `Import terminé. ${unmatched.length ? `${unmatched.length} article(s) non trouvés.` : 'Toutes les lignes ont été importées.'}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l’import en stock.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!organization?.id) {
      showToast('warning', 'Aucune organisation sélectionnée.');
      return;
    }

    if (!photoUri) {
      showToast('warning', 'Ajoutez une photo avant de sauvegarder.');
      return;
    }

    setLoading(true);
    try {
      await addDocument({
        title: `${documentType || 'Document OCR'} ${reference || ''}`.trim(),
        category: mapCategory(documentType),
        notes: `Fournisseur: ${fournisseur || 'N/A'}\nDate: ${date || 'N/A'}\nRéférence: ${reference || 'N/A'}\nTotal: ${total || 'N/A'}`,
      }, {
        uri: photoUri,
        mimeType: 'image/jpeg',
      });

      showToast('success', 'Document sauvegardé.');
      clearExtracted();
      setPhotoUri('');
      setImageBase64('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Impossible de sauvegarder le document.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, field: 'article' | 'quantite' | 'prix', value: string) => {
    setLines((current) => current.map((line, idx) => idx === index ? { ...line, [field]: value } : line));
  };

  const addLine = () => setLines((current) => [...current, { article: '', quantite: '', prix: '' }]);
  const removeLine = (index: number) => setLines((current) => current.filter((_, idx) => idx !== index));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.instructionBox}>
        <Text style={styles.helpText}>Scannez un document logistique ou sélectionnez une image pour extraire les données.</Text>
      </View>

      <View style={styles.buttonRow}>
        <Button label="Scanner un document" onPress={() => pickImage(true)} loading={loading} />
        <Button label="Galerie" onPress={() => pickImage(false)} loading={loading} />
      </View>

      {photoUri ? (
        <Card style={styles.previewCard}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
        </Card>
      ) : null}

      <Button label="Extraire le texte" onPress={handleExtract} loading={loading} disabled={!imageBase64} />

      <Card style={styles.metaCard}>
        <Input label="Type de document" value={documentType} onChangeText={setDocumentType} error={!documentType ? 'Requis' : ''} />
        <Input label="Fournisseur" value={fournisseur} onChangeText={setFournisseur} />
        <Input label="Date" value={date} onChangeText={setDate} />
        <Input label="Référence" value={reference} onChangeText={setReference} />
        <Input label="Total" value={total} onChangeText={setTotal} />
      </Card>

      <Card style={styles.linesCard}>
        <Text style={styles.linesTitle}>Lignes détectées</Text>
        {lines.map((line, index) => (
          <View key={`${index}-${line.article}`} style={styles.lineRow}>
            <Input label="Article" value={line.article} onChangeText={(text) => updateLine(index, 'article', text)} />
            <Input label="Quantité" value={line.quantite} onChangeText={(text) => updateLine(index, 'quantite', text)} />
            <Input label="Prix" value={line.prix} onChangeText={(text) => updateLine(index, 'prix', text)} />
            <Button label="Suppr." onPress={() => removeLine(index)} style={styles.deleteButton} />
          </View>
        ))}
        <Button label="Ajouter une ligne" onPress={addLine} />
      </Card>

      <View style={styles.buttonRow}>
        <Button label="Importer en stock" onPress={handleImportStock} loading={loading} disabled={!lines.length} />
        <Button label="Sauvegarder le document" onPress={handleSaveDocument} loading={loading} disabled={!photoUri} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  helpText: {
    marginBottom: 12,
  },
  previewCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  instructionBox: {
    marginBottom: 12,
  },
  metaCard: {
    marginBottom: 16,
  },
  linesCard: {
    marginBottom: 16,
  },
  linesTitle: {
    marginBottom: 10,
  },
  lineRow: {
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 8,
  },
});
