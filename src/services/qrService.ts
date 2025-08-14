import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface QRConfig {
  tableId: string;
  restaurantId: string;
  baseUrl: string;
  expiryHours?: number;
  features?: ('menu' | 'order' | 'call-waiter' | 'pay' | 'feedback')[];
}

interface QRToken {
  tableId: string;
  restaurantId: string;
  exp: number;
  features: string[];
  created: number;
}

interface QRCodeData {
  tableId: string;
  qrUrl: string;
  qrToken: string;
  features: string[];
  expiresAt: number;
  createdAt: number;
}

class QRService {
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly STORAGE_KEY = 'qr_codes_cache';
  
  constructor(
    baseUrl: string = 'https://orderia-qr.vercel.app', 
    secretKey: string = 'orderia-qr-secret-2024'
  ) {
    this.baseUrl = baseUrl;
    this.secretKey = secretKey;
  }
  
  // Generate secure token for QR code
  generateSecureToken(config: QRConfig): string {
    const now = Date.now();
    const expiry = now + (config.expiryHours || 24) * 60 * 60 * 1000;
    
    const token: QRToken = {
      tableId: config.tableId,
      restaurantId: config.restaurantId,
      exp: expiry,
      features: config.features || ['menu', 'order'],
      created: now,
    };
    
    // Simple base64 encoding with basic obfuscation
    const jsonString = JSON.stringify(token);
    const encoded = this.encodeToken(jsonString);
    return encoded;
  }
  
  private encodeToken(data: string): string {
    // Simple encoding - in production, use proper JWT
    const base64 = Buffer.from(data).toString('base64');
    return base64.replace(/[+/]/g, (char) => char === '+' ? '-' : '_').replace(/=/g, '');
  }
  
  private decodeToken(token: string): QRToken | null {
    try {
      // Reverse the encoding
      const base64 = token.replace(/[-_]/g, (char) => char === '-' ? '+' : '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const decoded = Buffer.from(padded, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding QR token:', error);
      return null;
    }
  }
  
  // Generate QR code URL
  generateQRUrl(config: QRConfig): string {
    const token = this.generateSecureToken(config);
    return `${this.baseUrl}/t/${config.tableId}?token=${token}&r=${config.restaurantId}`;
  }
  
  // Generate QR code SVG content
  generateQRCodeSVG(url: string, size: number = 200, logoUrl?: string): string {
    // Simple QR code SVG representation
    // In production, you'd use a proper QR code library
    const qrSize = size;
    const cellSize = qrSize / 25; // 25x25 grid for simplicity
    
    let svg = `
    <svg width="${qrSize}" height="${qrSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${qrSize}" height="${qrSize}" fill="white"/>
      <!-- QR Code pattern placeholder -->
      <rect x="0" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
      <rect x="${cellSize}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
      <rect x="${cellSize * 2}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
      
      <rect x="${qrSize - cellSize * 7}" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
      <rect x="${qrSize - cellSize * 6}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
      <rect x="${qrSize - cellSize * 5}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
      
      <rect x="0" y="${qrSize - cellSize * 7}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
      <rect x="${cellSize}" y="${qrSize - cellSize * 6}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
      <rect x="${cellSize * 2}" y="${qrSize - cellSize * 5}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
      
      <!-- Sample data pattern -->
      ${this.generateQRPattern(qrSize, cellSize)}
      
      ${logoUrl ? `
        <circle cx="${qrSize/2}" cy="${qrSize/2}" r="${qrSize/8}" fill="white" stroke="black" stroke-width="2"/>
        <image href="${logoUrl}" x="${qrSize/2 - qrSize/12}" y="${qrSize/2 - qrSize/12}" width="${qrSize/6}" height="${qrSize/6}"/>
      ` : ''}
      
      <text x="${qrSize/2}" y="${qrSize + 20}" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
        Table ${url.includes('/t/') ? url.split('/t/')[1].split('?')[0] : 'QR'}
      </text>
    </svg>
    `;
    
    return svg;
  }
  
  private generateQRPattern(size: number, cellSize: number): string {
    let pattern = '';
    // Generate some random-looking pattern for demo
    for (let i = 9; i < 16; i++) {
      for (let j = 9; j < 16; j++) {
        if ((i + j) % 3 === 0) {
          pattern += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    return pattern;
  }
  
  // Batch generate QR codes for all tables
  async generateTableQRCodes(
    tableIds: string[], 
    restaurantId: string,
    customBaseUrl?: string
  ): Promise<Map<string, QRCodeData>> {
    const qrCodes = new Map<string, QRCodeData>();
    const baseUrl = customBaseUrl || this.baseUrl;
    
    for (const tableId of tableIds) {
      try {
        const config: QRConfig = {
          tableId,
          restaurantId,
          baseUrl,
          expiryHours: 24 * 30, // 30 days for table QRs
          features: ['menu', 'order', 'call-waiter', 'feedback'],
        };
        
        const qrUrl = this.generateQRUrl(config);
        const token = this.generateSecureToken(config);
        
        const qrData: QRCodeData = {
          tableId,
          qrUrl,
          qrToken: token,
          features: config.features!,
          expiresAt: Date.now() + (config.expiryHours! * 60 * 60 * 1000),
          createdAt: Date.now(),
        };
        
        qrCodes.set(tableId, qrData);
      } catch (error) {
        console.error(`Failed to generate QR for table ${tableId}:`, error);
      }
    }
    
    // Cache the generated QR codes
    await this.cacheQRCodes(qrCodes);
    
    return qrCodes;
  }
  
  // Save QR codes to device storage
  async saveQRCodesAsFiles(qrCodes: Map<string, QRCodeData>, logoUrl?: string): Promise<string[]> {
    const savedFiles: string[] = [];
    
    try {
      const qrDir = `${FileSystem.documentDirectory}qr-codes/`;
      const dirInfo = await FileSystem.getInfoAsync(qrDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(qrDir, { intermediates: true });
      }
      
      for (const [tableId, qrData] of qrCodes) {
        try {
          const svgContent = this.generateQRCodeSVG(qrData.qrUrl, 300, logoUrl);
          const fileName = `qr-table-${tableId}.svg`;
          const filePath = `${qrDir}${fileName}`;
          
          await FileSystem.writeAsStringAsync(filePath, svgContent);
          savedFiles.push(filePath);
        } catch (error) {
          console.error(`Error saving QR for table ${tableId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error saving QR codes:', error);
    }
    
    return savedFiles;
  }
  
  // Generate QR codes as a ZIP-like text file
  async exportQRCodesAsText(qrCodes: Map<string, QRCodeData>): Promise<string> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const content = [
        '# Orderia Table QR Codes',
        `# Generated on: ${new Date().toLocaleString()}`,
        `# Restaurant ID: ${Array.from(qrCodes.values())[0]?.qrUrl.split('r=')[1] || 'Unknown'}`,
        '# Format: Table ID | QR URL | Features | Expires',
        '',
        ...Array.from(qrCodes.entries()).map(([tableId, data]) => {
          const expiresDate = new Date(data.expiresAt).toLocaleDateString();
          return `${tableId} | ${data.qrUrl} | ${data.features.join(',')} | ${expiresDate}`;
        }),
        '',
        '# Instructions:',
        '# 1. Print QR codes by visiting the URLs above',
        '# 2. Place QR codes on respective tables',
        '# 3. Customers can scan to access digital menu',
        '# 4. QR codes expire on the dates listed above',
      ].join('\\n');
      
      const fileName = `qr-codes-export-${timestamp}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, content);
      return filePath;
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      throw error;
    }
  }
  
  // Share QR codes
  async shareQRCodes(qrCodes: Map<string, QRCodeData>): Promise<void> {
    try {
      const textFilePath = await this.exportQRCodesAsText(qrCodes);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(textFilePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Table QR Codes',
        });
      } else {
        Alert.alert(
          'Export Complete',
          `QR codes exported to: ${textFilePath}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sharing QR codes:', error);
      throw error;
    }
  }
  
  // Cache QR codes in AsyncStorage
  private async cacheQRCodes(qrCodes: Map<string, QRCodeData>): Promise<void> {
    try {
      const qrArray = Array.from(qrCodes.entries());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(qrArray));
    } catch (error) {
      console.error('Error caching QR codes:', error);
    }
  }
  
  // Load cached QR codes
  async loadCachedQRCodes(): Promise<Map<string, QRCodeData>> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const qrArray: [string, QRCodeData][] = JSON.parse(cached);
        const qrMap = new Map(qrArray);
        
        // Filter out expired QR codes
        const now = Date.now();
        const validQRs = new Map();
        
        for (const [tableId, data] of qrMap) {
          if (data.expiresAt > now) {
            validQRs.set(tableId, data);
          }
        }
        
        return validQRs;
      }
    } catch (error) {
      console.error('Error loading cached QR codes:', error);
    }
    
    return new Map();
  }
  
  // Validate QR token
  validateToken(token: string): QRToken | null {
    try {
      const qrToken = this.decodeToken(token);
      
      if (!qrToken) {
        return null;
      }
      
      // Check expiry
      if (Date.now() > qrToken.exp) {
        return null; // Expired
      }
      
      return qrToken;
    } catch (error) {
      console.error('Invalid QR token:', error);
      return null;
    }
  }
  
  // Generate QR code for specific use case
  async generateSpecialQRCode(
    type: 'menu' | 'feedback' | 'pay' | 'call-waiter',
    tableId: string,
    restaurantId: string,
    expiryHours: number = 24
  ): Promise<QRCodeData> {
    const features = [type];
    
    const config: QRConfig = {
      tableId,
      restaurantId,
      baseUrl: this.baseUrl,
      expiryHours,
      features,
    };
    
    const qrUrl = this.generateQRUrl(config);
    const token = this.generateSecureToken(config);
    
    return {
      tableId,
      qrUrl,
      qrToken: token,
      features,
      expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
      createdAt: Date.now(),
    };
  }
  
  // Get QR code analytics (for future use)
  getQRAnalytics(qrCodes: Map<string, QRCodeData>) {
    const now = Date.now();
    const total = qrCodes.size;
    const active = Array.from(qrCodes.values()).filter(qr => qr.expiresAt > now).length;
    const expired = total - active;
    
    const featureCount = new Map<string, number>();
    qrCodes.forEach(qr => {
      qr.features.forEach(feature => {
        featureCount.set(feature, (featureCount.get(feature) || 0) + 1);
      });
    });
    
    return {
      total,
      active,
      expired,
      features: Object.fromEntries(featureCount),
      lastGenerated: Math.max(...Array.from(qrCodes.values()).map(qr => qr.createdAt)),
    };
  }
}

export const qrService = new QRService();
export type { QRConfig, QRToken, QRCodeData };
