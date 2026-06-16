import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useSector } from '../context/SectorContext';
import { SECTORS, type SectorType } from '../types';
import { Button, Input, Card } from '../components/ui/index';
import { AppButton } from '../components/primitives';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import * as orgRepo from '../repository/organizations';

const STEPS = [
  {
    emoji: '🏭',
    title: 'Bienvenue !',
    subtitle: 'Créez votre espace de travail pour commencer à gérer votre atelier.',
  },
  {
    emoji: '🧩',
    title: 'Votre secteur d’activité',
    subtitle: 'Sélectionnez le secteur qui correspond le mieux à votre organisation.',
  },
  {
    emoji: '✅',
    title: 'Tout est prêt.',
    subtitle: 'Votre atelier est configuré. Vous pouvez maintenant gérer vos tâches, documents et stock.',
  },
];

export function OnboardingScreen() {
  const { user, setScreen, showToast, initOrganization } = useApp();
  const { setSector } = useSector();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [selectedSector, setSelectedSector] = useState<SectorType>('generic');

  async function handleCreate() {
    if (!orgName.trim()) {
      setError('Le nom de l\'atelier est requis');
      return;
    }
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      const result = await orgRepo.createOrganization(user.id, orgName.trim());
      await initOrganization(result.organization, result.membership);
      setStep(1);
      showToast('success', `Atelier « ${orgName.trim()} » créé !`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSector() {
    await setSector(selectedSector);
    setStep(2);
  }

  function handleContinue() {
    setScreen('home');
  }

  const currentStep = STEPS[step];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1D4ED8', '#2563EB', '#60A5FA']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepsRow}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  index <= step && styles.stepDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{currentStep.emoji}</Text>
          </View>

          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>

          <Card style={[styles.card, SHADOW.lg]}>
            {step === 0 && (
              <>
                <Text style={styles.cardTitle}>Nom de votre atelier</Text>
                <Text style={styles.cardSub}>Ce nom sera visible de tous vos collaborateurs.</Text>
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
                <Input
                  label="Nom de l'atelier *"
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="Ex : Garage Dupont & Fils"
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                  autoFocus
                />
                <Button
                  label="Créer mon atelier"
                  onPress={handleCreate}
                  loading={loading}
                  fullWidth
                  size="lg"
                />
              </>
            )}

            {step === 1 && (
              <>
                <Text style={styles.cardTitle}>Votre secteur</Text>
                <Text style={styles.cardSub}>Choisissez le secteur qui correspond le mieux à votre activité.</Text>
                <View style={styles.sectorGrid}>
                  {SECTORS.map((sector) => (
                    <TouchableOpacity
                      key={sector.id}
                      style={[
                        styles.sectorTile,
                        selectedSector === sector.id && styles.sectorTileActive,
                      ]}
                      onPress={() => setSelectedSector(sector.id)}
                    >
                      <Text style={styles.sectorIcon}>{sector.icon}</Text>
                      <Text style={styles.sectorLabel}>{sector.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button
                  label="Valider mon secteur"
                  onPress={handleConfirmSector}
                  fullWidth
                  size="lg"
                />
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.cardTitle}>Votre atelier est prêt</Text>
                <Text style={styles.cardSub}>Vous pouvez maintenant commencer à gérer votre stock, vos tâches et vos documents.</Text>
                <View style={styles.featureRow}>
                  <Text style={styles.featureIcon}>📋</Text>
                  <Text style={styles.featureLabel}>Gestion des tâches</Text>
                </View>
                <View style={styles.featureRow}>
                  <Text style={styles.featureIcon}>📄</Text>
                  <Text style={styles.featureLabel}>Classement des documents</Text>
                </View>
                <View style={styles.featureRow}>
                  <Text style={styles.featureIcon}>📦</Text>
                  <Text style={styles.featureLabel}>Suivi du stock</Text>
                </View>
                <AppButton label="Accéder à mon atelier →" onPress={handleContinue} />
              </>
            )}
          </Card>

          {step < 2 && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>🎁 Essai gratuit 14 jours · Aucune carte bancaire requise</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: 64,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING['3xl'],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: { backgroundColor: '#fff', width: 24 },
  emojiWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
    paddingHorizontal: SPACING.lg,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.xl },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 14 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectorTile: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectorTileActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  sectorIcon: {
    fontSize: 28,
    marginBottom: SPACING.sm,
  },
  sectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  featureIcon: { fontSize: 20, marginRight: 12 },
  featureLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  featureCheck: { color: COLORS.success, fontWeight: '700', fontSize: 16 },
  trialBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  trialText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
});
