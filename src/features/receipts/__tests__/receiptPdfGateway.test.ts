import { Receipt } from '../../../domain';
import { ReceiptPdfGateway, generateReceiptPdf } from '../receiptPdf';

describe('ReceiptPdfGateway', () => {
  it('uploads, seals, and signs a newly generated receipt PDF', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.test/signed' },
      error: null,
    });
    const rpc = jest.fn().mockResolvedValue({ data: { status: 'ready' }, error: null });
    const gateway = new ReceiptPdfGateway({
      rpc,
      storage: {
        from: jest.fn().mockReturnValue({
          upload,
          download: jest.fn(),
          createSignedUrl,
        }),
      },
    } as never);

    const prepared = await gateway.prepare(receipt);

    expect(upload).toHaveBeenCalledWith(
      receipt.pdfStoragePath,
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: 'application/pdf', upsert: false }),
    );
    expect(rpc).toHaveBeenCalledWith(
      'finalize_receipt_pdf',
      expect.objectContaining({
        requested_receipt_id: receipt.id,
        requested_pdf_hash: prepared.pdfHash,
      }),
    );
    expect(prepared).toEqual({
      signedUrl: 'https://storage.test/signed',
      pdfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      storagePath: receipt.pdfStoragePath,
    });
  });

  it('hashes the stored object when another device wins the upload race', async () => {
    const storedBytes = await generateReceiptPdf(receipt);
    const storedPdf = new Blob([storedBytes], { type: 'application/pdf' });
    const download = jest.fn().mockResolvedValue({ data: storedPdf, error: null });
    const rpc = jest.fn().mockResolvedValue({ data: { status: 'ready' }, error: null });
    const gateway = new ReceiptPdfGateway({
      rpc,
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            error: { message: 'The resource already exists', statusCode: '409' },
          }),
          download,
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.test/existing' },
            error: null,
          }),
        }),
      },
    } as never);

    const prepared = await gateway.prepare(receipt);

    expect(download).toHaveBeenCalledWith(receipt.pdfStoragePath);
    expect(rpc).toHaveBeenCalledWith(
      'finalize_receipt_pdf',
      expect.objectContaining({ requested_pdf_hash: prepared.pdfHash }),
    );
    expect(prepared.signedUrl).toBe('https://storage.test/existing');
  });
});

const receipt: Receipt = {
  id: 'receipt-1' as never,
  organizationId: 'organization-1' as never,
  branchId: 'branch-1' as never,
  tableSessionId: 'session-1' as never,
  checkId: 'check-1' as never,
  receiptNumber: 'ORD-20260726-000001',
  businessDate: '2026-07-26' as never,
  issuedAt: '2026-07-26T18:00:00.000Z',
  issuedBy: 'waiter-1' as never,
  totalMinor: 500,
  currencyCode: 'EUR' as never,
  snapshot: {
    schemaVersion: 1,
    organizationName: 'Orderia Test',
    branchName: 'Sofia',
    branchTimezone: 'Europe/Sofia',
    tableLabel: 'Masa 4',
    openedAt: '2026-07-26T17:00:00.000Z',
    issuedAt: '2026-07-26T18:00:00.000Z',
    waiterDisplayNames: ['Şule Garson'],
    checks: [
      {
        checkId: 'check-1' as never,
        name: 'Pencere tarafı',
        items: [
          {
            orderItemId: 'item-1' as never,
            name: 'Peynirli patates',
            modifiers: [{ name: 'Peynirli', priceDeltaMinor: 100, quantity: 1 }],
            unitPriceMinor: 400,
            quantity: 1,
            lineTotalMinor: 500,
          },
        ],
        totalMinor: 500,
      },
    ],
    payments: [
      {
        paymentId: 'payment-1' as never,
        method: 'card',
        amountMinor: 500,
        confirmedAt: '2026-07-26T18:00:00.000Z',
        createdByDisplayName: 'Şule Garson',
      },
    ],
    totalMinor: 500,
    currencyCode: 'EUR' as never,
  },
  pdfStoragePath: 'organization-1/branch-1/2026-07-26/receipt-1.pdf',
  status: 'issued',
};
