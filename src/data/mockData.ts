import type { Profile, Snapshot } from '../types/models';
import { humanizeEmail } from '../utils/format';

function addDays(days: number): string {
  const base = new Date();
  base.setHours(10, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDemoProfile(email?: string): Profile {
  return {
    id: 'usr-demo',
    fullName: email ? humanizeEmail(email) : 'Mode Demo',
    email: email ?? 'demo@atelier.local',
    role: 'admin',
  };
}

export function createDemoSession(
  email?: string,
  snapshot: Snapshot = createMockSeed()
): { currentUser: Profile; snapshot: Snapshot } {
  const currentUser = createDemoProfile(email);
  const profiles = snapshot.profiles.some((profile) => profile.id === currentUser.id)
    ? snapshot.profiles.map((profile) => (profile.id === currentUser.id ? currentUser : profile))
    : [currentUser, ...snapshot.profiles];

  return {
    currentUser,
    snapshot: {
      ...snapshot,
      profiles,
    },
  };
}

export function createMockSeed(): Snapshot {
  return {
    profiles: [
      {
        id: 'usr-admin',
        fullName: 'Nora Atelier',
        email: 'nora@atelier.fr',
        role: 'admin',
      },
      {
        id: 'usr-pieces',
        fullName: 'Leo Pieces',
        email: 'leo@atelier.fr',
        role: 'employe',
      },
      {
        id: 'usr-planning',
        fullName: 'Sofia Planning',
        email: 'sofia@atelier.fr',
        role: 'employe',
      },
    ],
    tasks: [
      {
        id: 'tsk-001',
        title: 'Verifier les bordereaux de livraison',
        description: 'Classer les documents recus ce matin et confirmer la reception atelier.',
        dueDate: addDays(-1),
        frequency: 'hebdomadaire',
        priority: 'haute',
        status: 'en_cours',
        assignedTo: 'usr-planning',
        createdAt: addDays(-7),
      },
      {
        id: 'tsk-002',
        title: 'Inventaire consommables atelier',
        description: 'Compter filtres, joints et etiquettes pour la semaine.',
        dueDate: addDays(2),
        frequency: 'hebdomadaire',
        priority: 'moyenne',
        status: 'a_faire',
        assignedTo: 'usr-pieces',
        createdAt: addDays(-2),
      },
      {
        id: 'tsk-003',
        title: 'Cloture mensuelle documents fournisseurs',
        description: 'Verifier les factures et bons de commande du mois.',
        dueDate: addDays(11),
        frequency: 'mensuelle',
        priority: 'haute',
        status: 'a_faire',
        assignedTo: 'usr-admin',
        createdAt: addDays(-4),
      },
      {
        id: 'tsk-004',
        title: 'Archiver les fiches d intervention terminees',
        description: 'Passer les dossiers papier en statut archive apres signature.',
        dueDate: addDays(21),
        frequency: 'ponctuelle',
        priority: 'basse',
        status: 'terminee',
        assignedTo: 'usr-planning',
        createdAt: addDays(-10),
      },
    ],
    documents: [
      {
        id: 'doc-001',
        documentType: 'bon_livraison',
        reference: 'BL-2404-081',
        status: 'a_traiter',
        linkedTaskId: 'tsk-001',
        linkedPartId: 'prt-001',
        capturedBy: 'usr-planning',
        capturedAt: addDays(-1),
      },
      {
        id: 'doc-002',
        documentType: 'facture',
        reference: 'FAC-2026-042',
        status: 'classe',
        linkedTaskId: 'tsk-003',
        linkedPartId: null,
        capturedBy: 'usr-admin',
        capturedAt: addDays(-3),
      },
      {
        id: 'doc-003',
        documentType: 'fiche_intervention',
        reference: 'INT-884',
        status: 'archive',
        linkedTaskId: null,
        linkedPartId: 'prt-003',
        capturedBy: 'usr-planning',
        capturedAt: addDays(-8),
      },
    ],
    parts: [
      {
        id: 'prt-001',
        name: 'Filtre a huile',
        internalReference: 'FO-208',
        category: 'Consommables',
        location: 'Rayon A1',
        quantity: 3,
        minimumThreshold: 5,
        unit: 'pcs',
      },
      {
        id: 'prt-002',
        name: 'Plaquettes avant',
        internalReference: 'PLA-AV-15',
        category: 'Freinage',
        location: 'Rayon B2',
        quantity: 12,
        minimumThreshold: 4,
        unit: 'sets',
      },
      {
        id: 'prt-003',
        name: 'Ampoule H7',
        internalReference: 'AMP-H7',
        category: 'Electricite',
        location: 'Rayon C4',
        quantity: 6,
        minimumThreshold: 6,
        unit: 'pcs',
      },
      {
        id: 'prt-004',
        name: 'Joint cuivre 12 mm',
        internalReference: 'JCU-12',
        category: 'Joints',
        location: 'Bac service rapide',
        quantity: 18,
        minimumThreshold: 8,
        unit: 'pcs',
      },
    ],
    movements: [
      {
        id: 'mov-001',
        partId: 'prt-001',
        movementType: 'sortie',
        quantity: 2,
        note: 'Revision client matin',
        authorId: 'usr-pieces',
        movedAt: addDays(-1),
      },
      {
        id: 'mov-002',
        partId: 'prt-002',
        movementType: 'entree',
        quantity: 6,
        note: 'Reception fournisseur',
        authorId: 'usr-admin',
        movedAt: addDays(-2),
      },
      {
        id: 'mov-003',
        partId: 'prt-003',
        movementType: 'ajustement',
        quantity: 6,
        note: 'Comptage reel magasin',
        authorId: 'usr-pieces',
        movedAt: addDays(-4),
      },
    ],
  };
}
