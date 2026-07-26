import { BranchId, DeviceId, MutationId, OrganizationId, toDomainId } from '../../../domain';
import { SupabasePaymentGateway } from '../paymentGateway';

describe('SupabasePaymentGateway', () => {
  it('returns the server-authoritative balance', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        status: 'confirmed',
        checkId: 'check-1',
        checkStatus: 'partially_paid',
        checkVersion: 2,
        totalMinor: 1_000,
        paidMinor: 400,
        remainingMinor: 600,
        paymentIds: ['payment-1'],
      },
      error: null,
    });
    const gateway = new SupabasePaymentGateway({ rpc } as never);

    await expect(
      gateway.confirm({
        organizationId: toDomainId<OrganizationId>('organization-1'),
        branchId: toDomainId<BranchId>('branch-1'),
        deviceId: toDomainId<DeviceId>('device-1'),
        clientMutationId: toDomainId<MutationId>('mutation-1'),
        command: {
          checkId: 'check-1' as never,
          expectedCheckVersion: 1,
          currencyCode: 'EUR' as never,
          payments: [
            {
              id: 'payment-1' as never,
              method: 'cash',
              amountMinor: 400,
              tenderedMinor: 500,
              allocations: [{ id: 'allocation-1' as never, amountMinor: 400 }],
            },
          ],
        },
      }),
    ).resolves.toMatchObject({
      checkVersion: 2,
      paidMinor: 400,
      remainingMinor: 600,
    });
    expect(rpc).toHaveBeenCalledWith(
      'confirm_check_payments',
      expect.objectContaining({
        requested_client_mutation_id: 'mutation-1',
        requested_device_id: 'device-1',
      }),
    );
  });

  it('does not hide a stale-check response', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'payment_check_version_conflict',
        details: '{"serverVersion":2}',
      },
    });
    const gateway = new SupabasePaymentGateway({ rpc } as never);

    await expect(
      gateway.confirm({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        deviceId: 'device-1' as never,
        clientMutationId: 'mutation-1' as never,
        command: {
          checkId: 'check-1' as never,
          expectedCheckVersion: 1,
          currencyCode: 'EUR' as never,
          payments: [],
        },
      }),
    ).rejects.toMatchObject({
      name: 'PaymentCommandError',
      message: 'payment_check_version_conflict',
      code: 'P0001',
    });
  });
});
