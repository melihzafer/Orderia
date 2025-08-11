import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useLayoutStore, useMenuStore, useOrderStore } from '../stores';
import { Table, MenuItem, Category } from '../types';

export interface QRMenuSettings {
  enabled: boolean;
  baseUrl: string;
  allowDirectOrdering: boolean;
  showPrices: boolean;
  showDescriptions: boolean;
  customization: {
    primaryColor: string;
    logoUrl?: string;
    restaurantName: string;
    welcomeMessage: string;
  };
}

export interface QRMenuData {
  tableId: string;
  tableNumber: string;
  categories: Category[];
  menuItems: MenuItem[];
  settings: QRMenuSettings;
  timestamp: string;
}

interface QRMenuContextType {
  settings: QRMenuSettings;
  updateSettings: (newSettings: Partial<QRMenuSettings>) => void;
  generateQRCode: (tableId: string) => Promise<string>;
  generateAllQRCodes: () => Promise<{ tableId: string; qrCodeUrl: string }[]>;
  shareQRCode: (tableId: string) => Promise<void>;
  shareAllQRCodes: () => Promise<void>;
  getMenuUrl: (tableId: string) => string;
  exportQRCodesAsPDF: () => Promise<string>;
  getQRMenuData: (tableId: string) => QRMenuData | null;
  validateQRAccess: (tableId: string, sessionId?: string) => boolean;
}

const QRMenuContext = createContext<QRMenuContextType | undefined>(undefined);

const defaultSettings: QRMenuSettings = {
  enabled: true,
  baseUrl: 'https://orderia-menu.app',
  allowDirectOrdering: true,
  showPrices: true,
  showDescriptions: true,
  customization: {
    primaryColor: '#FF6B35',
    restaurantName: 'Orderia Restaurant',
    welcomeMessage: 'Welcome! Scan the QR code to view our menu and place your order.',
  },
};

export function QRMenuProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<QRMenuSettings>(defaultSettings);
  const { tables } = useLayoutStore();
  const { categories, menuItems } = useMenuStore();
  const { addTicketLine } = useOrderStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('@qr_menu_settings');
      if (storedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
      }
    } catch (error) {
      console.error('Error loading QR menu settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<QRMenuSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('@qr_menu_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving QR menu settings:', error);
    }
  };

  const getMenuUrl = (tableId: string): string => {
    const baseUrl = settings.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${baseUrl}/menu/${tableId}?t=${Date.now()}`;
  };

  const generateQRCode = async (tableId: string): Promise<string> => {
    try {
      const menuUrl = getMenuUrl(tableId);
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(menuUrl)}`;
      
      // Download QR code image
      const fileUri = `${FileSystem.documentDirectory}qr_table_${tableId}.png`;
      const downloadResult = await FileSystem.downloadAsync(qrCodeApiUrl, fileUri);
      
      if (downloadResult.status === 200) {
        return downloadResult.uri;
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const generateAllQRCodes = async (): Promise<{ tableId: string; qrCodeUrl: string }[]> => {
    const results: { tableId: string; qrCodeUrl: string }[] = [];
    
    for (const table of tables) {
      try {
        const qrCodeUrl = await generateQRCode(table.id);
        results.push({ tableId: table.id, qrCodeUrl });
      } catch (error) {
        console.error(`Error generating QR code for table ${table.seq}:`, error);
      }
    }
    
    return results;
  };

  const shareQRCode = async (tableId: string): Promise<void> => {
    try {
      const table = tables.find(t => t.id === tableId);
      if (!table) throw new Error('Table not found');

      const qrCodeUri = await generateQRCode(tableId);
      const menuUrl = getMenuUrl(tableId);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(qrCodeUri, {
          mimeType: 'image/png',
          dialogTitle: `QR Code for Table ${table.seq}`,
        });
      } else {
        console.log('Sharing not available');
        // Fallback: copy URL to clipboard or show modal with URL
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      throw error;
    }
  };

  const shareAllQRCodes = async (): Promise<void> => {
    try {
      // Generate PDF with all QR codes
      const pdfUri = await exportQRCodesAsPDF();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'All Table QR Codes',
        });
      }
    } catch (error) {
      console.error('Error sharing all QR codes:', error);
      throw error;
    }
  };

  const exportQRCodesAsPDF = async (): Promise<string> => {
    try {
      // This would require a PDF generation library like react-native-html-to-pdf
      // For now, we'll create a simple HTML file that can be converted to PDF
      
      const qrCodes = await generateAllQRCodes();
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Codes - ${settings.customization.restaurantName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
            .qr-item { text-align: center; page-break-inside: avoid; }
            .qr-item img { width: 200px; height: 200px; }
            .table-info { margin-top: 10px; font-weight: bold; }
            .url { font-size: 12px; color: #666; word-break: break-all; }
            @media print { .qr-grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings.customization.restaurantName}</h1>
            <h2>Table QR Codes</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="qr-grid">
      `;

      for (const { tableId, qrCodeUrl } of qrCodes) {
        const table = tables.find(t => t.id === tableId);
        if (table) {
          htmlContent += `
            <div class="qr-item">
              <img src="${qrCodeUrl}" alt="QR Code for Table ${table.seq}" />
              <div class="table-info">Table ${table.seq}</div>
              <div class="url">${getMenuUrl(tableId)}</div>
            </div>
          `;
        }
      }

      htmlContent += `
          </div>
        </body>
        </html>
      `;

      const htmlUri = `${FileSystem.documentDirectory}qr_codes.html`;
      await FileSystem.writeAsStringAsync(htmlUri, htmlContent);
      
      return htmlUri;
    } catch (error) {
      console.error('Error exporting QR codes as PDF:', error);
      throw error;
    }
  };

  const getQRMenuData = (tableId: string): QRMenuData | null => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !settings.enabled) return null;

    // Filter menu items to only show active ones
    const activeMenuItems = menuItems.filter(item => item.isActive);
    
    // Filter categories that have at least one active menu item
    const activeCategories = categories.filter(category => 
      activeMenuItems.some(item => item.categoryId === category.id)
    );

    return {
      tableId,
      tableNumber: table.seq.toString(),
      categories: activeCategories,
      menuItems: activeMenuItems,
      settings,
      timestamp: new Date().toISOString(),
    };
  };

  const validateQRAccess = (tableId: string, sessionId?: string): boolean => {
    if (!settings.enabled) return false;
    
    const table = tables.find(t => t.id === tableId);
    if (!table) return false;

    // Add additional validation logic here if needed
    // For example, check if table is available, session is valid, etc.
    
    return true;
  };

  const value: QRMenuContextType = {
    settings,
    updateSettings,
    generateQRCode,
    generateAllQRCodes,
    shareQRCode,
    shareAllQRCodes,
    getMenuUrl,
    exportQRCodesAsPDF,
    getQRMenuData,
    validateQRAccess,
  };

  return (
    <QRMenuContext.Provider value={value}>
      {children}
    </QRMenuContext.Provider>
  );
}

export function useQRMenu() {
  const context = useContext(QRMenuContext);
  if (context === undefined) {
    throw new Error('useQRMenu must be used within a QRMenuProvider');
  }
  return context;
}
