import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { AppButton, AppCard, AppField, Badge } from '../components/primitives';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: number;
  min_qty: number;
  supplier: string;
  allergens: string[];
  expiry_date: string;
}

interface HaccpCheck {
  id: string;
  zone: string;
  check_type: string;
  value: string;
  unit: string;
  result: 'conforme' | 'non_conforme';
  checked_by: string;
  checked_at: string;
  notes?: string;
}

const SAMPLE_INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'Poulet', category: 'Viandes', unit: 'kg', stock_qty: 8, min_qty: 5, supplier: 'Boucherie Locale', allergens: [], expiry_date: '2026-06-21' },
  { id: 'i2', name: 'Lait', category: 'Produits laitiers', unit: 'L', stock_qty: 3, min_qty: 4, supplier: 'Crèmerie', allergens: ['lait'], expiry_date: '2026-06-18' },
  { id: 'i3', name: 'Salade', category: 'Légumes', unit: 'pièce', stock_qty: 12, min_qty: 6, supplier: 'Primeur', allergens: [], expiry_date: '2026-06-19' },
];

const INITIAL_CHECKS: HaccpCheck[] = [
  { id: 'c1', zone: 'Chambre froide', check_type: 'Température', value: '4', unit: '°C', result: 'conforme', checked_by: 'Luc', checked_at: '2026-06-17T09:30:00Z' },
];

export function RestaurationScreen() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<'ingredients' | 'haccp'>('ingredients');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [checks, setChecks] = useState<HaccpCheck[]>(INITIAL_CHECKS);
  const [zone, setZone] = useState('Cuisine');
  const [checkType, setCheckType] = useState('Température');
  const [value, setValue] = useState('7');
  const [unit, setUnit] = useState('°C');
  const [result, setResult] = useState<'conforme' | 'non_conforme'>('conforme');
  const [notes, setNotes] = useState('');

  const categories = ['Tous', ...Array.from(new Set(SAMPLE_INGREDIENTS.map((item) => item.category)))];

  const filteredIngredients = useMemo(
    () => SAMPLE_INGREDIENTS.filter(
      (item) => categoryFilter === 'Tous' || item.category === categoryFilter,
    ),
    [categoryFilter],
  );

  const nonConformities = checks.filter((check) => check.result === 'non_conforme');

  async function exportPdf() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ type: 'haccp', checks }),
      });
      const data = await response.json();
      if (data.url) {
        showToast('success', 'PDF prêt à être téléchargé.');
      } else {
        showToast('error', 'Impossible de générer le PDF.');
      }
    } catch {
      showToast('error', 'Erreur lors de l’export PDF.');
    }
  }

  function addCheck() {
    const next: HaccpCheck = {
      id: `check-${Date.now()}`,
      zone,
      check_type: checkType,
      value,
      unit,
      result,
      checked_by: 'Equipe',
      checked_at: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };
    setChecks((prev) => [next, ...prev]);
    setNotes('');
    showToast('success', 'Contrôle ajouté.');
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('ingredients')} style={[styles.tabButton, tab === 'ingredients' && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === 'ingredients' && styles.tabLabelActive]}>Ingrédients</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('haccp')} style={[styles.tabButton, tab === 'haccp' && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === 'haccp' && styles.tabLabelActive]}>HACCP</Text>
        </TouchableOpacity>
      </View>

      {tab === 'ingredients' ? (
        <View>
          <View style={styles.filterRow}>
            {categories.map((cat) => (
              <TouchableOpacity key={cat} onPress={() => setCategoryFilter(cat)} style={[styles.categoryChip, categoryFilter === cat && styles.categoryChipActive]}>
                <Text style={[styles.categoryLabel, categoryFilter === cat && styles.categoryLabelActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredIngredients.map((ingredient) => {
            const alert = ingredient.stock_qty <= ingredient.min_qty || new Date(ingredient.expiry_date) <= new Date();
            return (
              <AppCard key={ingredient.id} style={styles.ingredientCard}>
                <View style={styles.ingredientHeader}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Badge label={alert ? 'Critique' : 'OK'} tone={alert ? 'danger' : 'success'} />
                </View>
                <Text style={styles.ingredientMeta}>Stock {ingredient.stock_qty}{ingredient.unit} · Seuil {ingredient.min_qty}{ingredient.unit}</Text>
                <Text style={styles.ingredientMeta}>DLC {ingredient.expiry_date} · {ingredient.supplier}</Text>
                {ingredient.allergens.length > 0 && (
                  <View style={styles.allergenRow}>
                    {ingredient.allergens.map((allergen) => (
                      <Badge key={allergen} label={allergen} tone="warning" />
                    ))}
                  </View>
                )}
              </AppCard>
            );
          })}
        </View>
      ) : (
        <View>
          <AppCard style={styles.checkForm}>
            <Text style={styles.sectionTitle}>Ajouter un contrôle</Text>
            <AppField label="Zone" value={zone} onChangeText={setZone} />
            <AppField label="Type" value={checkType} onChangeText={setCheckType} />
            <AppField label="Valeur" value={value} onChangeText={setValue} />
            <AppField label="Unité" value={unit} onChangeText={setUnit} />
            <AppField label="Résultat" value={result} onChangeText={(value) => setResult(value as HaccpCheck['result'])} />
            <AppField label="Notes" value={notes} onChangeText={setNotes} />
            <AppButton label="Enregistrer" onPress={addCheck} />
          </AppCard>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Non conformités</Text>
            <Text style={styles.summaryValue}>{nonConformities.length}</Text>
          </View>
          <AppButton label="Exporter les relevés" onPress={exportPdf} />

          {checks.map((check) => (
            <AppCard key={check.id} style={styles.checkCard}>
              <View style={styles.checkHeader}>
                <Text style={styles.checkTitle}>{check.zone}</Text>
                <Badge label={check.result === 'conforme' ? 'Conforme' : 'Non conforme'} tone={check.result === 'conforme' ? 'success' : 'danger'} />
              </View>
              <Text style={styles.checkMeta}>{check.check_type} · {check.value}{check.unit}</Text>
              <Text style={styles.checkMeta}>{check.checked_by} · {new Date(check.checked_at).toLocaleDateString('fr-FR')}</Text>
              {check.notes ? <Text style={styles.checkNotes}>{check.notes}</Text> : null}
            </AppCard>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, paddingBottom: SPACING['4xl'] },
  tabRow: { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.sm },
  tabButton: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabLabel: { color: COLORS.textSecondary, fontWeight: '700' },
  tabLabelActive: { color: COLORS.white },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  categoryChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryLabel: { color: COLORS.textSecondary, fontSize: 12 },
  categoryLabelActive: { color: COLORS.white },
  ingredientCard: { marginBottom: SPACING.sm },
  ingredientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredientName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  ingredientMeta: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  allergenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  checkForm: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  summaryLabel: { color: COLORS.textSecondary },
  summaryValue: { fontWeight: '700', color: COLORS.text },
  checkCard: { marginBottom: SPACING.sm },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  checkMeta: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  checkNotes: { color: COLORS.text, marginTop: SPACING.xs },
});
