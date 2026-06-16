import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Button, Input } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import * as orgRepo from '../repository/organizations';

const STEPS = [
  {
    emoji: '🏭',
    title: 'Bienvenue !',
    subtitle: 'Créez votre espace de travail pour commencer à gérer votre atelier.',
  },
  {
    emoji: '✅',
    title: 'Tout est prêt.',
    subtitle: 'Votre atelier est configuré. Vous pouvez maintenant gérer vos tâches, documents et stock.',
  },
];

export function OnboardingScreen() {
  const { user, setScreen, showToast, initOrganization } = useApp();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
      setDone(true);
      showToast('success', `Atelier « ${orgName.trim()} » créé !`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setScreen('home');
  }

  const step = done ? STEPS[1] : STEPS[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1D4ED8', '#2563EB', '#60A5FA']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Steps indicator */}
          <View style={styles.stepsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  (done ? i <= 1 : i === 0) && styles.stepDotActive,
                ]}
              />
            ))}
          </View>

          {/* Emoji */}
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{step.emoji}</Text>
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>

          {/* Card */}
          <View style={[styles.card, SHADOW.lg]}>
            {!done ? (
              <>
                <Text style={styles.cardTitle}>Nom de votre atelier</Text>
                <Text style={styles.cardSub}>
                  Ce nom sera visible de tous vos collaborateurs.
                </Text>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Input
                  label="Nom de l'atelier *"
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="Ex: Garage Dupont & Fils"
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
            ) : (
              <>
                {/* Features list */}
                {[
                  { icon: '📋', label: 'Gestion des tâches atelier' },
                  { icon: '📄', label: 'Classement des documents' },
                  { icon: '📦', label: 'Suivi du stock pièces' },
                  { icon: '👥', label: 'Collaborateurs & rôles' },
                ].map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <Text style={styles.featureCheck}>✓</Text>
                  </View>
                ))}

                <View style={{ height: SPACING.xl }} />
                <Button
                  label="Accéder à mon atelier →"
                  onPress={handleContinue}
                  fullWidth
                  size="lg"
                />
              </>
            )}
          </View>

          {/* Trial info */}
          {!done && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>
                🎁 Essai gratuit 14 jours · Aucune carte bancaire requise
              </Text>
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
