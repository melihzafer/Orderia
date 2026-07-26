import { SupabaseTableOperationGateway } from '../tableOperationGateway';

describe('SupabaseTableOperationGateway', () => {
  it('returns the canonical target after a merge', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        status: 'applied',
        mode: 'merged',
        sourceTableId: 'table-1',
        targetTableId: 'table-2',
        sourceSessionId: 'session-1',
        canonicalSessionId: 'session-2',
        canonicalSessionVersion: 4,
        movedCheckCount: 2,
      },
      error: null,
    });
    const gateway = new SupabaseTableOperationGateway({ rpc } as never);

    await expect(
      gateway.transferOrMerge({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        deviceId: 'device-1' as never,
        clientMutationId: 'mutation-1' as never,
        command: {
          sourceSessionId: 'session-1' as never,
          targetTableId: 'table-2' as never,
          expectedSourceVersion: 2,
          expectedTargetVersion: 3,
        },
      }),
    ).resolves.toMatchObject({
      mode: 'merged',
      canonicalSessionId: 'session-2',
      movedCheckCount: 2,
    });
    expect(rpc).toHaveBeenCalledWith(
      'transfer_or_merge_table_session',
      expect.objectContaining({
        requested_client_mutation_id: 'mutation-1',
      }),
    );
  });
});
