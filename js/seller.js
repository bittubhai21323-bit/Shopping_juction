/* ============================================================
   Bittu Store — seller.js
   Shared seller shell + dashboard/my-products/add-product/orders.
   All seller/*.html pages load app.js, seller-graph.js (dashboard
   only), then this file.
   ============================================================ */

function renderSellerShell(opts){
  opts = opts || {};
  document.body.classList.add('seller-body');
  const seller = requireSeller();
  if(!seller) return null;

  const shellMount = document.getElementById('seller-shell-mount');
  const navItems = [
    {key:'overview', href:'index.html', label:'📊 Overview'},
    {key:'my-products', href:'my-products.html', label:'🧺 My Products'},
    {key:'add-product', href:'add-product.html', label:'➕ Add Product'},
    {key:'orders', href:'orders.html', label:'📦 Orders'}
  ];
  const statusClass = {approved:'approved', pending:'pending', rejected:'rejected'}[seller.sellerStatus] || 'pending';
  const statusLabel = {approved:'Approved', pending:'Pending Review', rejected:'Rejected'}[seller.sellerStatus] || 'Pending Review';

  shellMount.innerHTML = `
    <div class="seller-shell">
      <aside class="seller-sidebar">
        <div class="seller-logo">Bittu<span>Store</span></div>
        <span class="seller-sub">Seller Dashboard</span>
        <div class="seller-shop-badge">
          🏪 <strong>${seller.shopName || seller.name}</strong><br>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </div>
        <nav class="seller-nav">
          ${navItems.map(n=>`<a href="${n.href}" class="${n.key===opts.active?'current':''}">${n.label}</a>`).join('')}
          <div class="divider"></div>
          <a href="../index.html">🛍️ View Store</a>
          <a href="#" id="seller-logout">🚪 Logout</a>
        </nav>
      </aside>
      <div class="seller-main">
        <div class="seller-topbar">
          <h1>${opts.title||''}</h1>
          <div style="font-size:13px;font-weight:600;color:var(--ink-soft);">👋 ${seller.name}</div>
        </div>
        <div class="seller-content" id="seller-content"></div>
      </div>
    </div>
  `;
  document.getElementById('seller-logout').addEventListener('click', function(e){
    e.preventDefault();
    clearSession();
    location.href = '../login.html';
  });
  return seller;
}

function pendingBannerHTML(seller){
  if(seller.sellerStatus==='pending'){
    return `<div class="pending-banner">⏳ Your seller account is awaiting admin approval. You can still add products, but they'll only go live once your account is approved.</div>`;
  }
  if(seller.sellerStatus==='rejected'){
    return `<div class="pending-banner" style="background:#FFE1E1;color:#B3261E;">🚫 Your seller application was not approved. Contact support for details.</div>`;
  }
  return '';
}

/* ============================================================ Overview ============================================================ */
function initSellerDashboard(){
  const seller = renderSellerShell({active:'overview', title:'Overview'});
  if(!seller) return;
  const content = document.getElementById('seller-content');

  const myProducts = getSellerProducts(seller.id);
  const entries = sellerOrderEntries(seller.id);
  const revenue = sellerRevenue(seller.id);
  const commission = sellerCommissionOwed(seller.id);
  const pendingOrders = entries.filter(e=>e.order.status==='Pending').length;

  content.innerHTML = `
    ${pendingBannerHTML(seller)}
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-icon">🧺</div><div class="kpi-label">My Products</div><div class="kpi-value">${myProducts.length}</div></div>
      <div class="kpi-card"><div class="kpi-icon">📦</div><div class="kpi-label">Orders Received</div><div class="kpi-value">${entries.length}</div></div>
      <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Total Revenue</div><div class="kpi-value" style="font-size:26px;">${formatINR(revenue)}</div></div>
      <div class="kpi-card"><div class="kpi-icon">⏳</div><div class="kpi-label">Pending Orders</div><div class="kpi-value">${pendingOrders}</div></div>
    </div>

    <div class="card" style="margin-bottom:24px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
      <div>
        <h3 style="margin-bottom:4px;">Platform Commission</h3>
        <p class="form-hint" style="margin:0;">Bittu Store retains ${Math.round(COMMISSION_RATE*100)}% commission on your sales.</p>
      </div>
      <div style="font-family:var(--f-display);font-size:26px;font-weight:900;color:var(--coral);">− ${formatINR(commission)}</div>
    </div>

    <div style="display:flex;gap:14px;margin-bottom:24px;flex-wrap:wrap;">
      <a href="add-product.html" class="btn btn-primary">➕ Add New Product</a>
      <a href="orders.html" class="btn btn-outline">📦 View Orders</a>
      <a href="my-products.html" class="btn btn-outline">🧺 Manage Products</a>
    </div>

    ${lowStockProducts(myProducts).length ? `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--coral);">
        <h3 style="margin-bottom:10px;">⚠️ Low Stock Alerts</h3>
        ${lowStockProducts(myProducts).map(p=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px;">
            <span>${p.name}</span>
            <span style="color:var(--coral);font-weight:700;">${p.stock} left</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="graph-card">
      <h3>Order Status Breakdown</h3>
      <div id="status-graph"></div>
      <div class="status-legend">
        <span><i style="background:#FFC93C;"></i>Pending</span>
        <span><i style="background:#0B4C9C;"></i>Shipped</span>
        <span><i style="background:#0AA396;"></i>Delivered</span>
        <span><i style="background:#FF5A5F;"></i>Cancelled</span>
      </div>
    </div>

    <div class="graph-card">
      <h3>Last 7 Days — Revenue</h3>
      <div id="sales-graph"></div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:14px;">Recent Orders</h3>
      <table class="admin-table">
        <thead><tr><th>Order ID</th><th>Items</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${entries.slice(-6).reverse().map(e=>`
            <tr>
              <td style="font-family:var(--f-mono)">${e.order.id}</td>
              <td>${e.items.length}</td>
              <td>${formatINR(e.subtotal)}</td>
              <td><span class="pill pill-${e.order.status.toLowerCase()}">${e.order.status}</span></td>
              <td>${new Date(e.order.date).toLocaleDateString('en-IN')}</td>
            </tr>
          `).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">No orders yet</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  renderSellerOrderStatusGraph('status-graph', entries);
  renderSeller7DayGraph('sales-graph', seller.id);
}

/* ============================================================ My Products ============================================================ */
function initSellerMyProducts(){
  const seller = renderSellerShell({active:'my-products', title:'My Products'});
  if(!seller) return;
  const content = document.getElementById('seller-content');

  content.innerHTML = `
    ${pendingBannerHTML(seller)}
    <div class="table-toolbar">
      <input type="search" id="seller-product-search" placeholder="Search your products...">
      <a href="add-product.html" class="btn btn-primary">+ Add Product</a>
    </div>
    <table class="admin-table">
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="seller-products-tbody"></tbody>
    </table>

    <div class="modal-overlay" id="edit-modal">
      <div class="modal-box">
        <h3>Edit Product</h3>
        <form id="edit-form">
          <input type="hidden" id="ef-id">
          <div class="form-group"><label for="ef-name">Product Name</label><input id="ef-name" required></div>
          <div class="form-row">
            <div class="form-group"><label for="ef-price">Price (₹)</label><input id="ef-price" type="number" min="1" required></div>
            <div class="form-group"><label for="ef-mrp">MRP (₹)</label><input id="ef-mrp" type="number" min="1" required></div>
          </div>
          <div class="form-group"><label for="ef-stock">Stock</label><input id="ef-stock" type="number" min="0" required></div>
          <div class="form-group"><label for="ef-desc">Description</label><textarea id="ef-desc" rows="3" required></textarea></div>
          <div class="modal-close-row">
            <button type="button" class="btn btn-outline" id="edit-modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const tbody = document.getElementById('seller-products-tbody');
  function statusPill(status){
    const map = {approved:'pill-delivered', pending:'pill-pending', rejected:'pill-cancelled'};
    return `<span class="pill ${map[status]||'pill-pending'}">${status}</span>`;
  }
  function renderTable(filter){
    let list = getSellerProducts(seller.id);
    if(filter) list = list.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase()));
    tbody.innerHTML = list.map(p=>`
      <tr>
        <td><img src="${p.image}" alt="${p.name}"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${formatINR(p.price)}</td>
        <td>${p.stock}</td>
        <td>${statusPill(p.status)}</td>
        <td>
          <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${p.id}" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">You haven't listed any products yet</td></tr>`;
  }
  renderTable('');
  document.getElementById('seller-product-search').addEventListener('input', function(){ renderTable(this.value); });

  const modal = document.getElementById('edit-modal');
  const form = document.getElementById('edit-form');
  function openEdit(p){
    document.getElementById('ef-id').value = p.id;
    document.getElementById('ef-name').value = p.name;
    document.getElementById('ef-price').value = p.price;
    document.getElementById('ef-mrp').value = p.mrp;
    document.getElementById('ef-stock').value = p.stock;
    document.getElementById('ef-desc').value = p.desc;
    modal.classList.add('show');
  }
  document.getElementById('edit-modal-cancel').addEventListener('click', ()=>modal.classList.remove('show'));
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.classList.remove('show'); });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const id = document.getElementById('ef-id').value;
    const products = getProducts();
    const idx = products.findIndex(p=>p.id===id);
    if(idx<0 || products[idx].sellerId!==seller.id){ toast('You can only edit your own products.'); return; }
    const name = document.getElementById('ef-name').value.trim();
    const price = Number(document.getElementById('ef-price').value);
    const mrp = Number(document.getElementById('ef-mrp').value);
    const stock = Number(document.getElementById('ef-stock').value);
    const desc = document.getElementById('ef-desc').value.trim();
    if(name.length<2 || name.length>100 || !Number.isFinite(price) || price<=0 || !Number.isFinite(mrp) || mrp<price || !Number.isInteger(stock) || stock<0 || desc.length<5 || desc.length>1000){
      toast('Enter valid product details.');
      return;
    }
    products[idx].name = name;
    products[idx].price = price;
    products[idx].mrp = mrp;
    products[idx].stock = stock;
    products[idx].desc = desc;
    products[idx].status = 'pending';
    saveProducts(products);
    modal.classList.remove('show');
    renderTable(document.getElementById('seller-product-search').value);
    toast('Product updated');
  });

  tbody.addEventListener('click', function(e){
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    if(editBtn){ openEdit(getProduct(editBtn.dataset.edit)); }
    if(delBtn){
      if(confirm('Remove this product from your store?')){
        const product = getProduct(delBtn.dataset.del);
        if(!product || product.sellerId!==seller.id){ toast('You can only remove your own products.'); return; }
        saveProducts(getProducts().filter(p=>p.id!==delBtn.dataset.del || p.sellerId!==seller.id));
        renderTable(document.getElementById('seller-product-search').value);
        toast('Product removed');
      }
    }
  });
}

/* ============================================================ Add Product ============================================================ */
function initSellerAddProduct(){
  const seller = renderSellerShell({active:'add-product', title:'Add New Product'});
  if(!seller) return;
  const content = document.getElementById('seller-content');

  content.innerHTML = `
    ${pendingBannerHTML(seller)}
    <div class="card" style="max-width:600px;">
      <h3 style="margin-bottom:16px;">List a new product</h3>
      <form id="add-product-form">
        <div class="form-group"><label for="ap-name">Product Name</label><input id="ap-name" required></div>
        <div class="form-row">
          <div class="form-group"><label for="ap-cat">Category</label>
            <select id="ap-cat">${CATEGORY_LIST.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label for="ap-emoji">Icon (emoji)</label><input id="ap-emoji" value="🛍️" maxlength="2"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="ap-price">Price (₹)</label><input id="ap-price" type="number" min="1" required></div>
          <div class="form-group"><label for="ap-mrp">MRP (₹)</label><input id="ap-mrp" type="number" min="1" required></div>
        </div>
        <div class="form-group"><label for="ap-stock">Stock Quantity</label><input id="ap-stock" type="number" min="0" required></div>
        <div class="form-group"><label for="ap-desc">Description</label><textarea id="ap-desc" rows="4" required placeholder="Describe your product for customers..."></textarea></div>
        <p class="form-hint" style="margin-bottom:14px;">📋 New listings are reviewed by our admin team before they appear on the store — usually within 24 hours.</p>
        <button class="btn btn-primary" type="submit">Submit for Approval</button>
      </form>
    </div>
  `;

  document.getElementById('add-product-form').addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('ap-name').value.trim();
    const category = document.getElementById('ap-cat').value;
    const emoji = document.getElementById('ap-emoji').value.replace(/[<&>"']/g, '').trim().slice(0, 4) || '🛍️';
    const price = Number(document.getElementById('ap-price').value);
    const mrp = Number(document.getElementById('ap-mrp').value);
    const stock = Number(document.getElementById('ap-stock').value);
    const desc = document.getElementById('ap-desc').value.trim();
    if(name.length<2 || name.length>100 || !CATEGORY_LIST.includes(category) || !Number.isFinite(price) || price<=0 || !Number.isFinite(mrp) || mrp<price || !Number.isInteger(stock) || stock<0 || desc.length<5 || desc.length>1000){
      toast('Enter valid product details.');
      return;
    }
    const colors = ['#FFE8B5','#DFF3D8','#FFE1E1','#EAF3FF','#F7E7CE','#E3E0F7','#DFF0FF'];
    const bg = colors[Math.floor(Math.random()*colors.length)];
    const products = getProducts();
    products.push({
      id: 'P' + Date.now().toString().slice(-6),
      name,
      category,
      emoji,
      image: productImage(emoji, bg, '#0AA396'),
      price,
      mrp,
      stock,
      rating: 0,
      desc,
      sellerId: seller.id,
      status: 'pending'
    });
    saveProducts(products);
    toast('Product submitted for approval!');
    setTimeout(()=>{ location.href='my-products.html'; }, 500);
  });
}

/* ============================================================ Orders + printable slip ============================================================ */
function initSellerOrders(){
  const seller = renderSellerShell({active:'orders', title:'Orders'});
  if(!seller) return;
  const content = document.getElementById('seller-content');

  content.innerHTML = `
    ${pendingBannerHTML(seller)}
    <div class="table-toolbar">
      <input type="search" id="seller-order-search" placeholder="Search by order ID...">
    </div>
    <table class="admin-table">
      <thead><tr><th>Order ID</th><th>Customer</th><th>My Items</th><th>Amount</th><th>Status</th><th>Date</th><th>Slip</th></tr></thead>
      <tbody id="seller-orders-tbody"></tbody>
    </table>

    <div class="slip-overlay" id="slip-overlay">
      <div class="slip-box">
        <h2>🧾 Bittu Store</h2>
        <div class="slip-sub" id="slip-sub"></div>
        <div id="slip-body"></div>
        <div class="slip-actions">
          <button class="btn btn-outline btn-block" id="slip-close" type="button">Close</button>
          <button class="btn btn-primary btn-block" id="slip-print" type="button">🖨️ Print / Save PDF</button>
        </div>
      </div>
    </div>
  `;

  const users = getUsers();
  function renderTable(filter){
    let entries = sellerOrderEntries(seller.id).sort((a,b)=> new Date(b.order.date)-new Date(a.order.date));
    if(filter){
      const f = filter.toLowerCase();
      entries = entries.filter(e=>e.order.id.toLowerCase().includes(f));
    }
    document.getElementById('seller-orders-tbody').innerHTML = entries.map(e=>{
      const cust = users.find(u=>u.id===e.order.userId);
      return `<tr>
        <td style="font-family:var(--f-mono)">${e.order.id}</td>
        <td>${cust?cust.name:'—'}</td>
        <td>${e.items.length}</td>
        <td>${formatINR(e.subtotal)}</td>
        <td><span class="pill pill-${e.order.status.toLowerCase()}">${e.order.status}</span></td>
        <td>${new Date(e.order.date).toLocaleDateString('en-IN')}</td>
        <td><button class="icon-btn" data-slip="${e.order.id}" title="View slip">🧾</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">No orders yet</td></tr>`;
  }
  renderTable('');
  document.getElementById('seller-order-search').addEventListener('input', function(){ renderTable(this.value); });

  const overlay = document.getElementById('slip-overlay');
  document.getElementById('slip-close').addEventListener('click', ()=>overlay.classList.remove('show'));
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.classList.remove('show'); });
  document.getElementById('slip-print').addEventListener('click', ()=>window.print());

  document.getElementById('seller-orders-tbody').addEventListener('click', function(e){
    const btn = e.target.closest('[data-slip]');
    if(!btn) return;
    const entry = sellerOrderEntries(seller.id).find(x=>x.order.id===btn.dataset.slip);
    if(!entry) return;
    const cust = users.find(u=>u.id===entry.order.userId);
    document.getElementById('slip-sub').textContent = 'Order Slip — ' + entry.order.id;
    document.getElementById('slip-body').innerHTML = `
      <div class="slip-row"><span>Customer</span><span>${cust?cust.name:'—'}</span></div>
      <div class="slip-row"><span>Date</span><span>${new Date(entry.order.date).toLocaleString('en-IN')}</span></div>
      <div class="slip-row"><span>Delivery Address</span><span style="text-align:right;max-width:60%;">${entry.order.address ? entry.order.address.line1+', '+entry.order.address.city : '—'}</span></div>
      ${entry.items.map(it=>`<div class="slip-row"><span>${it.name} × ${it.qty}</span><span>${formatINR(it.price*it.qty)}</span></div>`).join('')}
      <div class="slip-row" style="font-weight:700;border-bottom:none;"><span>Total (your items)</span><span>${formatINR(entry.subtotal)}</span></div>
      <div class="slip-row" style="border-bottom:none;color:var(--ink-soft);"><span>Payment Method</span><span>${entry.order.payMethod||'COD'}</span></div>
    `;
    overlay.classList.add('show');
  });
}
