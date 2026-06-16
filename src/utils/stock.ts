import type { Part, StockMovementType } from '../types/models';

export function computeNextQuantity(
  currentQuantity: number,
  movementType: StockMovementType,
  quantity: number
): number {
  if (movementType === 'entree') {
    return currentQuantity + quantity;
  }

  if (movementType === 'sortie') {
    return Math.max(0, currentQuantity - quantity);
  }

  return Math.max(0, quantity);
}

export function applyMovementToPart(
  part: Part,
  movementType: StockMovementType,
  quantity: number
): Part {
  return {
    ...part,
    quantity: computeNextQuantity(part.quantity, movementType, quantity),
  };
}

export function getLowStockParts(parts: Part[]): Part[] {
  return parts.filter((part) => part.quantity <= part.minimumThreshold);
}

export function normalizePartReference(value: string): string {
  return value.trim().toUpperCase();
}

export function hasDuplicatePartReference(parts: Part[], internalReference: string): boolean {
  const nextReference = normalizePartReference(internalReference);
  return parts.some((part) => normalizePartReference(part.internalReference) === nextReference);
}

export function getStockMovementError(
  part: Part | undefined,
  movementType: StockMovementType,
  quantity: number
): string | null {
  if (!part) {
    return "La piece selectionnee est introuvable.";
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 'La quantite doit etre un entier strictement positif.';
  }

  if (movementType === 'sortie' && quantity > part.quantity) {
    return `La sortie depasse le stock disponible (${part.quantity} ${part.unit}).`;
  }

  return null;
}
