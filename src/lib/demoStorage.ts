import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Profile, Snapshot } from '../types/models';

const DEMO_SESSION_KEY = '@atelier-logistique/demo-session';

interface DemoSessionPayload {
  currentUser: Profile;
  snapshot: Snapshot;
}

export async function loadDemoSession(): Promise<DemoSessionPayload | null> {
  try {
    const rawValue = await AsyncStorage.getItem(DEMO_SESSION_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as DemoSessionPayload;
    if (!parsedValue?.currentUser || !parsedValue?.snapshot) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export async function saveDemoSession(currentUser: Profile, snapshot: Snapshot): Promise<void> {
  const payload: DemoSessionPayload = {
    currentUser,
    snapshot,
  };

  await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(payload));
}

export async function clearDemoSession(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_SESSION_KEY);
}
