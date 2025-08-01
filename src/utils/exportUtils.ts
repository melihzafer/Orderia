import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { DayHistory, Ticket, TicketLine } from '../types';

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
