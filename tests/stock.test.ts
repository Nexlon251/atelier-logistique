import { describe, expect, it } from 'vitest';

import type { Part } from '../src/types/models';
import {
  applyMovementToPart,
  computeNextQuantity,
  getLowStockParts,
  getStockMovementError,
  hasDuplicatePartReference,
} from '../src/utils/stock';

const basePart: Part = {
  id: 'prt-test',
  name: 'Filtre',
  internalReference: 'F-100',
  category: 'Consommables',
  location: 'A1',
  quantity: 5,
  minimumThreshold: 3,
  unit: 'pcs',
};

describe('stock helpers', () => {
  it('subtracts quantities for stock outputs without going below zero', () => {
    expect(computeNextQuantity(5, 'sortie', 2)).toBe(3);
    expect(computeNextQuantity(1, 'sortie', 9)).toBe(0);
  });

  it('uses the adjustment quantity as the counted reality', () => {
    const adjusted = applyMovementToPart(basePart, 'ajustement', 11);
    expect(adjusted.quantity).toBe(11);
  });

  it('returns parts at or below their threshold', () => {
    const parts = [
      basePart,
      { ...basePart, id: '2', quantity: 2 },
      { ...basePart, id: '3', quantity: 3 },
    ];

    expect(getLowStockParts(parts).map((part) => part.id)).toEqual(['2', '3']);
  });

  it('rejects a stock output greater than the available quantity', () => {
    expect(getStockMovementError(basePart, 'sortie', 6)).toBe(
      'La sortie depasse le stock disponible (5 pcs).'
    );
  });

  it('accepts a valid stock movement and detects duplicate references', () => {
    expect(getStockMovementError(basePart, 'entree', 4)).toBeNull();
    expect(
      hasDuplicatePartReference([{ ...basePart, internalReference: ' fo-208 ' }], 'FO-208')
    ).toBe(true);
  });
});
