import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../context/AppContext';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { APIKeyScreen } from '../screens/APIKeyScreen';
import { EnterpriseScreen } from '../screens/EnterpriseScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { StockScreen } from '../screens/StockScreen';
import { OrganizationScreen } from '../screens/OrganizationScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { AssistantScreen } from '../screens/AssistantScreen';
import { LoadingOverlay, ToastBar } from '../components/ui/index';
import { BillingGuard } from '../components/BillingGuard';
import { COLORS, SHADOW, RADIUS, SPACING } from '../components/ui/theme';
import { CalendarScreen } from '../screens/CalendarScreen';
import { StatsScreen } from '../screens/StatsScreen';
import type { AppScreen } from '../types';

type Tab = {
  key: Extract<AppScreen, 'home' | 'tasks' | 'calendar' | 'stock' | 'stats' | 'assistant'>;
  label: string;
  icon: string;
  activeIcon: string;
};

const TABS: Tab[] = [
  { key: 'home',     label: 'Accueil',   icon: '🏠', activeIcon: '🏠' },
  { key: 'tasks',    label: 'Tâches',    icon: '📋', activeIcon: '📋' },
  { key: 'assistant',label: 'Assistant', icon: '🤖', activeIcon: '🤖' },
  { key: 'calendar', label: 'Agenda',    icon: '📅', activeIcon: '📅' },
  { key: 'stock',    label: 'Stock',     icon: '📦', activeIcon: '📦' },
  { key: 'stats',    label: 'Stats',     icon: '📊', activeIcon: '📊' },
];

const MAIN_SCREENS = TABS.map((t) => t.key) as AppScreen[];

export function AppShell() {
  const { screen, setScreen, isLoading, toasts, tasks, parts, organization, isDemo } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <LoadingOverlay message="Démarrage…" />
      </View>
    );
  }

  // Billing gate: block main screens when subscription expired (not demo, not org screen)
  const billingBlocked =
    !isDemo &&
    !!organization &&
    (organization.billing_status === 'canceled' ||
      organization.billing_status === 'past_due') &&
    screen !== 'organization';

  const showTabs = MAIN_SCREENS.includes(screen) && !billingBlocked;

  // Badge counts for tab bar
  const tasksBadge = tasks.filter((t) => t.status !== 'done').length;
  const stockBadge = parts.filter((p) => p.quantity <= p.alert_threshold).length;

  function getBadge(key: Tab['key']): number {
    if (key === 'tasks') return tasksBadge;
    if (key === 'stock') return stockBadge;
    return 0;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="auto" />

      {/* Screen content */}
      <View style={styles.content}>
        {screen === 'login' && <LoginScreen />}
        {screen === 'onboarding' && <OnboardingScreen />}
        {screen === 'home' && (
          <BillingGuard organization={organization}>
            <HomeScreen />
          </BillingGuard>
        )}
        {screen === 'tasks' && (
          <BillingGuard organization={organization}>
            <TasksScreen />
          </BillingGuard>
        )}
        {screen === 'enterprise' && (
          <BillingGuard organization={organization}>
            <EnterpriseScreen />
          </BillingGuard>
        )}
        {screen === 'documents' && (
          <BillingGuard organization={organization}>
            <DocumentsScreen />
          </BillingGuard>
        )}
        {screen === 'stock' && (
          <BillingGuard organization={organization}>
            <StockScreen />
          </BillingGuard>
        )}
        {screen === 'assistant' && (
          <BillingGuard organization={organization}>
            <AssistantScreen />
          </BillingGuard>
        )}
        {screen === 'calendar' && (
          <BillingGuard organization={organization}>
            <CalendarScreen />
          </BillingGuard>
        )}
        {screen === 'stats' && (
          <BillingGuard organization={organization}>
            <StatsScreen />
          </BillingGuard>
        )}
        {screen === 'organization' && <OrganizationScreen />}
      </View>

      {/* Toast stack */}
      <View style={styles.toastStack} pointerEvents="none">
        {toasts.map((t) => (
          <ToastBar key={t.id} type={t.type} message={t.message} />
        ))}
      </View>

      {/* Tab bar */}
      {showTabs && (
        <SafeAreaView style={styles.tabBarSafe}>
          <View style={[styles.tabBar, SHADOW.lg]}>
            {TABS.map((tab) => {
              const active = screen === tab.key;
              const badge = getBadge(tab.key);
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => setScreen(tab.key)}
                  activeOpacity={0.7}
                >
                  {/* Active indicator */}
                  {active && <View style={styles.activeIndicator} />}

                  {/* Icon with badge */}
                  <View style={styles.iconWrap}>
                    <Text style={[styles.tabIcon, active && styles.tabIconActive]}>
                      {tab.icon}
                    </Text>
                    {badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {badge > 9 ? '9+' : badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1 },
  toastStack: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  tabBarSafe: {
    backgroundColor: COLORS.tabBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.tabBg,
    paddingVertical: Platform.OS === 'ios' ? 2 : 6,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -1,
    width: 28,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  iconWrap: { position: 'relative', marginBottom: 2 },
  tabIcon: { fontSize: 22, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: COLORS.tabInactive, fontWeight: '500' },
  tabLabelActive: { color: COLORS.tabActive, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
