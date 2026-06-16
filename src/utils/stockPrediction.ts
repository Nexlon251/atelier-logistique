import type { Part, StockMovement } from '../types';

export type StockPrediction = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  alertThreshold: number;
  averageDailyConsumption: number;
  daysRemaining: number | null;
  urgency: 'rupture' | 'critique' | 'attention' | 'stable';
  message: string;
};

const URGENCY_ORDER: Record<StockPrediction['urgency'], number> = {
  rupture: 0,
  critique: 1,
  attention: 2,
  stable: 3,
};

const URGENCY_MESSAGE: Record<StockPrediction['urgency'], string> = {
  rupture: 'Stock en rupture',
  critique: 'Approvisionnement urgent',
  attention: 'Rupture possible bientôt',
  stable: 'Stock confortable',
};

function calculateUrgency(
  quantity: number,
  alertThreshold: number,
  daysRemaining: number | null
): StockPrediction['urgency'] {
  if (quantity === 0) return 'rupture';
  if (daysRemaining !== null && daysRemaining <= 7) return 'critique';
  if (quantity <= alertThreshold || (daysRemaining !== null && daysRemaining <= 21)) {
    return 'attention';
  }
  return 'stable';
}

function sortByUrgencyAndDays(a: StockPrediction, b: StockPrediction) {
  const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
  if (urgencyDiff !== 0) return urgencyDiff;
  const aDays = a.daysRemaining ?? Number.MAX_VALUE;
  const bDays = b.daysRemaining ?? Number.MAX_VALUE;
  return aDays - bDays;
}

export function analyzePredictions(
  parts: Part[],
  movements: StockMovement[]
): StockPrediction[] {
  const windowDays = 30;
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(now.getDate() - windowDays);

  return parts
    .map((part) => {
      const totalConsumed = movements.reduce((sum, movement) => {
        if (movement.part_id !== part.id || movement.type !== 'out') {
          return sum;
        }

        const movedAt = new Date(movement.created_at);
        if (Number.isNaN(movedAt.getTime()) || movedAt < thresholdDate) {
          return sum;
        }

        return sum + movement.quantity;
      }, 0);

      const averageDailyConsumption = totalConsumed / windowDays;
      const daysRemaining = averageDailyConsumption > 0 ? part.quantity / averageDailyConsumption : null;
      const urgency = calculateUrgency(part.quantity, part.alert_threshold, daysRemaining);

      return {
        id: part.id,
        name: part.name,
        quantity: part.quantity,
        unit: part.unit,
        alertThreshold: part.alert_threshold,
        averageDailyConsumption,
        daysRemaining,
        urgency,
        message: URGENCY_MESSAGE[urgency],
      };
    })
    .sort(sortByUrgencyAndDays);
}

export function getTopUrgent(predictions: StockPrediction[], limit = 3) {
  return [...predictions].sort(sortByUrgencyAndDays).slice(0, limit);
}
