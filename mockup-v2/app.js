/* ==========================================================================
   ORDERIA · KONSEPT V2 — etkileşim katmanı
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------------
  // VERİ
  // ------------------------------------------------------------------
  const halls = { main: 'Ana Salon', terrace: 'Teras', vip: 'VIP Bahçe', bar: 'Bar' };

  const tables = [
    { id: 'M-01', name: 'Masa 01', hall: 'main',    shape: 'square', capacity: 4, status: 'occupied', total: 685,  duration: '42 dk',  waiter: 'AH', items: [
      { id: 101, name: 'Artisanal Truffle Burger', qty: 2, price: 215 },
      { id: 105, name: 'Ev Yapımı Narenciye Limonata', qty: 2, price: 95 },
      { id: 108, name: 'Double Shot Espresso', qty: 1, price: 75 }
    ]},
    { id: 'M-02', name: 'Masa 02', hall: 'main',    shape: 'round',  capacity: 2, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-03', name: 'Masa 03', hall: 'main',    shape: 'square', capacity: 4, status: 'billing',  total: 540,  duration: '55 dk',  waiter: 'AH', items: [
      { id: 102, name: 'Neapolitan Margherita Pizza', qty: 1, price: 310 },
      { id: 105, name: 'Ev Yapımı Narenciye Limonata', qty: 2, price: 95 }
    ]},
    { id: 'M-04', name: 'Masa 04', hall: 'main',    shape: 'square', capacity: 4, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-05', name: 'Masa 05', hall: 'terrace', shape: 'booth',  capacity: 6, status: 'occupied', total: 1240, duration: '110 dk', waiter: 'EK', items: [
      { id: 103, name: 'Dry-Aged Ribeye Steak 300g', qty: 2, price: 490 },
      { id: 106, name: 'Chianti Classico Kırmızı Şarap', qty: 1, price: 260 }
    ]},
    { id: 'M-06', name: 'Masa 06', hall: 'terrace', shape: 'round',  capacity: 2, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-07', name: 'Masa 07', hall: 'terrace', shape: 'square', capacity: 4, status: 'billing',  total: 390,  duration: '30 dk',  waiter: 'EK', items: [
      { id: 104, name: 'San Sebastian Cheesecake', qty: 2, price: 195 }
    ]},
    { id: 'M-08', name: 'Masa 08', hall: 'terrace', shape: 'square', capacity: 4, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-09', name: 'Masa 09', hall: 'vip',     shape: 'booth',  capacity: 8, status: 'occupied', total: 2180, duration: '75 dk',  waiter: 'AH', items: [
      { id: 103, name: 'Dry-Aged Ribeye Steak 300g', qty: 3, price: 490 },
      { id: 106, name: 'Chianti Classico Kırmızı Şarap', qty: 2, price: 260 },
      { id: 101, name: 'Artisanal Truffle Burger', qty: 1, price: 215 }
    ]},
    { id: 'M-10', name: 'Masa 10', hall: 'vip',     shape: 'square', capacity: 4, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-11', name: 'Masa 11', hall: 'vip',     shape: 'square', capacity: 4, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-12', name: 'Masa 12', hall: 'vip',     shape: 'round',  capacity: 2, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-13', name: 'Masa 13', hall: 'bar',     shape: 'round',  capacity: 2, status: 'occupied', total: 320,  duration: '18 dk',  waiter: 'MZ', items: [
      { id: 106, name: 'Chianti Classico Kırmızı Şarap', qty: 1, price: 260 },
      { id: 108, name: 'Double Shot Espresso', qty: 1, price: 75 }
    ]},
    { id: 'M-14', name: 'Masa 14', hall: 'bar',     shape: 'round',  capacity: 2, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-15', name: 'Masa 15', hall: 'bar',     shape: 'square', capacity: 4, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] },
    { id: 'M-16', name: 'Masa 16', hall: 'bar',     shape: 'square', capacity: 4, status: 'free',     total: 0, duration: '-', waiter: '-', items: [] }
  ];

  const products = [
    { id: 101, title: 'Artisanal Truffle Burger',      cat: 'burgers',  price: 215, badge: 'Popüler',      sold: 86, stock: true,  img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80' },
    { id: 102, title: 'Neapolitan Margherita Pizza',   cat: 'pizzas',   price: 310, badge: 'Taş Fırın',    sold: 74, stock: true,  img: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=400&q=80' },
    { id: 103, title: 'Dry-Aged Ribeye Steak 300g',    cat: 'mains',    price: 490, badge: 'Şef Önerisi',  sold: 58, stock: true,  img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
    { id: 104, title: 'San Sebastian Cheesecake',      cat: 'desserts', price: 195, badge: 'Günlük Taze',  sold: 51, stock: true,  img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80' },
    { id: 105, title: 'Ev Yapımı Narenciye Limonata',  cat: 'drinks',   price: 95,  badge: 'El Yapımı',    sold: 97, stock: true,  img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80' },
    { id: 106, title: 'Chianti Classico Kırmızı Şarap',cat: 'drinks',   price: 260, badge: 'Premium',      sold: 33, stock: true,  img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80' },
    { id: 107, title: 'Izgara Tavuklu Sezar Salata',   cat: 'mains',    price: 220, badge: 'Organik',      sold: 44, stock: false, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80' },
    { id: 108, title: 'Double Shot Espresso',          cat: 'drinks',   price: 75,  badge: 'Single Origin',sold: 62, stock: true,  img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80' }
  ];

  // ------------------------------------------------------------------
  // DURUM
  // ------------------------------------------------------------------
  let activeTableId = 'M-01';
  let hallFilter = 'all';
  let statusFilter = 'all';
  let modProduct = null;
  let modQty = 1;
  let guestCount = 2;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const tableOf = (id) => tables.find(t => t.id === id);
  const statusLabel = { free: 'Boş', occupied: 'Dolu', billing: 'Hesap' };

  // ------------------------------------------------------------------
  // SAAT (gerçek)
  // ------------------------------------------------------------------
  const tick = () => {
    const d = new Date();
    $('clock').textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  tick(); setInterval(tick, 15000);

  // ------------------------------------------------------------------
  // SAHNE: çerçeve + tema
  // ------------------------------------------------------------------
  $('frame-toggle').addEventListener('click', () => {
    const full = $('phone').classList.toggle('full');
    $('frame-toggle').innerHTML = full
      ? '<i class="ri-cellphone-line"></i><span>Çerçeve</span>'
      : '<i class="ri-fullscreen-line"></i><span>Tam Ekran</span>';
  });

  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    $('theme-switch').classList.toggle('on', t === 'dark');
    $('theme-switch').setAttribute('aria-checked', t === 'dark');
    $('theme-toggle').querySelector('i').className = t === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  };
  $('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? 'Koyu tema açık' : 'Açık tema açık', 'ri-contrast-2-line');
  });
  $('theme-switch').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // ------------------------------------------------------------------
  // ALT NAVİGASYON
  // ------------------------------------------------------------------
  const titles = {
    'tables-view':    ['Masalar', ''],
    'pos-view':       ['Sipariş', 'Kategoriden ürün seçin'],
    'menu-view':      ['Menü', 'Ürün kataloğu ve stok'],
    'analytics-view': ['Rapor', 'Bugün · Kadıköy'],
    'settings-view':  ['Ayarlar', 'Vardiya, donanım, izinler']
  };

  function switchTab(id) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === id));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === id));
    $('view-title').textContent = titles[id][0];
    $('view-sub').textContent = id === 'tables-view' ? tablesSub() : titles[id][1];
    $('cart-fab').classList.toggle('visible', id === 'pos-view' && tableOf(activeTableId).items.length > 0);
    document.querySelector('.app-body').scrollTop = 0;
  }

  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  const tablesSub = () => {
    const active = tables.filter(t => t.status !== 'free').length;
    return `${active} aktif adisyon · ${tables.length} masa`;
  };

  // ------------------------------------------------------------------
  // 1 · MASALAR
  // ------------------------------------------------------------------
  function renderTables() {
    const grid = $('tables-grid');
    grid.innerHTML = '';

    const shown = tables.filter(t =>
      (hallFilter === 'all' || t.hall === hallFilter) &&
      (statusFilter === 'all' || t.status === statusFilter)
    );

    shown.forEach(t => {
      const tile = document.createElement('button');
      tile.className = `table-tile ${t.status} ${t.shape === 'booth' ? 'booth' : ''}`;
      const info = t.status === 'free'
        ? `${t.capacity} kişilik`
        : `${fmt(t.total).replace(',00','')} · ${t.duration}`;

      tile.innerHTML = `
        <span class="table-shape shape-${t.shape}">
          ${t.id.slice(2)}
          ${t.waiter !== '-' ? `<span class="table-waiter">${t.waiter}</span>` : ''}
        </span>
        <span class="table-meta">
          <span class="t-name">${t.name}</span>
          <span class="t-info">${info}</span>
        </span>`;
      tile.addEventListener('click', () => { setActiveTable(t.id); openSheet('sheet-cart'); });
      grid.appendChild(tile);
    });

    // KPI'lar
    const active = tables.filter(t => t.status !== 'free');
    const revenue = active.reduce((s, t) => s + t.total, 0);
    $('kpi-revenue').textContent = fmt(revenue).replace(',00','');
    $('kpi-occupied').textContent = `${active.length}/${tables.length}`;
    $('kpi-occupied-pct').textContent = `%${Math.round(active.length / tables.length * 100)} dolu`;
    if (document.querySelector('.nav-item.active').dataset.tab === 'tables-view') {
      $('view-sub').textContent = tablesSub();
    }
  }

  $('hall-seg').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn'); if (!btn) return;
    document.querySelectorAll('#hall-seg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    hallFilter = btn.dataset.hall;
    renderTables();
  });

  $('status-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    document.querySelectorAll('#status-chips .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    statusFilter = btn.dataset.status;
    renderTables();
  });

  // ------------------------------------------------------------------
  // 2 · POS
  // ------------------------------------------------------------------
  function renderProducts(cat = 'all') {
    const grid = $('product-grid');
    grid.innerHTML = '';
    products.filter(p => cat === 'all' || p.cat === cat).forEach(p => {
      const card = document.createElement('button');
      card.className = 'product-card';
      card.innerHTML = `
        <span class="p-img-wrap">
          <img class="p-img" src="${p.img}" alt="${p.title}" loading="lazy">
          <span class="p-badge">${p.badge}</span>
        </span>
        <span class="p-body">
          <span class="p-title">${p.title}</span>
          <span class="p-foot">
            <span class="p-price num">${fmt(p.price).replace(',00','')}</span>
            <span class="p-add"><i class="ri-add-line"></i></span>
          </span>
        </span>`;
      card.addEventListener('click', () => openModifier(p));
      grid.appendChild(card);
    });
  }

  $('cat-row').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn'); if (!btn) return;
    document.querySelectorAll('#cat-row .cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.cat);
  });

  function setActiveTable(id) {
    activeTableId = id;
    const t = tableOf(id);
    $('tp-name').textContent = `${t.name} · ${halls[t.hall]}`;
    const pill = $('tp-status');
    pill.textContent = statusLabel[t.status];
    pill.className = `status-pill ${t.status === 'occupied' ? 'occ' : t.status === 'billing' ? 'bill' : 'free'}`;
    renderPicker();
    renderCart();
    updateFab();
  }

  // masa seçici sheet
  function renderPicker() {
    const list = $('pick-list');
    list.innerHTML = '';
    tables.forEach(t => {
      const row = document.createElement('button');
      row.className = `pick-row ${t.id === activeTableId ? 'selected' : ''}`;
      const dot = t.status === 'free' ? 'dot-free' : t.status === 'occupied' ? 'dot-occ' : 'dot-bill';
      const sub = t.status === 'free'
        ? `${halls[t.hall]} · ${t.capacity} kişilik · Boş`
        : `${halls[t.hall]} · ${statusLabel[t.status]} · ${t.duration}`;
      row.innerHTML = `
        <i class="dot ${dot}"></i>
        <span class="pick-info">
          <span class="pick-name">${t.name}</span>
          <span class="pick-sub">${sub}</span>
        </span>
        ${t.total > 0 ? `<span class="pick-total num">${fmt(t.total).replace(',00','')}</span>` : ''}
        ${t.id === activeTableId ? '<i class="ri-check-line pick-check"></i>' : ''}`;
      row.addEventListener('click', () => {
        setActiveTable(t.id);
        closeSheet('sheet-tables');
      });
      list.appendChild(row);
    });
  }
  $('table-picker-btn').addEventListener('click', () => openSheet('sheet-tables'));

  // ------------------------------------------------------------------
  // OPSİYON SHEET (ürün ekleme)
  // ------------------------------------------------------------------
  function openModifier(p) {
    modProduct = p;
    modQty = 1;
    $('mod-title').textContent = p.title;
    $('mod-price').textContent = fmt(p.price);
    $('mod-qty').textContent = modQty;
    document.querySelectorAll('#mod-cook .opt-btn').forEach((b, i) => b.classList.toggle('active', i === 1));
    document.querySelectorAll('#mod-extras .opt-btn').forEach(b => b.classList.remove('active'));
    updateModTotal();
    openSheet('sheet-mod');
  }

  const extrasTotal = () =>
    [...document.querySelectorAll('#mod-extras .opt-btn.active')]
      .reduce((s, b) => s + Number(b.dataset.extra), 0);

  function updateModTotal() {
    $('mod-total').textContent = fmt((modProduct.price + extrasTotal()) * modQty);
  }

  $('mod-cook').addEventListener('click', (e) => {
    const btn = e.target.closest('.opt-btn'); if (!btn) return;
    document.querySelectorAll('#mod-cook .opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
  $('mod-extras').addEventListener('click', (e) => {
    const btn = e.target.closest('.opt-btn'); if (!btn) return;
    btn.classList.toggle('active');
    updateModTotal();
  });
  $('mod-minus').addEventListener('click', () => { if (modQty > 1) { modQty--; $('mod-qty').textContent = modQty; updateModTotal(); } });
  $('mod-plus').addEventListener('click', () => { modQty++; $('mod-qty').textContent = modQty; updateModTotal(); });

  $('btn-mod-confirm').addEventListener('click', () => {
    const t = tableOf(activeTableId);
    if (t.status === 'free') { t.status = 'occupied'; t.duration = '1 dk'; t.waiter = 'MZ'; }

    const existing = t.items.find(i => i.id === modProduct.id);
    if (existing) existing.qty += modQty;
    else t.items.push({ id: modProduct.id, name: modProduct.title, qty: modQty, price: modProduct.price + extrasTotal() });

    recalc(t);
    closeSheet('sheet-mod');
    toast(`${modProduct.title} → ${t.name}`, 'ri-check-line');
    renderTables(); setActiveTable(t.id);
  });

  const recalc = (t) => {
    t.total = t.items.reduce((s, i) => s + i.price * i.qty, 0);
    t.itemsCount = t.items.reduce((s, i) => s + i.qty, 0);
  };

  // ------------------------------------------------------------------
  // ADİSYON SHEET
  // ------------------------------------------------------------------
  function renderCart() {
    const t = tableOf(activeTableId);
    $('cart-title').textContent = t.name;
    $('cart-sub').textContent = t.status === 'free'
      ? `${halls[t.hall]} · ${t.capacity} kişilik`
      : `Garson ${t.waiter} · ${t.duration} · ${halls[t.hall]}`;

    const body = $('cart-items');
    body.innerHTML = '';

    if (t.items.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <i class="ri-bill-line"></i>
          <strong>Adisyon boş</strong>
          <p>Sipariş sekmesinden ürün ekleyerek masayı açabilirsiniz.</p>
        </div>`;
      $('btn-pay').disabled = false;
    } else {
      t.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-row';
        row.innerHTML = `
          <div class="cart-row-info">
            <span class="cart-row-name">${item.name}</span>
            <span class="cart-row-unit num">${fmt(item.price)}</span>
          </div>
          <div class="stepper">
            <button class="step-btn" data-act="dec" aria-label="Azalt"><i class="ri-subtract-line"></i></button>
            <span class="num">${item.qty}</span>
            <button class="step-btn" data-act="inc" aria-label="Arttır"><i class="ri-add-line"></i></button>
          </div>
          <span class="cart-row-total num">${fmt(item.price * item.qty)}</span>`;

        row.querySelector('[data-act="inc"]').addEventListener('click', () => {
          item.qty++; recalc(t); renderCart(); updateFab(); renderTables();
        });
        row.querySelector('[data-act="dec"]').addEventListener('click', () => {
          item.qty--;
          if (item.qty <= 0) t.items = t.items.filter(i => i !== item);
          recalc(t); renderCart(); updateFab(); renderTables();
        });
        body.appendChild(row);
      });
    }

    const tax = t.total * 0.10;
    $('sum-sub').textContent = fmt(t.total - tax);
    $('sum-tax').textContent = fmt(tax);
    $('sum-total').textContent = fmt(t.total);
  }

  $('btn-kitchen').addEventListener('click', () => {
    const t = tableOf(activeTableId);
    if (t.items.length === 0) { toast('Adisyon boş — önce ürün ekleyin', 'ri-error-warning-line'); return; }
    closeSheet('sheet-cart');
    toast(`${t.name} siparişi mutfağa iletildi`, 'ri-fire-line');
  });

  // ------------------------------------------------------------------
  // ÖDEME SHEET
  // ------------------------------------------------------------------
  $('btn-pay').addEventListener('click', () => {
    const t = tableOf(activeTableId);
    if (t.total === 0) { toast('Boş adisyon ödenemez', 'ri-error-warning-line'); return; }
    closeSheet('sheet-cart');
    $('pay-sub').textContent = `${t.name} · ${t.itemsCount || ''} kalem`;
    $('pay-amount').textContent = fmt(t.total);
    guestCount = 2;
    $('guest-count').textContent = guestCount;
    document.querySelectorAll('#split-seg .seg-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    $('split-equal').hidden = true;
    $('split-note').hidden = true;
    $('pay-success').hidden = true;
    openSheet('sheet-pay');
  });

  $('split-seg').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn'); if (!btn) return;
    document.querySelectorAll('#split-seg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('split-equal').hidden = btn.dataset.split !== 'equal';
    $('split-note').hidden = btn.dataset.split !== 'item';
    updateSplitHint();
  });

  const updateSplitHint = () => {
    $('split-hint').textContent = `kişi başı ${fmt(tableOf(activeTableId).total / guestCount)}`;
  };
  $('guest-minus').addEventListener('click', () => { if (guestCount > 2) { guestCount--; $('guest-count').textContent = guestCount; updateSplitHint(); } });
  $('guest-plus').addEventListener('click', () => { if (guestCount < 8) { guestCount++; $('guest-count').textContent = guestCount; updateSplitHint(); } });

  $('pay-methods').addEventListener('click', (e) => {
    const btn = e.target.closest('.pay-method'); if (!btn) return;
    document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  $('btn-pay-confirm').addEventListener('click', () => {
    const t = tableOf(activeTableId);
    $('pay-success').hidden = false;
    $('success-sub').textContent = `${t.name} serbest bırakıldı · ${fmt(t.total)}`;

    setTimeout(() => {
      t.status = 'free'; t.total = 0; t.items = []; t.itemsCount = 0; t.duration = '-'; t.waiter = '-';
      closeSheet('sheet-pay');
      setActiveTable(t.id);
      renderTables();
      toast(`${t.name} hesabı kapatıldı`, 'ri-check-double-line');
    }, 1400);
  });

  // ------------------------------------------------------------------
  // YÜZEN SEPET
  // ------------------------------------------------------------------
  function updateFab() {
    const t = tableOf(activeTableId);
    const count = t.items.reduce((s, i) => s + i.qty, 0);
    $('fab-count').textContent = count;
    $('fab-total').textContent = fmt(t.total).replace(',00','');
    $('fab-sub').textContent = count ? `${t.name} · ${count} kalem` : 'Ürün seçilmedi';

    const onPos = document.querySelector('.nav-item.active').dataset.tab === 'pos-view';
    $('cart-fab').classList.toggle('visible', onPos && count > 0);

    const badge = $('nav-badge');
    badge.hidden = count === 0;
    badge.textContent = count;
  }
  $('cart-fab').addEventListener('click', () => openSheet('sheet-cart'));

  // ------------------------------------------------------------------
  // 3 · MENÜ
  // ------------------------------------------------------------------
  const catNames = { burgers: 'Burger', pizzas: 'Pizza', mains: 'Izgara', drinks: 'İçecek', desserts: 'Tatlı' };

  function renderMenu() {
    const list = $('menu-list');
    list.innerHTML = '';
    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.innerHTML = `
        <img src="${p.img}" alt="${p.title}">
        <div class="mi-info">
          <span class="mi-name">${p.title}</span>
          <span class="mi-cat">${catNames[p.cat]}</span>
        </div>
        <span class="mi-price num">${fmt(p.price).replace(',00','')}</span>
        <button class="switch ${p.stock ? 'on' : ''}" role="switch" aria-checked="${p.stock}" aria-label="Stok durumu"><i></i></button>`;
      item.querySelector('.switch').addEventListener('click', (e) => {
        p.stock = !p.stock;
        e.currentTarget.classList.toggle('on', p.stock);
        toast(`${p.title} ${p.stock ? 'satışa açıldı' : 'satışa kapatıldı'}`, p.stock ? 'ri-check-line' : 'ri-prohibited-line');
      });
      list.appendChild(item);
    });
  }

  $('btn-add-item').addEventListener('click', () => toast('Ürün ekleme formu yakında', 'ri-add-line'));

  // ------------------------------------------------------------------
  // 4 · RAPOR
  // ------------------------------------------------------------------
  function renderRank() {
    const list = $('rank-list');
    list.innerHTML = '';
    [...products].sort((a, b) => b.sold - a.sold).slice(0, 4).forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'rank-item';
      row.innerHTML = `
        <span class="rank-no">${i + 1}</span>
        <img src="${p.img}" alt="${p.title}">
        <div class="rank-info">
          <span class="rank-name">${p.title}</span>
          <span class="rank-sub">${p.sold} adet satıldı</span>
        </div>
        <span class="rank-val num">${fmt(p.sold * p.price).replace(',00','')}</span>`;
      list.appendChild(row);
    });
  }

  // ------------------------------------------------------------------
  // ARAMA
  // ------------------------------------------------------------------
  function renderSearch(q = '') {
    const list = $('search-results');
    list.innerHTML = '';
    const hits = products.filter(p => p.title.toLowerCase().includes(q.toLowerCase()));

    if (hits.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="ri-search-line"></i>
          <strong>Sonuç bulunamadı</strong>
          <p>“${q}” için menüde eşleşen ürün yok.</p>
        </div>`;
      return;
    }
    hits.forEach(p => {
      const row = document.createElement('button');
      row.className = 'search-row';
      row.innerHTML = `
        <img src="${p.img}" alt="${p.title}">
        <span class="mi-info">
          <span class="mi-name">${p.title}</span>
          <span class="mi-cat">${catNames[p.cat]}</span>
        </span>
        <span class="mi-price num">${fmt(p.price).replace(',00','')}</span>`;
      row.addEventListener('click', () => { closeSheet('sheet-search'); openModifier(p); });
      list.appendChild(row);
    });
  }

  $('search-open').addEventListener('click', () => {
    renderSearch();
    openSheet('sheet-search');
    setTimeout(() => $('search-input').focus(), 350);
  });
  $('search-input').addEventListener('input', (e) => renderSearch(e.target.value));

  // ------------------------------------------------------------------
  // SHEET ALTYAPISI
  // ------------------------------------------------------------------
  function openSheet(id) {
    if (id === 'sheet-cart') renderCart();
    $(id).classList.add('active');
  }
  function closeSheet(id) { $(id).classList.remove('active'); }

  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeSheet(btn.dataset.close))
  );
  document.querySelectorAll('.sheet-backdrop').forEach(backdrop =>
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('active'); })
  );

  // ------------------------------------------------------------------
  // DİĞER
  // ------------------------------------------------------------------
  $('notif-btn').addEventListener('click', () => toast('3 yeni bildirim (demo)', 'ri-notification-3-line'));
  $('btn-copy-qr').addEventListener('click', () => toast('QR menü bağlantısı kopyalandı', 'ri-file-copy-line'));
  document.querySelectorAll('[data-toast]').forEach(el =>
    el.addEventListener('click', () => toast(el.dataset.toast, 'ri-information-line'))
  );

  function toast(msg, icon = 'ri-check-line') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<i class="${icon}"></i><span>${msg}</span>`;
    $('toast-wrap').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2300);
  }

  // ------------------------------------------------------------------
  // BAŞLAT
  // ------------------------------------------------------------------
  renderTables();
  renderProducts();
  renderMenu();
  renderRank();
  setActiveTable('M-01');
});
