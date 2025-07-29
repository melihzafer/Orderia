import { useMenuStore, useLayoutStore } from '../stores';

export function initializeSampleData() {
  const menuStore = useMenuStore.getState();
  const layoutStore = useLayoutStore.getState();

  // Check if data already exists
  if (menuStore.categories.length > 0 || layoutStore.halls.length > 0) {
    return;
  }

  // Add sample categories
  const beveragesCategory = menuStore.addCategory({ name: 'İçecekler', order: 0 });
  const mainsCategory = menuStore.addCategory({ name: 'Ana Yemekler', order: 1 });
  const dessertsCategory = menuStore.addCategory({ name: 'Tatlılar', order: 2 });

  // Add sample menu items
  // Beverages
  menuStore.addMenuItem({
    categoryId: beveragesCategory.id,
    name: 'Çay',
    price: 500, // 5.00 TL
    description: 'Geleneksel Türk çayı'
  });

  menuStore.addMenuItem({
    categoryId: beveragesCategory.id,
    name: 'Kahve',
    price: 1000, // 10.00 TL
    description: 'Türk kahvesi'
  });

  menuStore.addMenuItem({
    categoryId: beveragesCategory.id,
    name: 'Ayran',
    price: 750, // 7.50 TL
    description: 'Ev yapımı ayran'
  });

  // Main dishes
  menuStore.addMenuItem({
    categoryId: mainsCategory.id,
    name: 'Köfte',
    price: 3500, // 35.00 TL
    description: 'Ev yapımı köfte, pirinç pilavı ile'
  });

  menuStore.addMenuItem({
    categoryId: mainsCategory.id,
    name: 'Tavuk Şiş',
    price: 4000, // 40.00 TL
    description: 'Marine edilmiş tavuk şiş'
  });

  menuStore.addMenuItem({
    categoryId: mainsCategory.id,
    name: 'Balık',
    price: 5500, // 55.00 TL
    description: 'Günün balığı, sebze garnitürü ile'
  });

  // Desserts
  menuStore.addMenuItem({
    categoryId: dessertsCategory.id,
    name: 'Baklava',
    price: 1500, // 15.00 TL
    description: 'Antep fıstıklı baklava'
  });

  menuStore.addMenuItem({
    categoryId: dessertsCategory.id,
    name: 'Sütlaç',
    price: 1200, // 12.00 TL
    description: 'Ev yapımı sütlaç'
  });

  // Add sample halls
  const mainHall = layoutStore.addHall({ name: 'Ana Salon' });
  const terrace = layoutStore.addHall({ name: 'Teras' });

  // Add sample tables
  layoutStore.addTable({ hallId: mainHall.id, label: 'Pencere Kenarı' });
  layoutStore.addTable({ hallId: mainHall.id });
  layoutStore.addTable({ hallId: mainHall.id });
  layoutStore.addTable({ hallId: mainHall.id, label: 'Köşe Masası' });

  layoutStore.addTable({ hallId: terrace.id });
  layoutStore.addTable({ hallId: terrace.id, label: 'Bahçe Görünümlü' });

  console.log('Sample data initialized successfully!');
}
