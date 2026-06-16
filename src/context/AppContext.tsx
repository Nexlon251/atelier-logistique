import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { setUser as setSentryUser } from '../lib/sentry';
import { saveSnapshot, loadSnapshot, clearAllSnapshots } from '../cache/localCache';
import {
  DEMO_ORG,
  DEMO_MEMBERSHIP,
  DEMO_TASKS,
  DEMO_DOCUMENTS,
  DEMO_PARTS,
  DEMO_MOVEMENTS,
} from '../lib/demoData';
import * as taskRepo from '../repository/tasks';
import * as docRepo from '../repository/documents';
import * as stockRepo from '../repository/stock';
import * as alertsRepo from '../repository/alerts';
import * as orgRepo from '../repository/organizations';
import type {
  AppUser,
  Organization,
  Membership,
  Task,
  TaskInput,
  Document,
  DocumentInput,
  DocumentCategory,
  Part,
  PartInput,
  StockMovement,
  MovementType,
  ToastMessage,
  AppScreen,
  Role,
  AppAlert,
} from '../types';

// ─── Context shape ───────────────────────────────────────────────────────────

interface AppContextValue {
  // Navigation
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;

  // Auth
  user: AppUser | null;
  organization: Organization | null;
  membership: Membership | null;
  isDemo: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => Promise<void>;

  // Toast
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], message: string) => void;

  // Tasks
  tasks: Task[];
  loadingTasks: boolean;
  refreshTasks: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<void>;
  editTask: (id: string, updates: Partial<TaskInput>) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;

  // Documents
  documents: Document[];
  loadingDocuments: boolean;
  refreshDocuments: () => Promise<void>;
  addDocument: (
    input: DocumentInput,
    photo?: { uri: string; mimeType?: string },
  ) => Promise<void>;
  editDocument: (id: string, updates: Partial<DocumentInput>) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;

  // Stock
  parts: Part[];
  movements: StockMovement[];
  loadingStock: boolean;
  refreshStock: () => Promise<void>;
  addPart: (input: PartInput) => Promise<void>;
  editPart: (id: string, updates: Partial<PartInput>) => Promise<void>;
  archivePart: (id: string) => Promise<void>;
  recordMovement: (
    partId: string,
    type: MovementType,
    quantity: number,
    reason?: string,
  ) => Promise<void>;

  // Alerts
  alerts: AppAlert[];
  loadingAlerts: boolean;
  refreshAlerts: () => Promise<void>;
  markAlertRead: (id: string) => Promise<void>;

  // Org admin
  refreshOrganization: () => Promise<void>;
  initOrganization: (org: Organization, mem: Membership) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Demo state helpers ───────────────────────────────────────────────────────

const DEMO_KEY = 'al_demo_state_v1';

async function loadDemoPersistedData() {
  try {
    const raw = await AsyncStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveDemoPersistedData(data: {
  tasks: Task[];
  documents: Document[];
  parts: Part[];
  movements: StockMovement[];
}) {
  try {
    await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(data));
  } catch { /* no-op */ }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [user, setUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = String(Date.now());
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        // Check demo mode
        const demoActive = await AsyncStorage.getItem('al_demo_mode');
        if (demoActive === 'true') {
          await bootstrapDemo();
          return;
        }

        if (!isSupabaseConfigured) {
          // No Supabase AND no demo → show login with demo option
          setIsLoading(false);
          return;
        }

        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const u: AppUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: session.user.user_metadata?.full_name,
        };
        setUser(u);
        setSentryUser(u);

        const result = await orgRepo.fetchUserOrganization(u.id);
        if (result) {
          setOrganization(result.organization);
          setMembership(result.membership);
          setScreen('home');
          await loadAllData(result.organization.id);
        } else {
          setScreen('onboarding');
        }
      } catch (err) {
        console.error('[boot]', err);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrapDemo() {
    setIsDemo(true);
    setUser({ id: 'demo-user-001', email: 'demo@atelierlogistique.fr', full_name: 'Mode Démo' });
    setOrganization(DEMO_ORG);
    setMembership(DEMO_MEMBERSHIP);

    const persisted = await loadDemoPersistedData();
    if (persisted) {
      setTasks(persisted.tasks ?? DEMO_TASKS);
      setDocuments(persisted.documents ?? DEMO_DOCUMENTS);
      setParts(persisted.parts ?? DEMO_PARTS);
      setMovements(persisted.movements ?? DEMO_MOVEMENTS);
    } else {
      setTasks(DEMO_TASKS);
      setDocuments(DEMO_DOCUMENTS);
      setParts(DEMO_PARTS);
      setMovements(DEMO_MOVEMENTS);
    }
    setScreen('home');
    setIsLoading(false);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase non configuré.');
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Connexion échouée');

    // Attendre que la session soit persistée (important sur Android)
    await new Promise(resolve => setTimeout(resolve, 300));

    const u: AppUser = {
      id: data.user.id,
      email: data.user.email ?? '',
      full_name: data.user.user_metadata?.full_name,
    };
    setUser(u);
    setSentryUser(u);

    const result = await orgRepo.fetchUserOrganization(u.id);
    if (result) {
      setOrganization(result.organization);
      setMembership(result.membership);
      setScreen('home');
      await loadAllData(result.organization.id);
    } else {
      setScreen('onboarding');
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase non configuré.');
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Inscription échouée');

    // Attendre que la session soit bien établie (important sur Android)
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session && data.session) {
      await sb.auth.setSession(data.session);
    }

    const u: AppUser = {
      id: data.user.id,
      email: data.user.email ?? '',
      full_name: fullName,
    };
    setUser(u);
    setScreen('onboarding');
  }

  async function signOut() {
    await AsyncStorage.removeItem('al_demo_mode');
    await clearAllSnapshots();
    if (!isDemo && isSupabaseConfigured) {
      await getSupabase().auth.signOut();
    }
    setUser(null);
    setOrganization(null);
    setMembership(null);
    setIsDemo(false);
    setTasks([]);
    setDocuments([]);
    setParts([]);
    setMovements([]);
    setScreen('login');
    setSentryUser(null);
  }

  async function enterDemoMode() {
    await AsyncStorage.setItem('al_demo_mode', 'true');
    setIsLoading(true);
    await bootstrapDemo();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadAllData(orgId: string) {
    // Try cache first
    const cached = await loadSnapshot(orgId);
    if (cached) {
      setTasks(cached.tasks);
      setDocuments(cached.documents);
      setParts(cached.parts);
      setMovements(cached.movements);
    }
    // Always refresh from network
    await Promise.all([
      refreshTasksFor(orgId),
      refreshDocumentsFor(orgId),
      refreshStockFor(orgId),
      refreshAlertsFor(orgId),
    ]);
  }

  async function refreshTasksFor(orgId: string) {
    setLoadingTasks(true);
    try {
      const data = await taskRepo.fetchTasks(orgId);
      setTasks(data);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function refreshDocumentsFor(orgId: string) {
    setLoadingDocuments(true);
    try {
      const data = await docRepo.fetchDocuments(orgId);
      setDocuments(data);
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function refreshStockFor(orgId: string) {
    setLoadingStock(true);
    try {
      const [p, m] = await Promise.all([
        stockRepo.fetchParts(orgId),
        stockRepo.fetchMovements(orgId),
      ]);
      setParts(p);
      setMovements(m);
    } finally {
      setLoadingStock(false);
    }
  }

  async function refreshAlertsFor(orgId: string) {
    setLoadingAlerts(true);
    try {
      const data = await alertsRepo.fetchAlerts(orgId);
      setAlerts(data);
    } finally {
      setLoadingAlerts(false);
    }
  }

  // Persist cache after data changes
  useEffect(() => {
    if (!organization || isDemo) return;
    saveSnapshot(organization.id, {
      tasks,
      documents,
      parts,
      movements,
      fetchedAt: new Date().toISOString(),
    });
  }, [tasks, documents, parts, movements, organization, isDemo]);

  // Persist demo state
  useEffect(() => {
    if (!isDemo) return;
    saveDemoPersistedData({ tasks, documents, parts, movements });
  }, [tasks, documents, parts, movements, isDemo]);

  useEffect(() => {
    if (!organization || isDemo) return;
    const sb = getSupabase();
    refreshAlertsFor(organization.id);

    const channel = sb.channel(`alerts:${organization.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `organization_id=eq.${organization.id}` }, (payload) => {
        setAlerts((prev) => [payload.new as AppAlert, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts', filter: `organization_id=eq.${organization.id}` }, (payload) => {
        setAlerts((prev) => prev.map((alert) => (alert.id === (payload.new as AppAlert).id ? (payload.new as AppAlert) : alert)));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      sb.removeChannel(channel);
    };
  }, [organization, isDemo, refreshAlertsFor]);

  // ── Public refresh functions ──────────────────────────────────────────────

  const refreshTasks = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshTasksFor(organization.id);
  }, [isDemo, organization]);

  const refreshDocuments = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshDocumentsFor(organization.id);
  }, [isDemo, organization]);

  const refreshStock = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshStockFor(organization.id);
  }, [isDemo, organization]);

  const refreshOrganization = useCallback(async () => {
    if (isDemo || !organization) return;
    try {
      const updated = await orgRepo.refreshBillingStatus(organization.id);
      setOrganization(updated);
    } catch (err) {
      console.error('[refreshOrg]', err);
    }
  }, [isDemo, organization]);

  const refreshAlerts = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshAlertsFor(organization.id);
  }, [isDemo, organization]);

  const markAlertRead = useCallback(async (id: string) => {
    if (isDemo) {
      setAlerts((prev) => prev.map((alert) =>
        alert.id === id ? { ...alert, read_at: new Date().toISOString() } : alert,
      ));
      return;
    }
    const updated = await alertsRepo.markAlertRead(id);
    setAlerts((prev) => prev.map((alert) => (alert.id === updated.id ? updated : alert)));
  }, [isDemo]);

  // ── Task mutations ────────────────────────────────────────────────────────

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const addTask = useCallback(async (input: TaskInput) => {
    if (isDemo) {
      const now = new Date().toISOString();
      const t: Task = {
        ...input,
        id: uuid(),
        organization_id: 'demo-org-001',
        archived_at: null,
        created_at: now,
        updated_at: now,
      };
      setTasks((prev) => [t, ...prev]);
      showToast('success', 'Tâche créée');
      return;
    }
    if (!organization) throw new Error('Pas d\'organisation');
    const t = await taskRepo.createTask(organization.id, input);
    setTasks((prev) => [t, ...prev]);
    showToast('success', 'Tâche créée');
  }, [isDemo, organization, showToast]);

  const editTask = useCallback(async (id: string, updates: Partial<TaskInput>) => {
    if (isDemo) {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: now } : t)),
      );
      showToast('success', 'Tâche modifiée');
      return;
    }
    const updated = await taskRepo.updateTask(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast('success', 'Tâche modifiée');
  }, [isDemo, showToast]);

  const archiveTask = useCallback(async (id: string) => {
    if (isDemo) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast('info', 'Tâche archivée');
      return;
    }
    await taskRepo.archiveTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('info', 'Tâche archivée');
  }, [isDemo, showToast]);

  // ── Document mutations ────────────────────────────────────────────────────

  const addDocument = useCallback(
    async (input: DocumentInput, photo?: { uri: string; mimeType?: string }) => {
      if (isDemo) {
        const now = new Date().toISOString();
        const d: Document = {
          ...input,
          id: uuid(),
          organization_id: 'demo-org-001',
          photo_url: photo?.uri,
          archived_at: null,
          created_at: now,
          updated_at: now,
        };
        setDocuments((prev) => [d, ...prev]);
        showToast('success', 'Document ajouté');
        return;
      }
      if (!organization) throw new Error('Pas d\'organisation');
      const d = await docRepo.createDocument(organization.id, input, photo);
      setDocuments((prev) => [d, ...prev]);
      showToast('success', 'Document ajouté');
    },
    [isDemo, organization, showToast],
  );

  const editDocument = useCallback(async (id: string, updates: Partial<DocumentInput>) => {
    if (isDemo) {
      const now = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates, updated_at: now } : d)),
      );
      showToast('success', 'Document modifié');
      return;
    }
    const updated = await docRepo.updateDocument(id, updates);
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    showToast('success', 'Document modifié');
  }, [isDemo, showToast]);

  const archiveDocument = useCallback(async (id: string) => {
    if (isDemo) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      showToast('info', 'Document archivé');
      return;
    }
    await docRepo.archiveDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast('info', 'Document archivé');
  }, [isDemo, showToast]);

  // ── Stock mutations ───────────────────────────────────────────────────────

  const addPart = useCallback(async (input: PartInput) => {
    if (isDemo) {
      const now = new Date().toISOString();
      const p: Part = {
        ...input,
        id: uuid(),
        organization_id: 'demo-org-001',
        archived_at: null,
        created_at: now,
        updated_at: now,
      };
      setParts((prev) => [...prev, p]);
      showToast('success', 'Pièce ajoutée');
      return;
    }
    if (!organization) throw new Error('Pas d\'organisation');
    const p = await stockRepo.createPart(organization.id, input);
    setParts((prev) => [...prev, p]);
    showToast('success', 'Pièce ajoutée');
  }, [isDemo, organization, showToast]);

  const editPart = useCallback(async (id: string, updates: Partial<PartInput>) => {
    if (isDemo) {
      const now = new Date().toISOString();
      setParts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p)),
      );
      showToast('success', 'Pièce modifiée');
      return;
    }
    const updated = await stockRepo.updatePart(id, updates);
    setParts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    showToast('success', 'Pièce modifiée');
  }, [isDemo, showToast]);

  const archivePart = useCallback(async (id: string) => {
    if (isDemo) {
      setParts((prev) => prev.filter((p) => p.id !== id));
      showToast('info', 'Pièce archivée');
      return;
    }
    await stockRepo.archivePart(id);
    setParts((prev) => prev.filter((p) => p.id !== id));
    showToast('info', 'Pièce archivée');
  }, [isDemo, showToast]);

  const recordMovement = useCallback(
    async (partId: string, type: MovementType, quantity: number, reason?: string) => {
      if (isDemo) {
        const now = new Date().toISOString();
        const mov: StockMovement = {
          id: uuid(),
          organization_id: 'demo-org-001',
          part_id: partId,
          type,
          quantity,
          reason,
          created_at: now,
        };
        setParts((prev) =>
          prev.map((p) => {
            if (p.id !== partId) return p;
            const newQty =
              type === 'in'
                ? p.quantity + quantity
                : type === 'out'
                ? Math.max(0, p.quantity - quantity)
                : quantity;
            return { ...p, quantity: newQty, updated_at: now };
          }),
        );
        setMovements((prev) => [mov, ...prev]);
        showToast('success', type === 'in' ? 'Entrée enregistrée' : type === 'out' ? 'Sortie enregistrée' : 'Ajustement enregistré');
        return;
      }
      if (!organization || !user) throw new Error('Pas d\'organisation');
      const { part, movement } = await stockRepo.recordMovement(
        organization.id,
        partId,
        type,
        quantity,
        reason,
        user.id,
      );
      setParts((prev) => prev.map((p) => (p.id === partId ? part : p)));
      setMovements((prev) => [movement, ...prev]);
      showToast('success', type === 'in' ? 'Entrée enregistrée' : type === 'out' ? 'Sortie enregistrée' : 'Ajustement enregistré');
    },
    [isDemo, organization, user, showToast],
  );

  // ─────────────────────────────────────────────────────────────────────────

  // Called by OnboardingScreen after org creation
  const initOrganization = useCallback(async (org: Organization, mem: Membership) => {
    setOrganization(org);
    setMembership(mem);
    await loadAllData(org.id);
  }, []);

  const value: AppContextValue = {
    screen,
    setScreen,
    user,
    organization,
    membership,
    isDemo,
    isLoading,
    signIn,
    signUp,
    signOut,
    enterDemoMode,
    toasts,
    showToast,
    tasks,
    loadingTasks,
    refreshTasks,
    addTask,
    editTask,
    archiveTask,
    documents,
    loadingDocuments,
    refreshDocuments,
    addDocument,
    editDocument,
    archiveDocument,
    parts,
    movements,
    loadingStock,
    refreshStock,
    addPart,
    editPart,
    archivePart,
    recordMovement,
    alerts,
    loadingAlerts,
    refreshAlerts,
    markAlertRead,
    refreshOrganization,
    initOrganization,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
