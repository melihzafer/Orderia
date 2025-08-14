import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useAnalytics, DateRange } from '../contexts/AnalyticsContext';
import { useOrderStore, useMenuStore, useHistoryStore } from '../stores';
import { SurfaceCard, PrimaryButton } from '../components';
import { brand, radius, spacing } from '../constants/branding';

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
type ChartType = 'revenue' | 'orders' | 'items' | 'tables';

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  const { getAllOpenTickets, getTicketTotal } = useOrderStore();
  const { menuItems } = useMenuStore();
  const { dailyHistory, getHistoryDates } = useHistoryStore();
  const {
    getSalesAnalytics,
    getTopSellingItems,
    getPeakHours,
    getTableTurnoverAnalysis,
    getCategoryPerformance,
    getDailySalesChart,
    getRevenueGrowth,
  } = useAnalytics();

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedChart, setSelectedChart] = useState<ChartType>('revenue');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);

  const screenWidth = Dimensions.get('window').width;

  // Get date range based on selected period
  const getDateRange = (): DateRange | undefined => {
    if (selectedPeriod === 'custom' && customDateRange) {
      return customDateRange;
    }

    const endDate = new Date();
    const startDate = new Date();

    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        return undefined;
    }

    return { startDate, endDate };
  };

  const dateRange = getDateRange();
  const analytics = useMemo(() => getSalesAnalytics(dateRange), [dateRange]);
  const revenueGrowth = useMemo(() => getRevenueGrowth(dateRange), [dateRange]);
  const topItems = useMemo(() => getTopSellingItems(5, dateRange), [dateRange]);
  const peakHours = useMemo(() => getPeakHours(dateRange), [dateRange]);
  const categoryPerformance = useMemo(() => getCategoryPerformance(dateRange), [dateRange]);

  // Export analytics report to PDF
  const handleExportReport = async () => {
    try {
      // Get all tickets for the selected period
      const allTickets = [];
      
      // Add history tickets
      const historyDates = getHistoryDates();
      for (const dateKey of historyDates) {
        const dayHistory = dailyHistory[dateKey];
        if (dayHistory) {
          allTickets.push(...dayHistory.tickets);
        }
      }
      
      // Add open tickets
      const openTickets = getAllOpenTickets();
      allTickets.push(...openTickets);
      
      // Filter by date range
      const filteredTickets = dateRange ? 
        allTickets.filter(ticket => {
          const ticketDate = ticket.closedAt || ticket.createdAt;
          return ticketDate >= dateRange.startDate.getTime() && 
                 ticketDate <= dateRange.endDate.getTime();
        }) : allTickets;
      
      // Calculate totals
      let grandTotal = 0;
      const orderDetails = filteredTickets.map(ticket => {
        const orderTotal = ticket.lines.reduce((sum, line) => {
          return sum + (line.priceSnapshot * line.quantity);
        }, 0);
        grandTotal += orderTotal;
        
        return {
          ticket,
          orderTotal,
          items: ticket.lines.map(line => {
            const menuItem = menuItems.find(item => item.id === line.menuItemId);
            return {
              ...line,
              menuItemName: menuItem?.name || line.nameSnapshot || 'Unknown Item',
              itemTotal: line.priceSnapshot * line.quantity
            };
          })
        };
      });

      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Detailed Analytics Report</title>
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
            .header p {
              margin: 5px 0;
              color: #FF6B35;
            }
            
            .summary {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              border: 1px solid #e9ecef;
            }
            .summary h2 {
              color: #FF6B35;
              margin-top: 0;
              border-bottom: 2px solid #FF6B35;
              padding-bottom: 10px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-top: 15px;
            }
            .summary-item {
              text-align: center;
              padding: 10px;
              background: white;
              border-radius: 6px;
              border: 1px solid #ddd;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #FF6B35;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-top: 5px;
            }
            
            .orders-section {
              margin-top: 30px;
            }
            .orders-section h2 {
              color: #333;
              border-bottom: 2px solid #FF6B35;
              padding-bottom: 10px;
            }
            
            .order {
              margin-bottom: 25px;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
            }
            .order-header {
              background: #f8f9fa;
              padding: 15px;
              border-bottom: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .order-id {
              font-weight: bold;
              color: #333;
            }
            .order-date {
              color: #666;
              font-size: 14px;
            }
            .order-total {
              font-weight: bold;
              color: #FF6B35;
              font-size: 18px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
            }
            .items-table th {
              background: #f8f9fa;
              padding: 12px;
              text-align: left;
              border-bottom: 2px solid #ddd;
              font-weight: bold;
              color: #333;
            }
            .items-table td {
              padding: 10px 12px;
              border-bottom: 1px solid #eee;
            }
            .items-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .items-table .qty {
              text-align: center;
              font-weight: bold;
            }
            .items-table .price {
              text-align: right;
              font-family: monospace;
            }
            .items-table .total {
              text-align: right;
              font-weight: bold;
              color: #FF6B35;
              font-family: monospace;
            }
            
            .grand-total {
              margin-top: 30px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              color: #FF6B35;
              background: #f8f9fa;
              padding: 20px;
              border: 2px solid #FF6B35;
              border-radius: 8px;
            }
            
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Detailed Analytics Report</h1>
            <p><strong>Period:</strong> ${selectedPeriod.toUpperCase()}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            ${dateRange ? `<p><strong>Date Range:</strong> ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}</p>` : ''}
          </div>

          <div class="summary">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">${filteredTickets.length}</div>
                <div class="summary-label">Total Orders</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${formatPrice(grandTotal)}</div>
                <div class="summary-label">Total Revenue</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${filteredTickets.length > 0 ? formatPrice(Math.round(grandTotal / filteredTickets.length)) : '0'}</div>
                <div class="summary-label">Average Order</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${orderDetails.reduce((sum, order) => sum + order.items.length, 0)}</div>
                <div class="summary-label">Total Items</div>
              </div>
            </div>
          </div>

          <div class="orders-section">
            <h2>Order Details</h2>
            ${orderDetails.map((order, index) => `
              <div class="order">
                <div class="order-header">
                  <div>
                    <div class="order-id">Order #${index + 1} - ${order.ticket.id}</div>
                    <div class="order-date">${new Date(order.ticket.createdAt).toLocaleDateString()} ${new Date(order.ticket.createdAt).toLocaleTimeString()}</div>
                    ${order.ticket.name ? `<div style="color: #666; font-size: 14px;">Name: ${order.ticket.name}</div>` : ''}
                  </div>
                  <div class="order-total">${formatPrice(order.orderTotal)}</div>
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
                    ${order.items.map(item => `
                      <tr>
                        <td>
                          ${item.menuItemName}
                          ${item.note ? `<div style="font-size: 12px; color: #666; font-style: italic;">Note: ${item.note}</div>` : ''}
                        </td>
                        <td class="qty">${item.quantity}</td>
                        <td class="price">${formatPrice(item.priceSnapshot)}</td>
                        <td class="total">${formatPrice(item.itemTotal)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
          </div>

          <div class="grand-total">
            GRAND TOTAL: ${formatPrice(grandTotal)}
          </div>

          <div class="footer">
            <p>Generated by Orderia Analytics System</p>
            <p>Report includes ${filteredTickets.length} orders with ${orderDetails.reduce((sum, order) => sum + order.items.length, 0)} total items</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: reportHtml,
        base64: false,
        width: 612, // A4 width
        height: 792, // A4 height
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });

      if (await Sharing.isAvailableAsync()) {
        const filename = `analytics-detailed-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Detailed Analytics Report',
        });
      }

      Alert.alert(
        t.success || 'Success',
        `Detailed report exported successfully!\n\n${filteredTickets.length} orders\n${formatPrice(grandTotal)} total revenue`,
        [{ text: t.ok || 'OK' }]
      );
    } catch (error) {
      console.error('Analytics export error:', error);
      Alert.alert(
        t.error || 'Error',
        t.exportFailed || 'Failed to export analytics report. Please try again.',
        [{ text: t.ok || 'OK' }]
      );
    }
  };

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => colors.text + Math.floor(opacity * 255).toString(16),
    style: {
      borderRadius: radius.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  const renderPeriodSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md }}>
        {[
          { key: 'today', label: t.today || 'Today' },
          { key: 'week', label: t.thisWeek || 'This Week' },
          { key: 'month', label: t.thisMonth || 'This Month' },
          { key: 'year', label: t.thisYear || 'This Year' },
          { key: 'custom', label: t.custom || 'Custom' },
        ].map((period) => (
          <TouchableOpacity
            key={period.key}
            onPress={() => setSelectedPeriod(period.key as TimePeriod)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              marginRight: spacing.sm,
              borderRadius: radius.full,
              backgroundColor: selectedPeriod === period.key ? colors.primary : colors.surfaceAlt,
            }}
          >
            <Text style={{
              color: selectedPeriod === period.key ? colors.primaryContrast : colors.text,
              fontWeight: selectedPeriod === period.key ? '600' : '400',
              fontSize: 14,
            }}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderKPICards = () => (
    <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <SurfaceCard variant="elevated" padding="medium" style={{ flex: 1 }}>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="cash-outline" size={24} color={colors.success} />
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
              {formatPrice(analytics.totalRevenue)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle }}>
              {t.totalRevenue || 'Total Revenue'}
            </Text>
            {revenueGrowth.growthPercentage !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                <Ionicons 
                  name={revenueGrowth.growthPercentage > 0 ? "trending-up" : "trending-down"} 
                  size={14} 
                  color={revenueGrowth.growthPercentage > 0 ? colors.success : colors.error} 
                />
                <Text style={{ 
                  fontSize: 12, 
                  color: revenueGrowth.growthPercentage > 0 ? colors.success : colors.error,
                  marginLeft: 2,
                }}>
                  {Math.abs(revenueGrowth.growthPercentage).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </SurfaceCard>

        <SurfaceCard variant="elevated" padding="medium" style={{ flex: 1 }}>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={24} color={colors.info} />
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
              {analytics.totalOrders}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle }}>
              {t.totalOrders || 'Total Orders'}
            </Text>
          </View>
        </SurfaceCard>

        <SurfaceCard variant="elevated" padding="medium" style={{ flex: 1 }}>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="calculator-outline" size={24} color={colors.warning} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.xs }}>
              {formatPrice(analytics.averageOrderValue)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle, textAlign: 'center' }}>
              {t.averageOrder || 'Avg Order'}
            </Text>
          </View>
        </SurfaceCard>
      </View>
    </View>
  );

  const renderRevenueChart = () => {
    const dailySales = getDailySalesChart(30);
    
    if (dailySales.length === 0) {
      return (
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <Text style={{ color: colors.textSubtle }}>
            {t.noDataAvailable || 'No data available'}
          </Text>
        </View>
      );
    }

    const chartData = {
      labels: dailySales.slice(-7).map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en', { weekday: 'short' });
      }),
      datasets: [{
        data: dailySales.slice(-7).map(item => item.revenue / 100),
        color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: radius.md,
        }}
      />
    );
  };

  const renderTopItems = () => (
    <SurfaceCard variant="elevated" padding="medium" style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Ionicons name="trophy-outline" size={20} color={colors.warning} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
          {t.topSellingItems || 'Top Selling Items'}
        </Text>
      </View>
      
      {topItems.length === 0 ? (
        <Text style={{ color: colors.textSubtle, textAlign: 'center', padding: spacing.md }}>
          {t.noItemsSold || 'No items sold in this period'}
        </Text>
      ) : (
        topItems.map((item, index) => (
          <View key={item.item.id} style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingVertical: spacing.sm,
            borderBottomWidth: index < topItems.length - 1 ? 1 : 0,
            borderBottomColor: colors.borderLight,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                {item.item.name}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSubtle }}>
                {item.quantity} {t.sold || 'sold'}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
              {formatPrice(item.revenue)}
            </Text>
          </View>
        ))
      )}
    </SurfaceCard>
  );

  const renderCategoryChart = () => {
    if (categoryPerformance.length === 0) {
      return (
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <Text style={{ color: colors.textSubtle }}>
            {t.noCategoryData || 'No category data available'}
          </Text>
        </View>
      );
    }

    const pieData = categoryPerformance.slice(0, 5).map((category, index) => ({
      name: category.categoryName,
      population: category.revenue / 100,
      color: [colors.primary, colors.secondary, colors.accent, colors.info, colors.success][index % 5],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));

    return (
      <PieChart
        data={pieData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 0]}
      />
    );
  };

  const renderPeakHoursChart = () => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourData = peakHours.find(p => p.hour === hour);
      return hourData ? hourData.orders : 0;
    });

    const chartData = {
      labels: ['6', '9', '12', '15', '18', '21', '24'],
      datasets: [{
        data: [6, 9, 12, 15, 18, 21, 24].map(hour => hourlyData[hour] || 0),
      }],
    };

    return (
      <BarChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        yAxisLabel=""
        yAxisSuffix=""
        style={{
          marginVertical: 8,
          borderRadius: radius.md,
        }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* KPI Cards */}
        {renderKPICards()}

        {/* Chart Section */}
        <SurfaceCard variant="elevated" padding="medium" style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Ionicons name="analytics-outline" size={20} color={colors.primary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
              {t.salesChart || 'Sales Chart'}
            </Text>
          </View>

          {/* Chart Type Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row' }}>
              {[
                { key: 'revenue', label: t.revenue || 'Revenue', icon: 'cash-outline' },
                { key: 'orders', label: t.orders || 'Orders', icon: 'receipt-outline' },
                { key: 'items', label: t.categories || 'Categories', icon: 'pie-chart-outline' },
                { key: 'tables', label: t.peakHours || 'Peak Hours', icon: 'bar-chart-outline' },
              ].map((chart) => (
                <TouchableOpacity
                  key={chart.key}
                  onPress={() => setSelectedChart(chart.key as ChartType)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    marginRight: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: selectedChart === chart.key ? colors.primary : colors.surfaceAlt,
                  }}
                >
                  <Ionicons 
                    name={chart.icon as any} 
                    size={16} 
                    color={selectedChart === chart.key ? colors.primaryContrast : colors.text} 
                  />
                  <Text style={{
                    color: selectedChart === chart.key ? colors.primaryContrast : colors.text,
                    fontWeight: selectedChart === chart.key ? '600' : '400',
                    fontSize: 14,
                    marginLeft: spacing.xs,
                  }}>
                    {chart.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Chart Display */}
          {selectedChart === 'revenue' && renderRevenueChart()}
          {selectedChart === 'items' && renderCategoryChart()}
          {selectedChart === 'tables' && renderPeakHoursChart()}
        </SurfaceCard>

        {/* Top Selling Items */}
        {renderTopItems()}

        {/* Export Button */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}>
          <PrimaryButton
            title={t.exportReport || 'Export Report'}
            icon="download-outline"
            onPress={handleExportReport}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
