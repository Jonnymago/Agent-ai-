/* Simple client for waiter PWA */
const API_BASE = '/api';
let ws;
let selectedTable = null;
let order = { tableId: null, items: [] };

function init() {
  loadTables();
  setupWebSocket();
  document.getElementById('refreshBtn').addEventListener('click', () => loadTables());
  document.getElementById('sendOrderBtn').addEventListener('click', sendOrder);
}

function loadTables() {
  fetch(`${API_BASE}/tables`).then(r => r.json()).then(renderTables).catch(console.error);
}

function renderTables(tables) {
  const grid = document.getElementById('tablesGrid');
  grid.innerHTML = '';
  tables.forEach(t => {
    const div = document.createElement('div');
    div.className = `table-card ${t.status}`;
    div.textContent = t.name;
    div.dataset.id = t.id;
    div.addEventListener('click', () => selectTable(t));
    grid.appendChild(div);
  });
}

function selectTable(table) {
  selectedTable = table;
  order.tableId = table.id;
  // Switch to menu screen
  showScreen('menuScreen');
  loadMenu();
}

function loadMenu() {
  fetch(`${API_BASE}/menu`).then(r => r.json()).then(renderMenu).catch(console.error);
}

function renderMenu(menu) {
  const catBar = document.getElementById('categoryBar');
  const prodGrid = document.getElementById('productsGrid');
  catBar.innerHTML = '';
  prodGrid.innerHTML = '';
  const categories = menu.categories || [];
  categories.forEach((cat, idx) => {
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (idx===0 ? ' active' : '');
    btn.textContent = cat.name;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(cat.items);
    });
    catBar.appendChild(btn);
    if (idx===0) renderProducts(cat.items);
  });
}

function renderProducts(items) {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = `${item.price.toFixed(2)} €`;
    card.appendChild(title);
    card.appendChild(price);
    card.addEventListener('click', () => openVariantModal(item));
    grid.appendChild(card);
  });
}

function openVariantModal(item) {
  // Simple prompt for quantity and notes (no modal library)
  const qty = parseInt(prompt(`Quantità per ${item.name}:`, '1')) || 1;
  const notes = prompt('Note (opzionali):', '');
  const line = { id: item.id, name: item.name, price: item.price, qty, notes };
  order.items.push(line);
  updateSummary();
  showScreen('summaryScreen');
}

function updateSummary() {
  const list = document.getElementById('orderList');
  const totalEl = document.getElementById('totalAmount');
  list.innerHTML = '';
  let total = 0;
  order.items.forEach((it, idx) => {
    const li = document.createElement('li');
    li.className = 'order-item';
    li.textContent = `${it.qty}x ${it.name}`;
    const span = document.createElement('span');
    const lineTotal = it.price * it.qty;
    total += lineTotal;
    span.textContent = `${lineTotal.toFixed(2)} €`;
    li.appendChild(span);
    list.appendChild(li);
  });
  totalEl.textContent = `${total.toFixed(2)} €`;
  document.getElementById('sendOrderBtn').disabled = order.items.length===0;
}

function sendOrder() {
  fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  }).then(r=>r.json()).then(resp=>{
    alert('Ordine inviato');
    // reset
    order = { tableId: selectedTable.id, items: [] };
    updateSummary();
    showScreen('tablesScreen');
    loadTables();
  }).catch(err=>{
    console.error(err);
    // offline fallback: store locally
    const pending = JSON.parse(localStorage.getItem('pendingOrders')||'[]');
    pending.push(order);
    localStorage.setItem('pendingOrders', JSON.stringify(pending));
    alert('Connessione assente: ordine salvato localmente');
  });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setupWebSocket() {
  ws = new WebSocket(`ws${location.protocol==='https:'?'s':''}://${location.host}`);
  ws.onopen = ()=> console.log('WS connesso');
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'INIT_STATE') {
      // optional: could sync tables
    } else if (msg.type === 'SETTINGS_UPDATE') {
      // handle totem toggle if needed
    } else if (msg.type === 'STATUS_CHANGED') {
      // could refresh tables
    } else if (msg.type === 'NEW_ORDER') {
      // ignore for waiter UI
    }
  };
  ws.onclose = () => {
    console.log('WS chiuso, riconnessione in 5s');
    setTimeout(setupWebSocket, 5000);
  };
}

window.addEventListener('load', init);
