import { BranchId, DeviceId, MutationId, OrganizationId, toDomainId } from '../../../domain';
import { OutboxMutation } from '../../contracts';
import { SupabaseMutationPushGateway } from '../mutationPushGateway';

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const deviceId = toDomainId<DeviceId>('device-1');
const mutationId = toDomainId<MutationId>('mutation-1');
const createdAt = '2026-07-26T18:00:00.000Z';

describe('SupabaseMutationPushGateway collaboration routes', () => {
  it('routes append commands through the concurrent order RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        status: 'applied',
        repository: 'orderBatches',
        entityId: 'batch-1',
        serverVersion: 1,
        committedAt: createdAt,
      },
      error: null,
    });
    const gateway = new SupabaseMutationPushGateway({ rpc } as never);

    await expect(gateway.push(mutation('orderBatches', 'batch-1', {}))).resolves.toMatchObject({
      entityId: 'batch-1',
      repository: 'orderBatches',
    });
    expect(rpc).toHaveBeenCalledWith(
      'apply_concurrent_order_batch',
      expect.objectContaining({
        requested_client_mutation_id: mutationId,
        requested_entity_id: 'batch-1',
      }),
    );
  });

  it('preserves structured stale-note details for the conflict store', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'version_conflict',
        details: JSON.stringify({
          serverVersion: 4,
          serverPayload: {
            id: 'item-1',
            note: 'Cloud note',
            version: 4,
          },
        }),
      },
    });
    const gateway = new SupabaseMutationPushGateway({ rpc } as never);

    await expect(
      gateway.push(mutation('orderItems', 'item-1', { note: 'Local note' }, 3)),
    ).rejects.toMatchObject({
      message: 'version_conflict',
      details: {
        code: 'P0001',
        serverVersion: 4,
        serverPayload: {
          id: 'item-1',
          note: 'Cloud note',
          version: 4,
        },
      },
    });
    expect(rpc).toHaveBeenCalledWith(
      'apply_order_item_note_command',
      expect.objectContaining({
        requested_base_version: 3,
        requested_entity_id: 'item-1',
      }),
    );
  });
});

function mutation(
  repository: 'orderBatches' | 'orderItems',
  entityId: string,
  payload: OutboxMutation['payload'],
  baseVersion?: number,
): OutboxMutation {
  return {
    id: mutationId,
    organizationId,
    branchId,
    deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${deviceId}:${mutationId}`,
    repository,
    entityId,
    operation: 'command',
    payload,
    ...(baseVersion === undefined ? {} : { baseVersion }),
    status: 'pending',
    attemptCount: 0,
    createdAt,
  };
}
