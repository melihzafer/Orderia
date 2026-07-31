/* ==========================================================================
   ORDERIA CRAFT POS - MICHELIN-GRADE INTERACTIVE LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. CRAFT DATA STATE (MICHELIN MENU & TABLE LAYOUT)
  // --------------------------------------------------------------------------

  const halls = [
    { id: 'main', name: 'Ana Salon' },
    { id: 'terrace', name: 'Teras' },
    { id: 'vip', name: 'VIP Bahçe' },
    { id: 'bar', name: 'Bar' },
  ];

  let tables = [
    {
      id: 'M-01',
      name: 'Masa 01',
      hall: 'main',
      shape: 'square',
      capacity: 4,
      status: 'occupied',
      total: 685.0,
      itemsCount: 4,
      duration: '42 dk',
      waiter: 'AH',
      items: [
        { id: 101, name: 'Artisanal Truffle Burger', qty: 2, price: 215 },
        { id: 105, name: 'Ev Yapımı Narenciye Limonata', qty: 2, price: 127.5 },
      ],
    },
    {
      id: 'M-02',
      name: 'Masa 02',
      hall: 'main',
      shape: 'round',
      capacity: 2,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-03',
      name: 'Masa 03',
      hall: 'main',
      shape: 'square',
      capacity: 4,
      status: 'billing',
      total: 540.0,
      itemsCount: 3,
      duration: '55 dk',
      waiter: 'AH',
      items: [
        { id: 102, name: 'Neapolitan Margherita Pizza', qty: 1, price: 310 },
        { id: 105, name: 'Ev Yapımı Narenciye Limonata', qty: 2, price: 115 },
      ],
    },
    {
      id: 'M-04',
      name: 'Masa 04',
      hall: 'main',
      shape: 'square',
      capacity: 4,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-05',
      name: 'Masa 05',
      hall: 'terrace',
      shape: 'booth',
      capacity: 6,
      status: 'occupied',
      total: 1240.0,
      itemsCount: 5,
      duration: '110 dk',
      waiter: 'EK',
      items: [
        { id: 103, name: 'Dry-Aged Ribeye Steak 300g', qty: 2, price: 490 },
        { id: 106, name: 'Chianti Classico Kırmızı Şarap', qty: 1, price: 260 },
      ],
    },
    {
      id: 'M-06',
      name: 'Masa 06',
      hall: 'terrace',
      shape: 'round',
      capacity: 2,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-07',
      name: 'Masa 07',
      hall: 'terrace',
      shape: 'square',
      capacity: 4,
      status: 'billing',
      total: 390.0,
      itemsCount: 2,
      duration: '30 dk',
      waiter: 'EK',
      items: [{ id: 104, name: 'San Sebastian & Belçika Çikolatası', qty: 2, price: 195 }],
    },
    {
      id: 'M-08',
      name: 'Masa 08',
      hall: 'terrace',
      shape: 'square',
      capacity: 4,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-09',
      name: 'Masa 09',
      hall: 'vip',
      shape: 'booth',
      capacity: 8,
      status: 'occupied',
      total: 2180.0,
      itemsCount: 9,
      duration: '75 dk',
      waiter: 'AH',
      items: [],
    },
    {
      id: 'M-10',
      name: 'Masa 10',
      hall: 'vip',
      shape: 'square',
      capacity: 4,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-11',
      name: 'Masa 11',
      hall: 'vip',
      shape: 'square',
      capacity: 4,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-12',
      name: 'Masa 12',
      hall: 'vip',
      shape: 'round',
      capacity: 2,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-13',
      name: 'Masa 13',
      hall: 'bar',
      shape: 'round',
      capacity: 2,
      status: 'occupied',
      total: 320.0,
      itemsCount: 2,
      duration: '18 dk',
      waiter: 'MZ',
      items: [],
    },
    {
      id: 'M-14',
      name: 'Masa 14',
      hall: 'bar',
      shape: 'round',
      capacity: 2,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-15',
      name: 'Masa 15',
      hall: 'bar',
      shape: 'square',
      capacity: 4,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
    {
      id: 'M-16',
      name: 'Masa 16',
      hall: 'bar',
      shape: 'square',
      capacity: 4,
      status: 'free',
      total: 0.0,
      itemsCount: 0,
      duration: '-',
      waiter: '-',
      items: [],
    },
  ];

  // High-Resolution Curated Unsplash Food Imagery
  const products = [
    {
      id: 101,
      title: 'Artisanal Truffle Burger',
      cat: 'burgers',
      price: 215.0,
      badge: 'Popular',
      img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 102,
      title: 'Neapolitan Margherita Pizza',
      cat: 'pizzas',
      price: 310.0,
      badge: 'Wood-Fired',
      img: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 103,
      title: 'Dry-Aged Ribeye Steak 300g',
      cat: 'mains',
      price: 490.0,
      badge: "Chef's Special",
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 104,
      title: 'San Sebastian & Belçika Çikolatası',
      cat: 'desserts',
      price: 195.0,
      badge: 'Fresh Daily',
      img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 105,
      title: 'Ev Yapımı Narenciye Limonata',
      cat: 'drinks',
      price: 95.0,
      badge: 'Craft Drink',
      img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 106,
      title: 'Chianti Classico Kırmızı Şarap',
      cat: 'drinks',
      price: 260.0,
      badge: 'Premium',
      img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 107,
      title: 'Izgara Tavuklu Sezar Salata',
      cat: 'mains',
      price: 220.0,
      badge: 'Organic',
      img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 108,
      title: 'Double Shot Espresso Single-Origin',
      cat: 'drinks',
      price: 75.0,
      badge: 'Artisan Coffee',
      img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
    },
  ];

  let activeCartTableId = 'M-01';
  let activeHallFilter = 'all';
  let activeStatusFilter = 'all';
  let selectedProductForMod = null;

  // --------------------------------------------------------------------------
  // 2. DEVICE FRAME & THEME TOGGLES
  // --------------------------------------------------------------------------

  const toggleFrameBtn = document.getElementById('toggle-frame-btn');
  const phoneContainer = document.getElementById('phone-container');

  toggleFrameBtn.addEventListener('click', () => {
    phoneContainer.classList.toggle('full-screen');
    const isFull = phoneContainer.classList.contains('full-screen');
    toggleFrameBtn.innerHTML = isFull
      ? `<i class="ri-cellphone-line"></i> Telefon Çerçevesi`
      : `<i class="ri-fullscreen-line"></i> Tam Ekran Görünüm`;
  });

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    showToast(
      `Tema ${next === 'dark' ? 'Obsidian Koyu' : 'Alabaster Açık'} moda alındı`,
      'ri-palette-line',
    );
  });

  // Bottom Nav Switches
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  const mobilePanels = document.querySelectorAll('.mobile-panel');
  const mobileViewTitle = document.getElementById('mobile-view-title');
  const mobileViewSub = document.getElementById('mobile-view-sub');

  const titleMap = {
    'tables-view': { title: 'Masa & Düzen Haritası', sub: '16 Masa • 6 Aktif Adisyon' },
    'pos-view': { title: 'Hızlı POS & Adisyon', sub: 'Masa siparişlerini anında oluşturun' },
    'menu-view': { title: 'Menü Kataloğu', sub: 'Michelin reçete ve fiyat listesi' },
    'analytics-view': { title: 'Ciro & Analiz', sub: 'Günlük ciro ve en çok satanlar' },
    'settings-view': { title: 'Sistem & İzinler', sub: 'Vardiyadaki 2 aktif personel' },
  };

  bottomNavItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      bottomNavItems.forEach((i) => i.classList.remove('active'));
      mobilePanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      if (titleMap[targetTab]) {
        mobileViewTitle.textContent = titleMap[targetTab].title;
        mobileViewSub.textContent = titleMap[targetTab].sub;
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. RENDER AUTHENTIC TABLES WITH GEOMETRY SHAPES
  // --------------------------------------------------------------------------

  const tablesGrid = document.getElementById('tables-grid');

  function renderTables() {
    tablesGrid.innerHTML = '';

    const filtered = tables.filter((t) => {
      const matchHall = activeHallFilter === 'all' || t.hall === activeHallFilter;
      const matchStatus = activeStatusFilter === 'all' || t.status === activeStatusFilter;
      return matchHall && matchStatus;
    });

    filtered.forEach((t) => {
      const card = document.createElement('div');
      card.className = `m-table-card table-shape-${t.shape} ${t.status}`;

      let statusLabel = 'Boş';
      if (t.status === 'occupied') statusLabel = 'Dolu';
      if (t.status === 'billing') statusLabel = 'Hesap';

      card.innerHTML = `
        <div class="m-table-header">
          <span class="m-table-name">${t.name}</span>
          <span class="m-status-tag ${t.status}">${statusLabel}</span>
        </div>

        ${
          t.status !== 'free'
            ? `
          <div class="table-waiter-badge">
            <span class="waiter-avatar-xs">${t.waiter}</span>
            <span>Garson ${t.waiter === 'AH' ? 'Ahmet' : 'Elif'}</span>
          </div>
          <div class="m-table-price">₺${t.total.toFixed(0)}</div>
          <span class="m-table-sub"><i class="ri-time-line"></i> ${t.duration} önce açıldı</span>
          <button class="m-table-btn btn-occupied-act btn-open-table-sheet" data-id="${t.id}">
            <i class="ri-file-list-3-line"></i> Adisyon (${t.itemsCount})
          </button>
        `
            : `
          <div class="m-table-price" style="font-size:0.85rem; color: var(--text-muted);">Masa Serbest</div>
          <span class="m-table-sub"><i class="ri-user-line"></i> ${t.capacity} Kişilik Kapasite</span>
          <button class="m-table-btn btn-free-open btn-open-table-sheet" data-id="${t.id}">
            <i class="ri-add-line"></i> Sipariş Aç
          </button>
        `
        }
      `;

      tablesGrid.appendChild(card);
    });

    updateKPIs();
    bindTableButtons();
  }

  function updateKPIs() {
    const total = tables.length;
    const occupied = tables.filter((t) => t.status !== 'free').length;
    const rev = tables.reduce((acc, t) => acc + t.total, 0);

    document.getElementById('kpi-occupied').textContent =
      `${occupied} / ${total} (%${Math.round((occupied / total) * 100)})`;
    document.getElementById('kpi-revenue').textContent =
      `₺${rev.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  }

  // Hall & Status Filters
  document.querySelectorAll('.hall-pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.hall-pill').forEach((p) => p.classList.remove('active'));
      e.target.classList.add('active');
      activeHallFilter = e.target.getAttribute('data-hall');
      renderTables();
    });
  });

  document.querySelectorAll('.m-filter-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.m-filter-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      activeStatusFilter = e.target.getAttribute('data-status');
      renderTables();
    });
  });

  // --------------------------------------------------------------------------
  // 4. REAL FOOD PHOTOS POS CATALOG
  // --------------------------------------------------------------------------

  const posProductsContainer = document.getElementById('pos-products');

  function renderPOSProducts(category = 'all') {
    posProductsContainer.innerHTML = '';
    const filtered = category === 'all' ? products : products.filter((p) => p.cat === category);

    filtered.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'm-food-card';
      card.innerHTML = `
        <div class="m-food-img-wrapper">
          <img src="${p.img}" alt="${p.title}" class="m-food-img" loading="lazy">
          <span class="m-food-badge">${p.badge}</span>
        </div>
        <div class="m-food-body">
          <div class="m-food-title">${p.title}</div>
          <div class="m-food-footer">
            <span class="m-food-price">₺${p.price.toFixed(0)}</span>
            <button class="m-food-add-btn">+</button>
          </div>
        </div>
      `;
      card.addEventListener('click', () => openModifierModal(p));
      posProductsContainer.appendChild(card);
    });
  }

  document.querySelectorAll('.cat-pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-pill').forEach((p) => p.classList.remove('active'));
      e.target.classList.add('active');
      renderPOSProducts(e.target.getAttribute('data-cat'));
    });
  });

  // Modifier Sheet Trigger
  const modifierSheetBackdrop = document.getElementById('modifier-sheet-backdrop');
  const closeModSheetBtn = document.getElementById('close-mod-sheet');
  const btnConfirmModifier = document.getElementById('btn-confirm-modifier');

  function openModifierModal(product) {
    selectedProductForMod = product;
    document.getElementById('mod-product-title').textContent = product.title;
    document.getElementById('mod-product-price').textContent = `₺${product.price.toFixed(2)}`;
    modifierSheetBackdrop.classList.add('active');
  }

  closeModSheetBtn.addEventListener('click', () =>
    modifierSheetBackdrop.classList.remove('active'),
  );

  btnConfirmModifier.addEventListener('click', () => {
    if (!selectedProductForMod) return;
    addItemToActiveTable(selectedProductForMod);
    modifierSheetBackdrop.classList.remove('active');
  });

  function addItemToActiveTable(product) {
    const tableObj = tables.find((t) => t.id === activeCartTableId);
    if (!tableObj) return;

    if (tableObj.status === 'free') {
      tableObj.status = 'occupied';
      tableObj.duration = '1 dk';
      tableObj.waiter = 'MZ';
    }

    const exist = tableObj.items.find((i) => i.id === product.id);
    if (exist) {
      exist.qty++;
    } else {
      tableObj.items.push({ id: product.id, name: product.title, qty: 1, price: product.price });
    }

    tableObj.total = tableObj.items.reduce((acc, i) => acc + i.price * i.qty, 0);
    tableObj.itemsCount = tableObj.items.reduce((acc, i) => acc + i.qty, 0);

    updateFloatingCartBar();
    renderTables();
    showToast(`${product.title} (${tableObj.name}) eklendi!`, 'ri-check-line');
  }

  function updateFloatingCartBar() {
    const tableObj = tables.find((t) => t.id === activeCartTableId);
    if (!tableObj) return;

    document.getElementById('floating-cart-count').textContent = tableObj.itemsCount;
    document.getElementById('floating-cart-price').textContent = `₺${tableObj.total.toFixed(0)}`;
    document.getElementById('floating-cart-sub').textContent =
      `${tableObj.name} • ${tableObj.itemsCount} sipariş kalemi`;

    const badge = document.getElementById('nav-pos-badge');
    if (tableObj.itemsCount > 0) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  // --------------------------------------------------------------------------
  // 5. SLIDE-UP DRAWERS & PAYMENT SPLIT
  // --------------------------------------------------------------------------

  const cartSheetBackdrop = document.getElementById('cart-sheet-backdrop');
  const closeCartSheetBtn = document.getElementById('close-cart-sheet');
  const openCartBar = document.getElementById('open-cart-sheet');

  const paymentSheetBackdrop = document.getElementById('payment-sheet-backdrop');
  const closePaySheetBtn = document.getElementById('close-pay-sheet');
  const btnSheetPay = document.getElementById('btn-sheet-pay');
  const btnConfirmMobilePay = document.getElementById('btn-confirm-mobile-pay');

  openCartBar.addEventListener('click', () => openCartSheet());
  closeCartSheetBtn.addEventListener('click', () => cartSheetBackdrop.classList.remove('active'));
  closePaySheetBtn.addEventListener('click', () => paymentSheetBackdrop.classList.remove('active'));

  function bindTableButtons() {
    document.querySelectorAll('.btn-open-table-sheet').forEach((b) => {
      b.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        activeCartTableId = id;
        document.getElementById('mobile-table-select').value = id;
        updateFloatingCartBar();
        openCartSheet();
      });
    });
  }

  function openCartSheet() {
    const tableObj = tables.find((t) => t.id === activeCartTableId);
    if (!tableObj) return;

    document.getElementById('sheet-table-title').textContent = `${tableObj.name} Adisyonu`;
    document.getElementById('sheet-waiter-info').textContent =
      `Garson: ${tableObj.waiter || 'Atanmadı'} • Oturma Süresi: ${tableObj.duration}`;

    renderSheetItems(tableObj);
    cartSheetBackdrop.classList.add('active');
  }

  function renderSheetItems(tableObj) {
    const body = document.getElementById('sheet-cart-items');
    body.innerHTML = '';

    if (tableObj.items.length === 0) {
      body.innerHTML = `<div style="text-align: center; padding: 30px 0; color: var(--text-muted);">Adisyonda henüz ürün yok.</div>`;
      document.getElementById('sheet-subtotal').textContent = '₺0.00';
      document.getElementById('sheet-tax').textContent = '₺0.00';
      document.getElementById('sheet-total').textContent = '₺0.00';
      return;
    }

    tableObj.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'sheet-cart-row';
      row.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <div style="font-size:0.72rem; color: var(--text-muted);">${item.qty} x ₺${item.price.toFixed(2)}</div>
        </div>
        <strong style="color: var(--brand-gold);">₺${(item.price * item.qty).toFixed(2)}</strong>
      `;
      body.appendChild(row);
    });

    const total = tableObj.total;
    const tax = total * 0.1;

    document.getElementById('sheet-subtotal').textContent = `₺${(total - tax).toFixed(2)}`;
    document.getElementById('sheet-tax').textContent = `₺${tax.toFixed(2)}`;
    document.getElementById('sheet-total').textContent = `₺${total.toFixed(2)}`;
  }

  // Open Payment Sheet
  btnSheetPay.addEventListener('click', () => {
    const tableObj = tables.find((t) => t.id === activeCartTableId);
    if (!tableObj || tableObj.total === 0) {
      showToast('Boş adisyon ödenemez!', 'ri-error-warning-line');
      return;
    }
    cartSheetBackdrop.classList.remove('active');

    document.getElementById('pay-modal-title').textContent = `${tableObj.name} Ödeme Al`;
    document.getElementById('pay-total-display').textContent = `₺${tableObj.total.toFixed(2)}`;
    paymentSheetBackdrop.classList.add('active');
  });

  // Confirm Payment
  btnConfirmMobilePay.addEventListener('click', () => {
    const tableObj = tables.find((t) => t.id === activeCartTableId);
    if (!tableObj) return;

    tableObj.status = 'free';
    tableObj.total = 0;
    tableObj.items = [];
    tableObj.itemsCount = 0;
    tableObj.duration = '-';

    paymentSheetBackdrop.classList.remove('active');
    renderTables();
    updateFloatingCartBar();
    showToast(
      `${tableObj.name} hesabı kapatıldı ve masa serbest bırakıldı!`,
      'ri-check-double-line',
    );
  });

  // QR Copy
  document.getElementById('btn-copy-qr').addEventListener('click', () => {
    showToast('Masa QR Menü Baglantisi Kopyalandi!', 'ri-file-copy-line');
  });

  // Menu Management Render
  function renderMenuList() {
    const container = document.getElementById('mobile-menu-list');
    container.innerHTML = '';

    products.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'settings-item';
      item.style.justifyContent = 'space-between';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${p.img}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
          <div>
            <div><strong>${p.title}</strong></div>
            <div style="font-size:0.75rem; color: var(--brand-gold); font-weight:700;">₺${p.price.toFixed(2)}</div>
          </div>
        </div>
        <span class="m-status-tag free">Stokta</span>
      `;
      container.appendChild(item);
    });
  }

  // Toast Function
  function showToast(msg, icon = 'ri-notification-3-line') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Initial Initialization
  renderTables();
  renderPOSProducts();
  renderMenuList();
  updateFloatingCartBar();
});
