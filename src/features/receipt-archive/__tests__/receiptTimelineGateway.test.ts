import { ReceiptTimelineGateway } from '../receiptTimelineGateway';

describe('ReceiptTimelineGateway', () => {
  it('parses auditable actions returned by the archive RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          occurredAt: '2026-07-31T20:01:00.000Z',
          action: 'orders.send_batch',
          actorDisplayName: 'Melih',
          reason: null,
        },
      ],
      error: null,
    });

    await expect(
      new ReceiptTimelineGateway({ rpc } as never).load({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        receiptId: 'receipt-1' as never,
      }),
    ).resolves.toEqual([
      {
        occurredAt: '2026-07-31T20:01:00.000Z',
        action: 'orders.send_batch',
        actorDisplayName: 'Melih',
      },
    ]);
  });
});
