export type SectorType =
  | 'btp'
  | 'garage'
  | 'restauration'
  | 'transport'
  | 'industrie'
  | 'generic';

export interface SectorConfig {
  id: SectorType;
  label: string;
  icon: string;
  modules: string[];
}

export const SECTORS: SectorConfig[] = [
  {
    id: 'btp',
    label: 'BTP',
    icon: '🏗️',
    modules: ['Chantiers', 'Planning', 'Budget'],
  },
  {
    id: 'garage',
    label: 'Garage',
    icon: '🚗',
    modules: ['Véhicules', 'Interventions', 'Pièces'],
  },
  {
    id: 'restauration',
    label: 'Restauration',
    icon: '🍽️',
    modules: ['Ingrédients', 'HACCP', 'Stock'],
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: '🚚',
    modules: ['Tournées', 'Arrêts', 'Statistiques'],
  },
  {
    id: 'industrie',
    label: 'Industrie',
    icon: '⚙️',
    modules: ['Machines', 'Maintenance', 'KPIs'],
  },
  {
    id: 'generic',
    label: 'Autre',
    icon: '🧩',
    modules: ['Stock', 'Tâches', 'Documents', 'Assistant'],
  },
];
