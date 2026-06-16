import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SectorType } from '../types';

const STORAGE_KEY = 'sector';

interface SectorContextValue {
  sector: SectorType;
  setSector: (value: SectorType) => Promise<void>;
}

const SectorContext = createContext<SectorContextValue | null>(null);

export function SectorProvider({ children }: { children: ReactNode }) {
  const [sector, setSectorState] = useState<SectorType>('generic');

  useEffect(() => {
    async function loadSector() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          stored === 'btp' ||
          stored === 'garage' ||
          stored === 'restauration' ||
          stored === 'transport' ||
          stored === 'industrie' ||
          stored === 'generic'
        ) {
          setSectorState(stored);
        }
      } catch {
        // ignore local storage failures
      }
    }
    loadSector();
  }, []);

  async function setSector(value: SectorType) {
    setSectorState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore write failures
    }
  }

  return (
    <SectorContext.Provider value={{ sector, setSector }}>
      {children}
    </SectorContext.Provider>
  );
}

export function useSector() {
  const context = useContext(SectorContext);
  if (!context) {
    throw new Error('useSector must be used within SectorProvider');
  }
  return context;
}
