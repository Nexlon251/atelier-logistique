import { describe, expect, it } from 'vitest';

import { createDemoSession, createMockSeed } from '../src/data/mockData';
import { isValidDateInput, toInputDate, toTaskDueDateIso } from '../src/utils/format';

describe('date formatting helpers', () => {
  it('accepts valid calendar dates and rejects impossible ones', () => {
    expect(isValidDateInput('2026-04-21')).toBe(true);
    expect(isValidDateInput('2026-02-30')).toBe(false);
    expect(isValidDateInput('21/04/2026')).toBe(false);
  });

  it('keeps the input date stable when converted to ISO', () => {
    expect(toTaskDueDateIso('2026-04-21')).toBe('2026-04-21T00:00:00.000Z');
  });

  it('returns a stable input date even when the source contains a timezone offset', () => {
    expect(toInputDate('2026-04-21T23:00:00.000-10:00')).toBe('2026-04-22');
  });
});

describe('demo session helpers', () => {
  it('injects the demo user inside the snapshot profiles', () => {
    const session = createDemoSession('chef.atelier@garage.fr', createMockSeed());

    expect(session.currentUser.id).toBe('usr-demo');
    expect(session.snapshot.profiles.some((profile) => profile.id === 'usr-demo')).toBe(true);
  });
});
