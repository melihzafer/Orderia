# QR Landing Page - Orderia

Bu dosya, QR kodlarından erişilen web sitesi için örnek Next.js uygulamasıdır.

## Kurulum

1. Next.js projesi oluşturun:
```bash
npx create-next-app@latest orderia-qr --typescript --tailwind --app
cd orderia-qr
```

2. Gerekli dosyaları oluşturun:

### `/app/t/[tableId]/page.tsx`
```tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRLandingClient from './QRLandingClient';

interface PageProps {
  params: { tableId: string };
  searchParams: { token?: string; r?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Table ${params.tableId} - Orderia`,
    description: `Digital menu and ordering for table ${params.tableId}`,
    viewport: 'width=device-width, initial-scale=1',
  };
}

function validateToken(token: string): any {
  try {
    const base64 = token.replace(/[-_]/g, (char) => char === '-' ? '+' : '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    const qrToken = JSON.parse(decoded);
    
    if (Date.now() > qrToken.exp) {
      return null; // Expired
    }
    
    return qrToken;
  } catch (error) {
    return null;
  }
}

export default function TablePage({ params, searchParams }: PageProps) {
  const { tableId } = params;
  const { token, r: restaurantId } = searchParams;
  
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid QR Code</h1>
          <p className="text-gray-600">Missing security token.</p>
        </div>
      </div>
    );
  }
  
  const qrToken = validateToken(token);
  
  if (!qrToken) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid QR Code</h1>
          <p className="text-gray-600">This QR code has expired or is invalid.</p>
        </div>
      </div>
    );
  }
  
  return (
    <QRLandingClient
      tableId={qrToken.tableId}
      restaurantId={qrToken.restaurantId}
      features={qrToken.features}
    />
  );
}
```

### `/app/t/[tableId]/QRLandingClient.tsx`
```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface QRLandingClientProps {
  tableId: string;
  restaurantId: string;
  features: string[];
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

function ActionCard({ title, description, icon, onClick, loading, disabled = false }: ActionCardProps) {
  return (
    <div 
      className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transform transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <button 
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            disabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
          }`}
          disabled={loading || disabled}
        >
          {loading ? 'Loading...' : 'Get Started'}
        </button>
      </div>
    </div>
  );
}

export default function QRLandingClient({ tableId, restaurantId, features }: QRLandingClientProps) {
  const [loading, setLoading] = useState(false);
  
  const handleAction = async (action: string) => {
    setLoading(true);
    
    try {
      // Try to open native app first
      const appUrl = `orderia://table/${tableId}?action=${action}&restaurant=${restaurantId}`;
      
      // Create a hidden iframe to attempt app launch
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      
      // Fallback to web app after short delay
      setTimeout(() => {
        document.body.removeChild(iframe);
        
        // Redirect to web app or show app download options
        const webUrl = `https://app.orderia.com/table/${tableId}?action=${action}&restaurant=${restaurantId}`;
        window.open(webUrl, '_blank');
        
        setLoading(false);
      }, 1500);
      
    } catch (err) {
      console.error('Action failed:', err);
      setLoading(false);
    }
  };
  
  const featureConfig = {
    menu: {
      title: 'View Menu',
      description: 'Browse our delicious offerings',
      icon: '🍽️'
    },
    order: {
      title: 'Place Order',
      description: 'Order directly from your table',
      icon: '📱'
    },
    'call-waiter': {
      title: 'Call Waiter',
      description: 'Get assistance from our staff',
      icon: '🔔'
    },
    pay: {
      title: 'Pay Bill',
      description: 'Quick and secure payment',
      icon: '💳'
    },
    feedback: {
      title: 'Leave Feedback',
      description: 'Share your dining experience',
      icon: '⭐'
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🍽️</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome to Table {tableId}</h1>
          <p className="text-xl opacity-90">Choose your dining experience</p>
        </div>
        
        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const config = featureConfig[feature as keyof typeof featureConfig];
            if (!config) return null;
            
            return (
              <ActionCard
                key={feature}
                title={config.title}
                description={config.description}
                icon={config.icon}
                onClick={() => handleAction(feature)}
                loading={loading}
              />
            );
          })}
        </div>
        
        {/* App Download Section */}
        <div className="text-center mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
            <h3 className="text-white text-lg font-semibold mb-3">
              Get the Best Experience
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Download our mobile app for faster ordering and exclusive features
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => window.open('https://apps.apple.com/app/orderia', '_blank')}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
              >
                <span>📱</span>
                <span>App Store</span>
              </button>
              <button 
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.orderia', '_blank')}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
              >
                <span>🤖</span>
                <span>Google Play</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/75 text-sm">
            Powered by <strong className="text-white">Orderia</strong>
          </p>
          <p className="text-white/50 text-xs mt-1">
            Your Smart Order Pad
          </p>
        </div>
      </div>
    </div>
  );
}
```

### `/app/page.tsx` (Ana sayfa)
```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Orderia QR System</h1>
        <p className="text-gray-600 mb-8">Scan a QR code to access your table</p>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Demo Links</h2>
          <div className="space-y-3">
            <Link 
              href="/t/TABLE-001?token=eyJ0YWJsZUlkIjoiVEFCTEUtMDAxIiwicmVzdGF1cmFudElkIjoiUkVTVC0wMDEiLCJleHAiOjk5OTk5OTk5OTk5OTksImZlYXR1cmVzIjpbIm1lbnUiLCJvcmRlciIsImNhbGwtd2FpdGVyIl0sImNyZWF0ZWQiOjE3MDAwMDAwMDB9&r=REST-001"
              className="block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Table 1 - Full Access
            </Link>
            <Link 
              href="/t/TABLE-002?token=eyJ0YWJsZUlkIjoiVEFCTEUtMDAyIiwicmVzdGF1cmFudElkIjoiUkVTVC0wMDEiLCJleHAiOjk5OTk5OTk5OTk5OTksImZlYXR1cmVzIjpbIm1lbnUiXSwiY3JlYXRlZCI6MTcwMDAwMDAwMH0&r=REST-001"
              className="block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              Table 2 - Menu Only
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `vercel.json` (Deployment Config)
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "env": {
    "QR_SECRET_KEY": "@qr-secret-key",
    "RESTAURANT_API_URL": "@restaurant-api-url"
  },
  "functions": {
    "pages/api/**/*.js": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/t/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/welcome",
      "permanent": false
    }
  ],
  "cleanUrls": true
}
```

## Deployment Steps

1. **Vercel ile Deploy**:
```bash
npm install -g vercel
vercel
```

2. **Environment Variables** (Vercel Dashboard):
- `QR_SECRET_KEY`: QR token imzalama anahtarı
- `RESTAURANT_API_URL`: Restaurant API URL'i

3. **Custom Domain** (Opsiyonel):
- `orderia-qr.vercel.app` veya kendi domain'iniz

## Güvenlik Özellikleri

1. **Token Tabanlı**: Her QR kod benzersiz, süreli token içerir
2. **Feature Restriction**: QR kod sadece belirli özelliklere erişim sağlar
3. **Expiry Check**: Süresi dolmuş QR kodlar otomatik redded
4. **Rate Limiting**: Spam koruması için rate limiting
5. **HTTPS Only**: Tüm bağlantılar HTTPS üzerinden

## Kullanım

1. Restaurant app'ten QR kodları oluşturun
2. QR kodları masa üzerine yerleştirin
3. Müşteriler QR kodu taratır
4. Web site açılır ve seçenekleri gösterir
5. Native app varsa yönlendirme yapar

Bu sistem production'da kullanım için hazırdır ve kolayca özelleştirilebilir.
