import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { DayHistory, Ticket, TicketLine, MenuItem, PaymentInfo } from '../types';
import { Translation } from '../i18n/languages';

export interface ExportData {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  orders: Array<{
    orderId: string;
    tableId: string;
    timestamp: string;
    total: number;
    status: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  }>;
}

export async function exportToCSV(
  data: ExportData[],
  filename: string = 'orderia_report',
  t?: any
): Promise<boolean> {
  const translations = {
    date: 'Date',
    totalOrders: 'Total Orders',
    totalRevenue: 'Total Revenue',
    averageOrderValue: 'Average Order Value',
    detailedOrders: 'Detailed Orders',
    orderId: 'Order ID',
    tableId: 'Table ID',
    timestamp: 'Timestamp',
    total: 'Total',
    status: 'Status',
    itemName: 'Item Name',
    quantity: 'Quantity',
    itemPrice: 'Item Price',
    itemTotal: 'Item Total'
  };

  try {
    let csvContent = `${translations.date},${translations.totalOrders},${translations.totalRevenue},${translations.averageOrderValue}\n`;
    
    // Summary data
    data.forEach(day => {
      csvContent += `${day.date},${day.totalOrders},${day.totalRevenue},${day.averageOrderValue}\n`;
    });
    
    csvContent += `\n\n${translations.detailedOrders}\n`;
    csvContent += `${translations.date},${translations.orderId},${translations.tableId},${translations.timestamp},${translations.total},${translations.status},${translations.itemName},${translations.quantity},${translations.itemPrice},${translations.itemTotal}\n`;
    
    // Detailed order data with items
    data.forEach(day => {
      day.orders.forEach(order => {
        if (order.items.length === 0) {
          // If no items, still show the order with empty item fields
          csvContent += `${day.date},${order.orderId},${order.tableId},${order.timestamp},${order.total},${order.status},,,,\n`;
        } else {
          order.items.forEach(item => {
            csvContent += `${day.date},${order.orderId},${order.tableId},${order.timestamp},${order.total},${order.status},"${item.name}",${item.quantity},${item.price},${item.total}\n`;
          });
        }
      });
    });

    const fileUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
      return true;
    } else {
      console.error('Sharing is not available on this platform');
      return false;
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
}

function generateHTMLContent(
  data: ExportData[],
  translations: any,
  priceFormatter: (amount: number) => string
): string {
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${translations.salesReport}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { color: #2E7D32; margin-bottom: 10px; }
            .summary-table, .details-table, .items-table { 
                width: 100%; border-collapse: collapse; margin-bottom: 20px; 
            }
            .summary-table th, .summary-table td, .details-table th, .details-table td,
            .items-table th, .items-table td { 
                border: 1px solid #ddd; padding: 8px; text-align: left; 
            }
            .summary-table th, .details-table th, .items-table th { 
                background-color: #f5f5f5; font-weight: bold; 
            }
            .section-title { 
                font-size: 18px; font-weight: bold; margin: 30px 0 15px 0; 
                color: #2E7D32; border-bottom: 1px solid #ddd; padding-bottom: 5px;
            }
            .day-section { margin-bottom: 40px; }
            .order-section { margin-bottom: 25px; }
            .order-header { 
                background-color: #e8f5e8; padding: 10px; margin-bottom: 10px; 
                border-left: 4px solid #2E7D32; font-weight: bold;
            }
            .items-table { margin-left: 20px; width: calc(100% - 20px); }
            .price-cell { text-align: right; }
            .no-orders { text-align: center; color: #666; padding: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${translations.salesReport}</h1>
            <p>${translations.createdDate}: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section-title">${translations.dailySummary}</div>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>${translations.date}</th>
                    <th>${translations.totalOrders}</th>
                    <th>${translations.totalRevenue}</th>
                    <th>${translations.averageOrderValue}</th>
                </tr>
            </thead>
            <tbody>`;

  data.forEach(day => {
    htmlContent += `
                <tr>
                    <td>${day.date}</td>
                    <td>${day.totalOrders}</td>
                    <td class="price-cell">${priceFormatter(day.totalRevenue)}</td>
                    <td class="price-cell">${priceFormatter(day.averageOrderValue)}</td>
                </tr>`;
  });

  htmlContent += `
            </tbody>
        </table>
        
        <div class="section-title">${translations.detailedOrders}</div>`;

  data.forEach(day => {
    htmlContent += `<div class="day-section">`;
    htmlContent += `<h3>${day.date}</h3>`;
    
    if (day.orders.length === 0) {
      htmlContent += `<div class="no-orders">Bu tarihte sipariş bulunmamaktadır.</div>`;
    } else {
      day.orders.forEach(order => {
        htmlContent += `
        <div class="order-section">
          <div class="order-header">
            ${translations.orderId}: ${order.orderId} | 
            ${translations.tableId}: ${order.tableId} | 
            ${translations.time}: ${order.timestamp} | 
            ${translations.total}: ${priceFormatter(order.total)}
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>${translations.item}</th>
                <th>${translations.quantity}</th>
                <th>${translations.unitPrice}</th>
                <th>${translations.itemTotal}</th>
              </tr>
            </thead>
            <tbody>`;
        
        order.items.forEach(item => {
          htmlContent += `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td class="price-cell">${priceFormatter(item.price)}</td>
                <td class="price-cell">${priceFormatter(item.total)}</td>
              </tr>`;
        });
        
        htmlContent += `
            </tbody>
          </table>
        </div>`;
      });
    }
    htmlContent += `</div>`;
  });

  htmlContent += `
    </body>
    </html>`;

  return htmlContent;
}

export async function exportToPDF(
  data: ExportData[],
  filename: string = 'orderia_report',
  t?: any,
  formatPrice?: (amount: number) => string
): Promise<boolean> {
  const priceFormatter = formatPrice || ((amount: number) => `₺${amount.toFixed(2)}`);
  const translations = t || {
    salesReport: 'Orderia Satış Raporu',
    createdDate: 'Oluşturulma Tarihi',
    dailySummary: 'Günlük Özet',
    date: 'Tarih',
    totalOrders: 'Toplam Sipariş',
    totalRevenue: 'Toplam Gelir',
    averageOrderValue: 'Ortalama Sipariş Değeri',
    detailedOrders: 'Detaylı Siparişler',
    orderId: 'Sipariş ID',
    tableId: 'Masa ID',
    time: 'Saat',
    status: 'Durum',
    total: 'Toplam',
    items: 'Ürünler',
    item: 'Ürün',
    quantity: 'Miktar',
    unitPrice: 'Birim Fiyat',
    itemTotal: 'Tutar'
  };

  try {
    const htmlContent = generateHTMLContent(data, translations, priceFormatter);

    // Generate PDF from HTML
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Create the final file path
    const finalUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.pdf`;
    
    // Move the generated PDF to the desired location
    await FileSystem.moveAsync({
      from: uri,
      to: finalUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(finalUri);
      return true;
    } else {
      console.error('Sharing is not available on this platform');
      return false;
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return false;
  }
}

export function prepareExportData(dailyHistory: Record<string, DayHistory>): ExportData[] {
  return Object.entries(dailyHistory).map(([date, history]) => {
    const totalRevenue = history.totals.gross; // Convert cents to currency units
    const totalOrders = history.tickets.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const orders = history.tickets.map((ticket: Ticket) => ({
      orderId: ticket.id,
      tableId: ticket.lines.map(line => line.nameSnapshot).join(', '),
      timestamp: new Date(ticket.createdAt).toLocaleTimeString('tr-TR'),
      total: ticket.lines.reduce((sum, line) => sum + (line.priceSnapshot * line.quantity), 0),
      status: ticket.status,
      items: ticket.lines.map((item: TicketLine) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        price: item.priceSnapshot,
        total: (item.priceSnapshot * item.quantity),
      })),
    }));

    return {
      date,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      orders,
    };
  });
}

function generateBillHTML(
  ticket: Ticket,
  t: Translation,
  priceFormatter: (amount: number) => string
): string {
  const {
    id,
    name,
    lines,
    paymentInfo,
    createdAt,
    closedAt
  } = ticket;

  const headerImage = 'https://raw.githubusercontent.com/zwolfe/orderia/main/assets/images/Logo.png';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${t.orderBill} #${id.slice(-6)}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #333; background-color: #f9f9f9; }
            .container { max-width: 800px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.05); padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
            .header img { max-width: 100px; margin-bottom: 10px; }
            .header h1 { font-size: 24px; color: #111; margin: 0; }
            .ticket-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; color: #555; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            .items-table th { background-color: #f9f9f9; font-weight: 600; font-size: 14px; }
            .items-table .quantity { text-align: center; }
            .items-table .price { text-align: right; }
            .summary { margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; }
            .summary-row.total { font-weight: 700; font-size: 20px; color: #000; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${headerImage}" alt="Logo">
                <h1>${t.orderBill}</h1>
            </div>
            <div class="ticket-info">
                <div><strong>${t.orderId}:</strong> #${id.slice(-6)}</div>
                <div><strong>${t.date}:</strong> ${new Date(closedAt || createdAt).toLocaleDateString()}</div>
            </div>
            ${name ? `<div style="text-align: center; margin-bottom: 20px; font-size: 16px;"><strong>${t.orderName}:</strong> ${name}</div>` : ''}
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>${t.item}</th>
                        <th class="quantity">${t.quantity}</th>
                        <th class="price">${t.unitPrice}</th>
                        <th class="price">${t.itemTotal}</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(line => `
                        <tr>
                            <td>${line.nameSnapshot}</td>
                            <td class="quantity">${line.quantity}</td>
                            <td class="price">${priceFormatter(line.priceSnapshot)}</td>
                            <td class="price">${priceFormatter(line.priceSnapshot * line.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            ${paymentInfo ? `
            <div class="summary">
                <div class="summary-row total">
                    <span>${t.total}</span>
                    <span class="price">${priceFormatter(paymentInfo.total)}</span>
                </div>
                ${paymentInfo.paymentMethod === 'cash' ? `
                <div class="summary-row">
                    <span>${t.amountReceived} (${t.cash})</span>
                    <span class="price">${priceFormatter(paymentInfo.amountReceived || 0)}</span>
                </div>
                <div class="summary-row">
                    <span>${t.change}</span>
                    <span class="price">${priceFormatter(paymentInfo.change || 0)}</span>
                </div>
                ` : `
                <div class="summary-row">
                    <span>${t.paymentMethod}</span>
                    <span class="price">${t.card}</span>
                </div>
                `}
            </div>
            ` : ''}

            <div class="footer">
                <p>${t.thankYouNote || 'Thank you for your visit!'}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}


export async function generateAndShareBill(
  ticket: Ticket,
  t: Translation,
  priceFormatter: (amount: number) => string
): Promise<boolean> {
  try {
    const htmlContent = generateBillHTML(ticket, t, priceFormatter);

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    const filename = `Orderia_Bill_${ticket.id.slice(-6)}.pdf`;
    const finalUri = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: finalUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: t.shareBill || 'Share Bill',
      });
      return true;
    } else {
      alert(t.sharingNotAvailable || 'Sharing is not available on this device.');
      return false;
    }
  } catch (error) {
    console.error('Error generating or sharing bill:', error);
    alert(t.genericError || 'An error occurred while generating the bill.');
    return false;
  }
}
