export type UserRole = 'admin' | 'employe';
export type AppMode = 'demo' | 'supabase';

export type TaskFrequency = 'ponctuelle' | 'hebdomadaire' | 'mensuelle';
export type TaskPriority = 'basse' | 'moyenne' | 'haute';
export type TaskStatus = 'a_faire' | 'en_cours' | 'terminee';
export type TaskWindow = 'semaine' | 'mois';

export type DocumentType =
  | 'bon_livraison'
  | 'facture'
  | 'bon_commande'
  | 'fiche_intervention';
export type DocumentStatus = 'a_traiter' | 'classe' | 'archive';

export type StockMovementType = 'entree' | 'sortie' | 'ajustement';

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  frequency: TaskFrequency;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  documentType: DocumentType;
  reference: string;
  status: DocumentStatus;
  imageUri?: string;
  linkedTaskId?: string | null;
  linkedPartId?: string | null;
  capturedBy: string;
  capturedAt: string;
}

export interface Part {
  id: string;
  name: string;
  internalReference: string;
  category: string;
  location: string;
  quantity: number;
  minimumThreshold: number;
  unit: string;
}

export interface StockMovement {
  id: string;
  partId: string;
  movementType: StockMovementType;
  quantity: number;
  note: string;
  authorId: string;
  movedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  dueDate: string;
  frequency: TaskFrequency;
  priority: TaskPriority;
  assignedTo: string;
}

export interface CreateDocumentInput {
  documentType: DocumentType;
  reference: string;
  status: DocumentStatus;
  linkedTaskId?: string | null;
  linkedPartId?: string | null;
  imageUri?: string;
}

export interface CreatePartInput {
  name: string;
  internalReference: string;
  category: string;
  location: string;
  quantity: number;
  minimumThreshold: number;
  unit: string;
}

export interface CreateStockMovementInput {
  partId: string;
  movementType: StockMovementType;
  quantity: number;
  note: string;
}

export interface Snapshot {
  profiles: Profile[];
  tasks: Task[];
  documents: DocumentRecord[];
  parts: Part[];
  movements: StockMovement[];
}
