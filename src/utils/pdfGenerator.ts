import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ticket, TicketLine } from '../types';
import { brand } from '../constants/branding';

interface OrderBillData {
  ticket: Ticket;
  ticketLines: TicketLine[];
  tableName: string;
  total: number;
  formatPrice: (amount: number) => string;
  t: any; // Translation object
}

export const generateOrderBillPDF = async (data: OrderBillData): Promise<void> => {
  const { ticket, ticketLines, tableName, total, formatPrice, t } = data;
  
  // Get current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  
  // For a paid ticket, show all lines (they should all be paid)
  // If for some reason filtering is needed, use ticket.lines instead of ticketLines
  const linesToShow = ticket.status === 'paid' ? ticket.lines : ticketLines.filter(line => line.status === 'paid');
  
  console.log('PDF Generation Debug:', {
    ticketStatus: ticket.status,
    totalLines: ticketLines.length,
    linesToShow: linesToShow.length,
    lineStatuses: ticketLines.map(l => ({ id: l.id, status: l.status, name: l.nameSnapshot }))
  });

  // Ensure we have items to show
  if (linesToShow.length === 0) {
    throw new Error('No items to include in the bill');
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t.orderBill}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2E7D32;
          margin-bottom: 5px;
        }
        .company-tagline {
          font-size: 14px;
          color: #666;
          font-style: italic;
        }
        .bill-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .bill-section {
          margin-bottom: 15px;
        }
        .bill-label {
          font-weight: bold;
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .items-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          color: #333;
        }
        .items-table .price-cell {
          text-align: right;
        }
        .total-section {
          border-top: 2px solid #333;
          padding-top: 15px;
          text-align: right;
        }
        .total-label {
          font-size: 18px;
          font-weight: bold;
        }
        .total-amount {
          font-size: 20px;
          font-weight: bold;
          color: #2E7D32;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${brand.name}</div>
        <div class="company-tagline">${brand.tagline}</div>
      </div>
      
      <div class="bill-info">
        <div class="bill-section">
          <div class="bill-label">${t.orderBill} #${ticket.id.slice(-8)}</div>
        </div>
        <div class="bill-section">
          <div class="bill-label">${t.table}: ${tableName}</div>
        </div>
        <div class="bill-section">
          <div class="bill-label">${t.date}: ${dateStr}</div>
        </div>
        <div class="bill-section">
          <div class="bill-label">${t.time}: ${timeStr}</div>
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>${t.item}</th>
            <th>${t.quantity}</th>
            <th>${t.unitPrice}</th>
            <th>${t.total}</th>
          </tr>
        </thead>
        <tbody>
          ${linesToShow.map(line => `
            <tr>
              <td>${line.nameSnapshot}</td>
              <td>${line.quantity}</td>
              <td class="price-cell">${formatPrice(line.priceSnapshot)}</td>
              <td class="price-cell">${formatPrice(line.priceSnapshot * line.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-section">
        <div class="total-label">${t.total}: <span class="total-amount">${formatPrice(total)}</span></div>
      </div>
      
      <div class="footer">
        <div>${t.thank_you_for_your_visit}</div>
        <div>OMNI Tech Solutions</div>
      </div>
    </body>
    </html>
  `;

  try {
    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Share PDF file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: t.orderBill,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error('Error generating order bill PDF:', error);
    throw error;
  }
};
