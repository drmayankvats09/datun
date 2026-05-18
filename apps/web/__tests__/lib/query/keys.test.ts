// apps/web/__tests__/lib/query/keys.test.ts
// ═══════════════════════════════════════════════════════════════
// Query Key Factory — Unit Tests
// Task #47 Phase 3
//
// Validates that the hierarchical key shape is stable. A regression
// here (typo, prefix change, signature change) would cause ghost
// cache entries that never invalidate — silent UX bugs.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query/keys';

describe('queryKeys — auth', () => {
  it('all root', () => {
    expect(queryKeys.auth.all).toEqual(['auth']);
  });
  it('me extends all', () => {
    expect(queryKeys.auth.me()).toEqual(['auth', 'me']);
  });
});

describe('queryKeys — consultations', () => {
  it('all root', () => {
    expect(queryKeys.consultations.all).toEqual(['consultations']);
  });

  it('lists() = [...all, "list"]', () => {
    expect(queryKeys.consultations.lists()).toEqual(['consultations', 'list']);
  });

  it('list(filters) extends lists()', () => {
    const filters = { status: 'COMPLETED' as const };
    expect(queryKeys.consultations.list(filters)).toEqual(['consultations', 'list', filters]);
  });

  it('details() = [...all, "detail"]', () => {
    expect(queryKeys.consultations.details()).toEqual(['consultations', 'detail']);
  });

  it('detail(id) extends details()', () => {
    expect(queryKeys.consultations.detail('abc123')).toEqual(['consultations', 'detail', 'abc123']);
  });

  it('pdf(id) is scoped under consultations.all', () => {
    expect(queryKeys.consultations.pdf('abc123')).toEqual(['consultations', 'pdf', 'abc123']);
  });

  it('infinite(filters) differs from list(filters)', () => {
    const filters = { status: 'COMPLETED' as const };
    expect(queryKeys.consultations.infinite(filters)).not.toEqual(
      queryKeys.consultations.list(filters),
    );
  });
});

describe('queryKeys — hierarchy & invalidation semantics', () => {
  it('detail key starts with details() prefix → broad invalidation works', () => {
    const detail = queryKeys.consultations.detail('xyz');
    const prefix = queryKeys.consultations.details();
    expect(detail.slice(0, prefix.length)).toEqual(prefix);
  });

  it('every per-domain key starts with that domain.all', () => {
    expect(queryKeys.consultations.list({}).slice(0, 1)).toEqual(queryKeys.consultations.all);
    expect(queryKeys.clinics.detail('x').slice(0, 1)).toEqual(queryKeys.clinics.all);
    expect(queryKeys.appointments.detail('y').slice(0, 1)).toEqual(queryKeys.appointments.all);
    expect(queryKeys.notifications.unreadCount().slice(0, 1)).toEqual(queryKeys.notifications.all);
    expect(queryKeys.media.asset('m').slice(0, 1)).toEqual(queryKeys.media.all);
  });
});

describe('queryKeys — labeling (Task #44 surface)', () => {
  it('queue includes strategy + limit for distinct caches', () => {
    expect(queryKeys.labeling.queue('typi_clust', 10)).toEqual([
      'labeling',
      'queue',
      'typi_clust',
      10,
    ]);
    expect(queryKeys.labeling.queue('margin', 10)).not.toEqual(
      queryKeys.labeling.queue('typi_clust', 10),
    );
  });

  it('stats key is constant', () => {
    expect(queryKeys.labeling.stats()).toEqual(['labeling', 'stats']);
  });
});

describe('queryKeys — flags userId is part of the key', () => {
  it('anonymous (null) and authenticated keys differ', () => {
    expect(queryKeys.flags.list(null)).not.toEqual(queryKeys.flags.list('user-1'));
  });
});
