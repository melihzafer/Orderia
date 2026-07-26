import { BranchId, OrganizationId, toDomainId } from '../../../domain';
import { readSyncHintCursor, syncTopic } from '../realtimeSyncHint';

describe('realtime sync hints', () => {
  it('uses a tenant and branch scoped private topic', () => {
    expect(
      syncTopic({
        organizationId: toDomainId<OrganizationId>('23000000-0000-4000-8000-000000000001'),
        branchId: toDomainId<BranchId>('33000000-0000-4000-8000-000000000001'),
      }),
    ).toBe(
      'orderia:23000000-0000-4000-8000-000000000001:33000000-0000-4000-8000-000000000001:sync',
    );
  });

  it.each([
    [{ cursor: 42 }, '42'],
    [{ cursor: '9007199254740993' }, '9007199254740993'],
    [{ cursor: -1 }, null],
    [{ cursor: 1.5 }, null],
    [{ cursor: '01' }, null],
    [{ entity: { id: 'not-a-cursor' } }, null],
  ])('reads only a valid cursor from %j', (payload, expected) => {
    expect(readSyncHintCursor(payload)).toBe(expected);
  });
});
