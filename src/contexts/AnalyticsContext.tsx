import React, { createContext, useContext, useMemo } from 'react';
import { useHistoryStore, useOrderStore, useMenuStore } from '../stores';
import { DayHistory, MenuItem, TicketLine } from '../types';

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: Array<{
    item: MenuItem;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  weeklySales: Array<{
    week: string;
    revenue: number;
    orders: number;
  }>;
  monthlySales: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  tableAnalytics: Array<{
    tableId: string;
    turnoverRate: number;
    averageOrderValue: number;
    totalRevenue: number;
  }>;
  categoryPerformance: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    quantity: number;
    percentage: number;
  }>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AnalyticsContextType {
  getSalesAnalytics: (dateRange?: DateRange) => SalesAnalytics;
  getTopSellingItems: (limit?: number, dateRange?: DateRange) => Array<{
    item: MenuItem;
    quantity: number;
    revenue: number;
  }>;
  getPeakHours: (dateRange?: DateRange) => Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  getTableTurnoverAnalysis: (dateRange?: DateRange) => Array<{
    tableId: string;
    turnoverRate: number;
    averageOrderValue: number;
    totalRevenue: number;
  }>;
  getCategoryPerformance: (dateRange?: DateRange) => Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    quantity: number;
    percentage: number;
  }>;
  getDailySalesChart: (days?: number) => Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  getWeeklySalesChart: (weeks?: number) => Array<{
    week: string;
    revenue: number;
    orders: number;
  }>;
  getMonthlySalesChart: (months?: number) => Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  getRevenueGrowth: (dateRange?: DateRange) => {
    currentPeriod: number;
    previousPeriod: number;
    growthPercentage: number;
  };
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { dailyHistory } = useHistoryStore();
  const { menuItems, categories } = useMenuStore();

  const calculateTicketTotal = (ticket: any): number => {
    return ticket.lines.reduce((sum: number, line: any) => sum + (line.quantity * line.priceSnapshot), 0);
  };

  const filterDataByDateRange = (data: DayHistory[], dateRange?: DateRange): DayHistory[] => {
    if (!dateRange) return data;

    return data.filter(day => {
      const dayDate = new Date(day.id); // id is in YYYY-MM-DD format
      return dayDate >= dateRange.startDate && dayDate <= dateRange.endDate;
    });
  };

  const getSalesAnalytics = (dateRange?: DateRange): SalesAnalytics => {
    const historyArray = Object.values(dailyHistory);
    const filteredData = filterDataByDateRange(historyArray, dateRange);
    
    let totalRevenue = 0;
    let totalOrders = 0;
    const itemSales = new Map<string, { quantity: number; revenue: number }>();
    const hourlyData = new Map<number, { orders: number; revenue: number }>();
    const tableData = new Map<string, { orders: number; revenue: number; sessions: number }>();
    const categoryData = new Map<string, { quantity: number; revenue: number }>();

    filteredData.forEach(day => {
      day.tickets.forEach(ticket => {
        const ticketTotal = calculateTicketTotal(ticket);
        totalRevenue += ticketTotal;
        totalOrders += 1;

        // Hour analysis
        const hour = new Date(ticket.createdAt).getHours();
        const hourData = hourlyData.get(hour) || { orders: 0, revenue: 0 };
        hourlyData.set(hour, {
          orders: hourData.orders + 1,
          revenue: hourData.revenue + ticketTotal,
        });

        // Table analysis
        const tableDataEntry = tableData.get(ticket.tableId) || { orders: 0, revenue: 0, sessions: 0 };
        tableData.set(ticket.tableId, {
          orders: tableDataEntry.orders + 1,
          revenue: tableDataEntry.revenue + ticketTotal,
          sessions: tableDataEntry.sessions + 1,
        });

        // Item and category analysis
        ticket.lines.forEach(line => {
          const item = menuItems.find(m => m.id === line.menuItemId);
          if (item) {
            const itemRevenue = line.quantity * line.priceSnapshot;
            
            // Item sales
            const itemData = itemSales.get(item.id) || { quantity: 0, revenue: 0 };
            itemSales.set(item.id, {
              quantity: itemData.quantity + line.quantity,
              revenue: itemData.revenue + itemRevenue,
            });

            // Category sales
            const categoryDataEntry = categoryData.get(item.categoryId) || { quantity: 0, revenue: 0 };
            categoryData.set(item.categoryId, {
              quantity: categoryDataEntry.quantity + line.quantity,
              revenue: categoryDataEntry.revenue + itemRevenue,
            });
          }
        });
      });
    });

    // Top selling items
    const topSellingItems = Array.from(itemSales.entries())
      .map(([itemId, data]) => ({
        item: menuItems.find(m => m.id === itemId)!,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .filter(item => item.item)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Peak hours
    const peakHours = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => b.orders - a.orders);

    // Table analytics
    const tableAnalytics = Array.from(tableData.entries())
      .map(([tableId, data]) => ({
        tableId,
        turnoverRate: data.sessions,
        averageOrderValue: data.revenue / data.orders,
        totalRevenue: data.revenue,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Category performance
    const categoryPerformance = Array.from(categoryData.entries())
      .map(([categoryId, data]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
          categoryId,
          categoryName: category?.name || 'Unknown',
          revenue: data.revenue,
          quantity: data.quantity,
          percentage: (data.revenue / totalRevenue) * 100,
        };
      })
      .filter(cat => cat.categoryName !== 'Unknown')
      .sort((a, b) => b.revenue - a.revenue);

    // Daily sales
    const dailySales = filteredData.map(day => ({
      date: day.id, // id is in YYYY-MM-DD format
      revenue: day.tickets.reduce((sum, ticket) => sum + calculateTicketTotal(ticket), 0),
      orders: day.tickets.length,
    }));

    // Weekly sales
    const weeklySales: Array<{ week: string; revenue: number; orders: number }> = [];
    const weeklyMap = new Map<string, { revenue: number; orders: number }>();

    filteredData.forEach(day => {
      const date = new Date(day.id); // id is in YYYY-MM-DD format
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      const weekData = weeklyMap.get(weekKey) || { revenue: 0, orders: 0 };
      const dayRevenue = day.tickets.reduce((sum, ticket) => sum + calculateTicketTotal(ticket), 0);
      
      weeklyMap.set(weekKey, {
        revenue: weekData.revenue + dayRevenue,
        orders: weekData.orders + day.tickets.length,
      });
    });

    weeklyMap.forEach((data, week) => {
      weeklySales.push({ week, ...data });
    });

    // Monthly sales
    const monthlySales: Array<{ month: string; revenue: number; orders: number }> = [];
    const monthlyMap = new Map<string, { revenue: number; orders: number }>();

    filteredData.forEach(day => {
      const date = new Date(day.id); // id is in YYYY-MM-DD format
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const monthData = monthlyMap.get(monthKey) || { revenue: 0, orders: 0 };
      const dayRevenue = day.tickets.reduce((sum, ticket) => sum + calculateTicketTotal(ticket), 0);
      
      monthlyMap.set(monthKey, {
        revenue: monthData.revenue + dayRevenue,
        orders: monthData.orders + day.tickets.length,
      });
    });

    monthlyMap.forEach((data, month) => {
      monthlySales.push({ month, ...data });
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      topSellingItems,
      dailySales,
      weeklySales,
      monthlySales,
      peakHours,
      tableAnalytics,
      categoryPerformance,
    };
  };

  const getTopSellingItems = (limit = 10, dateRange?: DateRange) => {
    const analytics = getSalesAnalytics(dateRange);
    return analytics.topSellingItems.slice(0, limit);
  };

  const getPeakHours = (dateRange?: DateRange) => {
    const analytics = getSalesAnalytics(dateRange);
    return analytics.peakHours;
  };

  const getTableTurnoverAnalysis = (dateRange?: DateRange) => {
    const analytics = getSalesAnalytics(dateRange);
    return analytics.tableAnalytics;
  };

  const getCategoryPerformance = (dateRange?: DateRange) => {
    const analytics = getSalesAnalytics(dateRange);
    return analytics.categoryPerformance;
  };

  const getDailySalesChart = (days = 30) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const analytics = getSalesAnalytics({ startDate, endDate });
    return analytics.dailySales.slice(-days);
  };

  const getWeeklySalesChart = (weeks = 12) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (weeks * 7));

    const analytics = getSalesAnalytics({ startDate, endDate });
    return analytics.weeklySales.slice(-weeks);
  };

  const getMonthlySalesChart = (months = 12) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    const analytics = getSalesAnalytics({ startDate, endDate });
    return analytics.monthlySales.slice(-months);
  };

  const getRevenueGrowth = (dateRange?: DateRange) => {
    if (!dateRange) {
      // Default to current month vs previous month
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      const currentPeriod = getSalesAnalytics({ 
        startDate: currentMonthStart, 
        endDate: currentMonthEnd 
      }).totalRevenue;
      
      const previousPeriod = getSalesAnalytics({ 
        startDate: previousMonthStart, 
        endDate: previousMonthEnd 
      }).totalRevenue;

      const growthPercentage = previousPeriod > 0 
        ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 
        : 0;

      return { currentPeriod, previousPeriod, growthPercentage };
    }

    // For custom date range, compare with previous period of same length
    const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousStartDate = new Date(dateRange.startDate.getTime() - periodLength);
    const previousEndDate = new Date(dateRange.endDate.getTime() - periodLength);

    const currentPeriod = getSalesAnalytics(dateRange).totalRevenue;
    const previousPeriod = getSalesAnalytics({ 
      startDate: previousStartDate, 
      endDate: previousEndDate 
    }).totalRevenue;

    const growthPercentage = previousPeriod > 0 
      ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 
      : 0;

    return { currentPeriod, previousPeriod, growthPercentage };
  };

  const value: AnalyticsContextType = {
    getSalesAnalytics,
    getTopSellingItems,
    getPeakHours,
    getTableTurnoverAnalysis,
    getCategoryPerformance,
    getDailySalesChart,
    getWeeklySalesChart,
    getMonthlySalesChart,
    getRevenueGrowth,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
