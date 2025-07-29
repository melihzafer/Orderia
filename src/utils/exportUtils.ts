import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  filename: string = 'orderia_report'
): Promise<boolean> {
  try {
    let csvContent = 'Date,Total Orders,Total Revenue,Average Order Value\n';
    
    // Summary data
    data.forEach(day => {
      csvContent += `${day.date},${day.totalOrders},${day.totalRevenue},${day.averageOrderValue}\n`;
    });
    
    csvContent += '\n\nDetailed Orders\n';
    csvContent += 'Date,Order ID,Table ID,Timestamp,Total,Status,Item Name,Quantity,Item Price,Item Total\n';
    
    // Detailed order data
    data.forEach(day => {
      day.orders.forEach(order => {
        order.items.forEach(item => {
          csvContent += `${day.date},${order.orderId},${order.tableId},${order.timestamp},${order.total},${order.status},${item.name},${item.quantity},${item.price},${item.total}\n`;
        });
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

export async function exportToPDF(
  data: ExportData[],
  filename: string = 'orderia_report'
): Promise<boolean> {
  try {
    // Create HTML content for PDF
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Orderia Raporu</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary-table, .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .summary-table th, .summary-table td, .details-table th, .details-table td { 
                border: 1px solid #ddd; padding: 8px; text-align: left; 
            }
            .summary-table th, .details-table th { background-color: #f2f2f2; }
            .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Orderia Satış Raporu</h1>
            <p>Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        
        <div class="section-title">Günlük Özet</div>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Tarih</th>
                    <th>Toplam Sipariş</th>
                    <th>Toplam Gelir</th>
                    <th>Ortalama Sipariş Değeri</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach(day => {
      htmlContent += `
                <tr>
                    <td>${day.date}</td>
                    <td>${day.totalOrders}</td>
                    <td>₺${day.totalRevenue.toFixed(2)}</td>
                    <td>₺${day.averageOrderValue.toFixed(2)}</td>
                </tr>`;
    });

    htmlContent += `
            </tbody>
        </table>
        
        <div class="section-title">Detaylı Siparişler</div>`;

    data.forEach(day => {
      if (day.orders.length > 0) {
        htmlContent += `
        <h3>${day.date}</h3>
        <table class="details-table">
            <thead>
                <tr>
                    <th>Sipariş ID</th>
                    <th>Masa ID</th>
                    <th>Saat</th>
                    <th>Durum</th>
                    <th>Toplam</th>
                </tr>
            </thead>
            <tbody>`;

        day.orders.forEach(order => {
          htmlContent += `
                <tr>
                    <td>${order.orderId}</td>
                    <td>${order.tableId}</td>
                    <td>${order.timestamp}</td>
                    <td>${order.status}</td>
                    <td>₺${order.total.toFixed(2)}</td>
                </tr>`;
        });

        htmlContent += `
            </tbody>
        </table>`;
      }
    });

    htmlContent += `
    </body>
    </html>`;

    const fileUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.html`;
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
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
    console.error('Error exporting PDF:', error);
    return false;
  }
}

export function prepareExportData(dailyHistory: Record<string, DayHistory>): ExportData[] {
  return Object.entries(dailyHistory).map(([date, history]) => {
    const totalRevenue = history.totals.gross / 100; // Convert cents to currency units
    const totalOrders = history.tickets.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const orders = history.tickets.map((ticket: Ticket) => ({
      orderId: ticket.id,
      tableId: ticket.tableId,
      timestamp: new Date(ticket.createdAt).toLocaleTimeString('tr-TR'),
      total: ticket.lines.reduce((sum, line) => sum + (line.priceSnapshot * line.quantity), 0) / 100,
      status: ticket.status,
      items: ticket.lines.map((item: TicketLine) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        price: item.priceSnapshot / 100,
        total: (item.priceSnapshot * item.quantity) / 100,
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
