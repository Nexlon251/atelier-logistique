import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import type { BillingStatus, Organization } from '../types';
import { COLORS, RADIUS, SPACING, SHADOW } from './ui/theme';

interface BillingGuardProps {
  organization?: Organization | null;
  allowStatuses?: BillingStatus[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const DEFAULT_ALLOW: BillingStatus[] = ['active', 'trialing'];

export function BillingGuard({
  organization,
  allowStatuses = DEFAULT_ALLOW,
  fallback,
  children,
}: BillingGuardProps) {
  if (!organization || allowStatuses.includes(organization.billing_status)) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      {fallback ?? <SubscriptionScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
