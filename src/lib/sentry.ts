/**
 * Sentry wrapper — installe @sentry/react-native puis active le DSN.
 * Sans DSN configuré, toutes les fonctions sont des no-ops silencieux.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let _initialized = false;

async function init() {
  if (_initialized || !DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? 'development' : 'production',
    });
    _initialized = true;
  } catch {
    /* package not installed — no-op */
  }
}

export async function captureException(err: unknown, ctx?: Record<string, unknown>) {
  await init();
  if (!_initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(err, { extra: ctx });
  } catch {
    /* no-op */
  }
}

export async function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  await init();
  if (!_initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.captureMessage(msg, level);
  } catch {
    /* no-op */
  }
}

export async function setUser(user: { id: string; email?: string } | null) {
  await init();
  if (!_initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.setUser(user);
  } catch {
    /* no-op */
  }
}
