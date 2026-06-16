import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';

const FEATURES = [
  { emoji: '📋', label: 'Gestion des tâches atelier sans limite' },
  { emoji: '📄', label: 'Classement photos de documents' },
  { emoji: '📦', label: 'Suivi stock & alertes de rupture' },
  { emoji: '👥', label: 'Équipe jusqu\'à 10 collaborateurs' },
  { emoji: '🔔', label: 'Alertes et notifications' },
  { emoji: '☁️', label: 'Synchronisation multi-appareils' },
  { emoji: '🛡️', label: 'Sécurité & isolation des données' },
  { emoji: '📱', label: 'iOS, Android & Web' },
];

export function SubscriptionScreen() {
  const { organization, signOut } = useApp();
  const [loading, setLoading] = useState(false);

  const isCanceled = organization?.billing_status === 'canceled';
  const isPastDue = organization?.billing_status === 'past_due';

  async function handleSubscribe() {
    setLoading(true);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <LinearGradient
        colors={['#1D4ED8', '#2563EB']}
        style={styles.header}
      >
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.headerTitle}>
          {isPastDue ? 'Paiement en retard' : 'Abonnement requis'}
        </Text>
        <Text style={styles.headerSub}>
          {isPastDue
            ? 'Votre paiement n\'a pas pu être traité. Mettez à jour votre moyen de paiement pour continuer.'
            : isCanceled
            ? 'Votre abonnement a été annulé. Réabonnez-vous pour accéder à votre atelier.'
            : 'Votre essai gratuit est terminé. Passez à un abonnement pour continuer.'}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Price card */}
        <View style={[styles.priceCard, SHADOW.lg]}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>29€</Text>
            <View>
              <Text style={styles.pricePer}>/mois</Text>
              <Text style={styles.priceSub}>par organisation</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureCheck}>✓</Text>
              </View>
            ))}
          </View>

          <View style={{ height: SPACING.xl }} />

          {isPastDue ? (
            <Button
              label="Mettre à jour le paiement →"
              onPress={handleManage}
              loading={loading}
              fullWidth
              size="lg"
            />
          ) : (
            <Button
              label="S'abonner maintenant →"
              onPress={handleSubscribe}
              loading={loading}
              fullWidth
              size="lg"
            />
          )}

          <Text style={styles.guarantee}>
            🔒 Paiement sécurisé via Stripe · Annulable à tout moment · Sans engagement
          </Text>
        </View>

        {/* Sign out option */}
        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={signOut}
          style={{ marginTop: SPACING.lg, alignSelf: 'center' }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 64,
    paddingBottom: SPACING['3xl'],
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 60,
  },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: -SPACING['2xl'],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  price: { fontSize: 48, fontWeight: '800', color: COLORS.primary },
  pricePer: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  priceSub: { fontSize: 13, color: COLORS.textMuted },
  featuresList: { gap: 2 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  featureEmoji: { fontSize: 18, marginRight: 12, width: 28 },
  featureLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  featureCheck: { color: COLORS.success, fontWeight: '700', fontSize: 16 },
  guarantee: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});
