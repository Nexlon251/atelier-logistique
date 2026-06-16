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
import { Button, Input } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import { isSupabaseConfigured } from '../lib/supabase';

type Mode = 'login' | 'signup';

export function LoginScreen() {
  const { signIn, signUp, enterDemoMode } = useApp();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const supabaseReady = isSupabaseConfigured;

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Votre nom complet est requis.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, fullName.trim());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    try {
      await enterDemoMode();
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#1D4ED8', '#2563EB', '#3B82F6']}
        style={styles.gradient}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🔧</Text>
          </View>
          <Text style={styles.brand}>Atelier Logistique</Text>
          <Text style={styles.tagline}>Gérez votre atelier. Partout.</Text>
        </View>

        {/* Card */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, SHADOW.lg]}>
            {/* Tabs */}
            {supabaseReady && (
              <View style={styles.tabs}>
                {(['login', 'signup'] as Mode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.tab, mode === m && styles.tabActive]}
                    onPress={() => { setMode(m); setError(''); }}
                  >
                    <Text style={[styles.tabLabel, mode === m && styles.tabLabelActive]}>
                      {m === 'login' ? 'Connexion' : 'Inscription'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!supabaseReady && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Supabase non configuré — mode démo uniquement.
                </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {supabaseReady && (
              <>
                {mode === 'signup' && (
                  <Input
                    label="Nom complet"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Jean Dupont"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                )}
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="contact@atelier.fr"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <Input
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <Button
                  label={mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  onPress={handleSubmit}
                  loading={loading}
                  fullWidth
                  style={{ marginBottom: SPACING.md }}
                />
              </>
            )}

            {/* Demo separator */}
            <View style={styles.separator}>
              <View style={styles.sepLine} />
              <Text style={styles.sepText}>ou</Text>
              <View style={styles.sepLine} />
            </View>

            <Button
              label="🚀 Essayer en mode démo"
              variant="secondary"
              onPress={handleDemo}
              loading={demoLoading}
              fullWidth
            />

            <Text style={styles.demoNote}>
              Données fictives — aucune inscription requise. Idéal pour découvrir l'application.
            </Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            © {new Date().getFullYear()} Atelier Logistique · Tous droits réservés
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 64, paddingBottom: 32 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 36 },
  brand: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  scroll: { flexGrow: 1, padding: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.surface, ...SHADOW.sm },
  tabLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: COLORS.text, fontWeight: '700' },
  warningBox: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  warningText: { color: COLORS.warning, fontSize: 13, fontWeight: '500' },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: { color: COLORS.danger, fontSize: 14 },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  sepLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  sepText: { fontSize: 13, color: COLORS.textMuted },
  demoNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
