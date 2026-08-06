import { SupabaseReopenTableSessionGateway } from '../reopenTableSessionGateway';

describe('SupabaseReopenTableSessionGateway', () => {
  it('returns the canonical reopened session and forwards the reason', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        status: 'applied',
        tableSessionId: 'session-1',
        tableId: 'table-4',
        tableSessionVersion: 7,
        previousClosedAt: '2026-07-31T20:11:00.000Z',
      },
      error: null,
    });

    const gateway = new SupabaseReopenTableSessionGateway({ rpc } as never);

    await expect(
      gateway.reopen({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        deviceId: 'device-1' as never,
        clientMutationId: 'mutation-1' as never,
        tableSessionId: 'session-1' as never,
        reason: 'Wrong item correction',
        pin: '1234',
      }),
    ).resolves.toMatchObject({
      tableId: 'table-4',
      tableSessionVersion: 7,
    });
    expect(rpc).toHaveBeenCalledWith(
      'reopen_closed_table_session',
      expect.objectContaining({
        requested_reason: 'Wrong item correction',
        requested_table_session_id: 'session-1',
      }),
    );
  });
});
