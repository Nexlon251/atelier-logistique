import { describe, expect, it } from 'vitest';

import type { Part } from '../src/types/models';
import type { Part as AppPart, StockMovement } from '../src/types';
import {
  applyMovementToPart,
  computeNextQuantity,
  getLowStockParts,
  getStockMovementError,
  hasDuplicatePartReference,
} from '../src/utils/stock';
import { analyzePredictions, getTopUrgent } from '../src/utils/stockPrediction';

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

describe('stock prediction helpers', () => {
  const parts: AppPart[] = [
    {
      id: 'p1',
      organization_id: 'org-1',
      name: 'Vis M6',
      quantity: 10,
      alert_threshold: 3,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'p2',
      organization_id: 'org-1',
      name: 'Boulon',
      quantity: 2,
      alert_threshold: 5,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'p3',
      organization_id: 'org-1',
      name: 'Joint',
      quantity: 0,
      alert_threshold: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'p4',
      organization_id: 'org-1',
      name: 'Plaquette',
      quantity: 6,
      alert_threshold: 4,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const movements: StockMovement[] = [
    {
      id: 'm1',
      organization_id: 'org-1',
      part_id: 'p1',
      type: 'out',
      quantity: 5,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'm2',
      organization_id: 'org-1',
      part_id: 'p2',
      type: 'out',
      quantity: 3,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'm3',
      organization_id: 'org-1',
      part_id: 'p4',
      type: 'out',
      quantity: 30,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  it('computes urgency categories and sorts the most urgent parts first', () => {
    const predictions = analyzePredictions(parts, movements);

    expect(predictions[0].id).toBe('p3');
    expect(predictions[0].urgency).toBe('rupture');
    expect(predictions[1].id).toBe('p4');
    expect(predictions[1].urgency).toBe('critique');
    expect(predictions[2].id).toBe('p2');
    expect(predictions[2].urgency).toBe('attention');
    expect(predictions[3].urgency).toBe('stable');
  });

  it('returns only the top 3 urgent predictions', () => {
    const urgent = getTopUrgent(analyzePredictions(parts, movements));
    expect(urgent).toHaveLength(3);
    expect(urgent.map((item) => item.id)).toEqual(['p3', 'p4', 'p2']);
  });
});
