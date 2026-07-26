import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { Receipt } from '../../domain';
import { Database } from '../../services/supabase';

type DocumentDefinition = TDocumentDefinitions;
type FontDictionary = TFontDictionary;

const fonts: FontDictionary = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

export interface PreparedReceiptPdf {
  readonly signedUrl: string;
  readonly pdfHash: string;
  readonly storagePath: string;
}

export async function generateReceiptPdf(receipt: Receipt): Promise<Uint8Array> {
  const [pdfMake, fontAssets] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const definition = receiptDocument(receipt);
  const base64 = await new Promise<string>((resolve) => {
    pdfMake.createPdf(definition, undefined, fonts, fontAssets.vfs).getBase64(resolve);
  });
  return base64ToBytes(base64);
}

export class ReceiptPdfGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async prepare(receipt: Receipt): Promise<PreparedReceiptPdf> {
    if (!receipt.pdfStoragePath) throw new Error('Receipt PDF storage path is missing');
    let pdfHash = receipt.pdfHash;

    if (!pdfHash) {
      const bytes = await generateReceiptPdf(receipt);
      pdfHash = bytesToHex(sha256(bytes));
      const bucket = this.client.storage.from('receipt-pdfs');
      const { error: uploadError } = await bucket.upload(
        receipt.pdfStoragePath,
        bytes.buffer as ArrayBuffer,
        {
          cacheControl: '31536000',
          contentType: 'application/pdf',
          upsert: false,
        },
      );
      if (uploadError) {
        if (!isDuplicateObjectError(uploadError)) throw uploadError;
        const { data: storedPdf, error: downloadError } = await bucket.download(
          receipt.pdfStoragePath,
        );
        if (downloadError) throw downloadError;
        pdfHash = bytesToHex(sha256(new Uint8Array(await storedPdf.arrayBuffer())));
      }

      const { error: finalizeError } = await this.client.rpc('finalize_receipt_pdf', {
        requested_organization_id: receipt.organizationId,
        requested_branch_id: receipt.branchId,
        requested_receipt_id: receipt.id,
        requested_pdf_hash: pdfHash,
      });
      if (finalizeError) throw finalizeError;
    }

    const { data, error } = await this.client.storage
      .from('receipt-pdfs')
      .createSignedUrl(receipt.pdfStoragePath, 300, {
        download: `${receipt.receiptNumber}.pdf`,
      });
    if (error) throw error;

    return {
      signedUrl: data.signedUrl,
      pdfHash,
      storagePath: receipt.pdfStoragePath,
    };
  }
}

function receiptDocument(receipt: Receipt): DocumentDefinition {
  const snapshot = receipt.snapshot;
  const itemRows = snapshot.checks.flatMap((check) =>
    check.items.flatMap((item) => [
      [
        `${formatQuantity(item.quantity)}×`,
        [
          { text: item.name, bold: true },
          ...item.modifiers.map((modifier) => ({
            text: `+ ${modifier.name}`,
            color: '#475467',
            fontSize: 8,
          })),
        ],
        money(item.unitPriceMinor, receipt.currencyCode),
        money(item.lineTotalMinor, receipt.currencyCode),
      ],
    ]),
  );
  const paymentRows = snapshot.payments.map((payment) => [
    payment.method === 'cash' ? 'Cash / Nakit' : 'Card / Kart',
    payment.createdByDisplayName,
    money(payment.amountMinor, receipt.currencyCode),
  ]);

  return {
    info: {
      title: receipt.receiptNumber,
      author: snapshot.organizationName,
      subject: `Orderia receipt ${receipt.receiptNumber}`,
      creationDate: new Date(receipt.issuedAt),
      modDate: new Date(receipt.issuedAt),
    },
    pageMargins: [28, 32, 28, 32],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#101828' },
    content: [
      { text: snapshot.organizationName, style: 'title' },
      { text: snapshot.branchName, style: 'subtitle' },
      {
        columns: [
          [
            { text: `Receipt / Adisyon: ${receipt.receiptNumber}`, bold: true },
            { text: `Table / Masa: ${snapshot.tableLabel}` },
            { text: `Check / Hesap: ${snapshot.checks.map((check) => check.name).join(', ')}` },
          ],
          [
            { text: fixedIssuedAt(receipt), alignment: 'right' },
            {
              text: `Waiter / Garson: ${snapshot.waiterDisplayNames.join(', ')}`,
              alignment: 'right',
            },
          ],
        ],
        margin: [0, 14, 0, 14],
      },
      {
        table: {
          headerRows: 1,
          widths: [28, '*', 62, 62],
          body: [['Qty', 'Item / Ürün', 'Unit', 'Total'], ...itemRows],
        },
        layout: 'lightHorizontalLines',
      },
      {
        columns: [
          { text: '' },
          {
            stack: [
              { text: 'Payments / Ödemeler', style: 'section' },
              {
                table: {
                  widths: [70, '*', 62],
                  body: paymentRows,
                },
                layout: 'noBorders',
              },
              {
                columns: [
                  { text: 'Grand total / Genel toplam', bold: true },
                  {
                    text: money(receipt.totalMinor, receipt.currencyCode),
                    bold: true,
                    alignment: 'right',
                  },
                ],
                margin: [0, 8, 0, 0],
              },
            ],
            width: 250,
          },
        ],
        margin: [0, 18, 0, 0],
      },
      {
        text: 'This is an order receipt, not a fiscal receipt. / Bu belge mali fiş değildir.',
        color: '#667085',
        alignment: 'center',
        fontSize: 8,
        margin: [0, 28, 0, 0],
      },
      {
        text: `PDF SHA-256 is recorded by Orderia after private upload.`,
        color: '#98A2B3',
        alignment: 'center',
        fontSize: 7,
        margin: [0, 4, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 18, bold: true, alignment: 'center', color: '#0F766E' },
      subtitle: { fontSize: 11, alignment: 'center', color: '#475467' },
      section: { fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
    },
  };
}

function money(amountMinor: number, currencyCode: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** fractionDigits);
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(3).replace(/0+$/, '');
}

function fixedIssuedAt(receipt: Receipt): string {
  return `${new Date(receipt.issuedAt).toISOString()} · ${receipt.snapshot.branchTimezone}`;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isDuplicateObjectError(error: { readonly message: string; readonly statusCode?: string }) {
  return error.statusCode === '409' || /duplicate|already exists/i.test(error.message);
}
