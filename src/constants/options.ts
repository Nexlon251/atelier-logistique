import type {
  DocumentStatus,
  DocumentType,
  StockMovementType,
  TaskFrequency,
  TaskPriority,
  TaskStatus,
} from '../types/models';

export const TASK_FREQUENCY_OPTIONS: TaskFrequency[] = [
  'ponctuelle',
  'hebdomadaire',
  'mensuelle',
];

export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['basse', 'moyenne', 'haute'];
export const TASK_STATUS_OPTIONS: TaskStatus[] = ['a_faire', 'en_cours', 'terminee'];

export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  'bon_livraison',
  'facture',
  'bon_commande',
  'fiche_intervention',
];

export const DOCUMENT_STATUS_OPTIONS: DocumentStatus[] = [
  'a_traiter',
  'classe',
  'archive',
];

export const MOVEMENT_TYPE_OPTIONS: StockMovementType[] = [
  'entree',
  'sortie',
  'ajustement',
];

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  ponctuelle: 'Ponctuelle',
  hebdomadaire: 'Hebdomadaire',
  mensuelle: 'Mensuelle',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: 'A faire',
  en_cours: 'En cours',
  terminee: 'Terminee',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  bon_livraison: 'Bon de livraison',
  facture: 'Facture',
  bon_commande: 'Bon de commande',
  fiche_intervention: "Fiche d'intervention",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  a_traiter: 'A traiter',
  classe: 'Classe',
  archive: 'Archive',
};

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  entree: 'Entree',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
};
