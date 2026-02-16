import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSubscriptionStatusCounts } from './subscriptions.status-preview.js';

describe('buildSubscriptionStatusCounts', () => {
  it('returns zeroed counts for empty input', () => {
    const counts = buildSubscriptionStatusCounts([]);

    assert.deepEqual(counts, {
      DRAFT: 0,
      ACTIVE: 0,
      PAUSED: 0,
      CANCELED: 0
    });
  });

  it('aggregates all statuses', () => {
    const counts = buildSubscriptionStatusCounts([
      { status: 'DRAFT' },
      { status: 'ACTIVE' },
      { status: 'ACTIVE' },
      { status: 'PAUSED' },
      { status: 'CANCELED' }
    ]);

    assert.deepEqual(counts, {
      DRAFT: 1,
      ACTIVE: 2,
      PAUSED: 1,
      CANCELED: 1
    });
  });
});
