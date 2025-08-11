import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useAnalytics, DateRange } from '../contexts/AnalyticsContext';
import { SurfaceCard, PrimaryButton } from '../components';
import { brand, radius, spacing } from '../constants/branding';

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
type ChartType = 'revenue' | 'orders' | 'items' | 'tables';

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
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
            onPress={() => {
              // Implement export functionality
              console.log('Export report');
            }}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
