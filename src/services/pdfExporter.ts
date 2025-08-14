import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ticket } from '../types';

interface PdfResult {
  success: boolean;
  uri?: string;
  error?: string;
}

class PdfExporter {
  private readonly pageWidth = 612; // A4 width in points
  private readonly pageHeight = 792; // A4 height in points
  
  async exportOrderToPdf(ticket: Ticket, formatPrice: (amount: number) => string): Promise<PdfResult> {
    try {
      if (!ticket || !ticket.lines || ticket.lines.length === 0) {
        throw new Error('Invalid ticket data provided');
      }
      
      const html = this.generateOrderHtml(ticket, formatPrice);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: this.pageWidth,
        height: this.pageHeight,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `order-${ticket.id}-${date}-${time}.pdf`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: filename,
        });
      }

      return { success: true, uri };
    } catch (error) {
      console.error('PDF Export Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  private generateOrderHtml(ticket: Ticket, formatPrice: (amount: number) => string): string {
    const total = ticket.lines.reduce((sum, line) => sum + (line.priceSnapshot * line.quantity), 0);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Receipt - ${ticket.id}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            line-height: 1.4;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #FF6B35;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .order-info {
            margin-bottom: 30px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
          }
          .order-info h2 {
            color: #FF6B35;
            margin-top: 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #ddd;
            font-weight: bold;
          }
          .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
          }
          .items-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
            font-size: 18px;
            font-weight: bold;
            color: #FF6B35;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Order Receipt</h1>
          <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="order-info">
          <h2>Order Details</h2>
          <p><strong>Order ID:</strong> ${ticket.id}</p>
          <p><strong>Date:</strong> ${new Date(ticket.createdAt).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(ticket.createdAt).toLocaleTimeString()}</p>
          ${ticket.name ? `<p><strong>Name:</strong> ${ticket.name}</p>` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="width: 80px;">Qty</th>
              <th style="width: 100px;">Unit Price</th>
              <th style="width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${ticket.lines.map(line => `
              <tr>
                <td>
                  ${line.nameSnapshot}
                  ${line.note ? `<div style="font-size: 12px; color: #666; font-style: italic;">Note: ${line.note}</div>` : ''}
                </td>
                <td style="text-align: center;">${line.quantity}</td>
                <td style="text-align: right;">${formatPrice(line.priceSnapshot)}</td>
                <td style="text-align: right; font-weight: bold;">${formatPrice(line.priceSnapshot * line.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          TOTAL: ${formatPrice(total)}
        </div>

        <div class="footer">
          <p>Thank you for your order!</p>
          <p>Generated by Orderia POS System</p>
        </div>
      </body>
      </html>
    `;
  }

  async testExport(): Promise<PdfResult> {
    const sampleTicket: Ticket = {
      id: 'TEST-001',
      tableId: 'table-1',
      status: 'paid',
      createdAt: Date.now(),
      closedAt: Date.now(),
      lines: [
        {
          id: '1',
          menuItemId: 'item-1',
          nameSnapshot: 'Test Pizza',
          quantity: 2,
          priceSnapshot: 2599, // $25.99 in cents
          note: 'Extra cheese',
          status: 'delivered',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          menuItemId: 'item-2',
          nameSnapshot: 'Test Drink',
          quantity: 1,
          priceSnapshot: 599, // $5.99 in cents
          note: '',
          status: 'delivered',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    };
    
    return this.exportOrderToPdf(sampleTicket, (amount) => `$${(amount / 100).toFixed(2)}`);
  }
}

export const pdfExporter = new PdfExporter();
export type { PdfResult };