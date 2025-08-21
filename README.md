# 🍽️ Orderia - Restaurant Management System

**Orderia** is a comprehensive mobile management system developed for modern restaurants. Built with React Native, Expo, and TypeScript, this app allows restaurant managers to easily handle daily operations.

## 📱 Features

### 🏪 Table Management

* **Hall-Based Organization**: Split your restaurant into different halls and create separate table layouts for each
* **Dynamic Table Status**: Track table availability (open/closed) in real-time
* **Visual Table Map**: Manage tables visually with a grid layout per hall
* **Table Labeling**: Assign custom names or numbers to each table
* **Capacity Management**: Define customer capacity per table

### 🍕 Menu Management

* **Category-Based Editing**: Organize dishes into categories for a structured menu
* **Dynamic Pricing**: Update product prices easily
* **Stock Tracking**: Manage availability of items (active/inactive)
* **Detailed Product Info**: Description, price, and category for each item
* **Quick Search & Filtering**: Filter products by category

### 📊 Order Tracking

* **Real-Time Order Management**: Track open table orders instantly
* **Order Status Tracking**: Pending, preparing, ready, delivered
* **Detailed Order History**: Timestamped records of all orders
* **Table-Based Billing**: Keep and calculate bills per table

### 📈 Reporting & Analytics

* **Daily Sales Reports**: Detailed daily sales data
* **Category-Based Analysis**: Analyze sales per category
* **Date Range Reports**: Generate reports for any selected timeframe
* **Graphical Visualization**: View sales data in chart format

## 🎨 Design & User Experience

### Color Palette

#### Light Mode

* **Primary**: `#2563EB` – Trustworthy blue
* **Accent**: `#DC2626` – Attention-grabbing red
* **Background**: `#F8FAFC` – Clean white
* **Surface**: `#FFFFFF` – Pure white
* **Alt Surface**: `#F1F5F9` – Light gray
* **Border**: `#E2E8F0` – Soft gray
* **Text**: `#1E293B` – Dark text
* **Secondary Text**: `#64748B` – Light gray text

#### Dark Mode

* **Primary**: `#3B82F6` – Bright blue
* **Accent**: `#EF4444` – Vivid red
* **Background**: `#0F172A` – Deep dark tone
* **Surface**: `#1E293B` – Dark gray surface
* **Alt Surface**: `#334155` – Medium gray
* **Border**: `#475569` – Dark border
* **Text**: `#F1F5F9` – Light text
* **Secondary Text**: `#94A3B8` – Gray text

### Status Colors

* **Pending**: `#F59E0B` (Amber) – Yellow/Orange
* **Preparing**: `#3B82F6` (Blue)
* **Ready**: `#10B981` (Emerald) – Green
* **Delivered**: `#6B7280` (Gray)

### Typography

* **Headings**: System font, weight 600–700
* **Body Text**: System font, weight 400
* **Subtext**: System font, weight 300
* **Button Text**: System font, weight 500

## 🧩 Components

### PrimaryButton

Main button component with 3 variants:

* **Primary**: Blue background for main actions
* **Secondary**: Transparent for secondary actions
* **Outline**: Border with transparent background

Features:

* Loading & Disabled states
* Sizes: small, medium, large
* Full-width option
* Customizable colors

```tsx
<PrimaryButton
  title="Place Order"
  variant="primary"
  size="medium"
  loading={false}
  onPress={handleOrder}
/>
```

### SurfaceCard

Reusable card component:

* **Default**: Standard look
* **Elevated**: With shadow
* **Outlined**: Border only

### StatusBadge

Badge for order status:

* Auto-coloring by status
* Optional icons
* Three size options

## 🗄️ State Management

Uses **Zustand** for modular state management:

* **MenuStore** → categories, items, add/update/delete functions
* **LayoutStore** → halls, tables, add/update/delete functions
* **OrderStore** → open orders, create/update/remove lines, totals
* **HistoryStore** → daily sales, completed orders, analytics

## 🏗️ Project Structure

```
src/
├── components/   # Reusable UI
├── screens/      # App screens
├── stores/       # State stores
├── contexts/     # Contexts
├── navigation/   # Navigation
├── constants/    # Constants & helpers
├── types/        # TS types
└── utils/        # Utilities
```

## 🚀 Tech Stack

* **React Native 0.79.5**
* **Expo \~53.0.0**
* **TypeScript**
* **React 18.3.1**
* **Zustand 5.0.2**
* **AsyncStorage**
* **NativeWind**
* **React Navigation**
* **Ionicons**

## 📋 Installation

### Requirements

* Node.js 18+
* npm or yarn
* Expo CLI
* Android Studio / Xcode

### Steps

```bash
git clone [repo-url]
cd Orderia
npm install
npx expo start
```

Press:

* `a` for Android
* `i` for iOS
* `w` for Web

## 🔧 Configuration

* **Metro** with path alias
* **Babel** with nativewind
* **TSConfig** with `@/*` aliases

## 🎯 Usage Guide

1. **Initial Setup** → Sample data auto-loaded
2. **Table Management** → Add halls/tables, track status
3. **Orders** → Select table, add products, confirm
4. **Menu** → Manage categories & items
5. **Reports** → Daily/weekly/monthly sales

## 🔄 Solved Issues

* Path alias issues fixed
* BOM characters removed
* Metro vs Babel resolver conflicts resolved

## 🔮 Roadmap

* 🔐 User management & roles
* 💳 Payment integration
* 📱 QR menu for customers
* 🖨️ Receipt printing
* ☁️ Cloud sync
* 📊 Advanced analytics
* 🔔 Push notifications
* 🎨 Theme customization

## 🤝 Contribution

1. Fork
2. Create feature branch
3. Commit changes
4. Push
5. Open PR

## 📄 License

Licensed under MIT. See `LICENSE` for details.

## 📞 Support

* **Email**: [support@orderia.app](mailto:support@orderia.app)
* **Bugs**: [GitHub Issues](https://github.com/orderia/orderia/issues)
* **Discussions**: [GitHub Discussions](https://github.com/orderia/orderia/discussions)

## 🙏 Acknowledgements

Thanks to everyone involved:

* React Native Community
* Expo Team
* Zustand Maintainers
* All Contributors

---

**🍽️ Digitalize your restaurant management with Orderia!**

*Made with ❤️ by Melih Hyusein from OMNI Tech Solutions*

---

