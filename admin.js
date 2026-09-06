/* ============================================================
   Bittu Store — admin.js
   Shared admin shell + dashboard/products/orders/sellers/users.
   All admin/*.html pages load app.js then this file.
   ============================================================ */

function renderAdminShell(opts){
  opts = opts || {};
  document.body.classList.add('admin-body');
  const admin = requireAdmin();
  if(!admin) return null;

  const shellMount = document.getElementById('admin-shell-mount');
  const navItems = [
    {key:'dashboard', href:'index.html', label:'📊 Dashboard'},
    {key:'products', href:'products.html', label:'🧺 Products'},
    {key:'orders', href:'orders.html', label:'📦 Orders'},
    {key:'sellers', href:'sellers.html', label:'🏪 Sellers'},
    {key:'users', href:'users.html', label:'👥 Users'}
  ];

  shellMount.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-logo">Bittu<span>Store</span></div>
        <span class="admin-sub">Super Admin</span>
        <nav class="admin-nav">
          ${navItems.map(n=>`<a href="${n.href}" class="${n.key===opts.active?'current':''}">${n.label}</a>`).join('')}
          <div class="divider"></div>
          <a href="../index.html">🛍️ View Store</a>
          <a href="#" id="admin-logout">🚪 Logout</a>
        </nav>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <h1>${opts.title||''}</h1>
          <div style="font-size:13px;font-weight:600;color:var(--ink-soft);">👋 ${admin.name}</div>
        </div>
        <div class="admin-content" id="admin-content"></div>
      </div>
    </div>
  `;
  document.getElementById('admin-logout').addEventListener('click', function(e){
    e.preventDefault();
    clearSession();
    location.href = '../login.html';
  });
  return admin;
}

/* ============================================================ Dashboard ============================================================ */
function initAdminDashboard(){
  if(!renderAdminShell({active:'dashboard', title:'Dashboard'})) return;
  const products = getProducts();
  const orders = getOrders();
  const sellers = getSellers();
  const pendingOrders = orders.filter(o=>o.status==='Pending').length;
  const delivered = orders.filter(o=>o.status==='Delivered').length;
  const pendingProducts = products.filter(p=>p.status==='pending').length;
  const revenue = platformGrossRevenue();
  const commissionLedger = platformCommissionLedger();

  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-icon">🧺</div><div class="kpi-label">Total Products</div><div class="kpi-value">${products.length}</div></div>
      <div class="kpi-card"><div class="kpi-icon">📦</div><div class="kpi-label">Total Orders</div><div class="kpi-value">${orders.length}</div></div>
      <div class="kpi-card"><div class="kpi-icon">🏪</div><div class="kpi-label">Sellers</div><div class="kpi-value">${sellers.length}</div></div>
      <div class="kpi-card"><div class="kpi-icon">✅</div><div class="kpi-label">Delivered Orders</div><div class="kpi-value">${delivered}</div></div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Gross Revenue</div><div class="kpi-value" style="font-size:26px;">${formatINR(revenue)}</div></div>
      <div class="kpi-card"><div class="kpi-icon">🧾</div><div class="kpi-label">Commission Ledger (${Math.round(COMMISSION_RATE*100)}%)</div><div class="kpi-value" style="font-size:26px;color:var(--teal);">${formatINR(commissionLedger)}</div></div>
      <div class="kpi-card"><div class="kpi-icon">⏳</div><div class="kpi-label">Pending Orders</div><div class="kpi-value">${pendingOrders}</div></div>
      <div class="kpi-card"><div class="kpi-icon">🔎</div><div class="kpi-label">Products Awaiting Review</div><div class="kpi-value">${pendingProducts}</div></div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <h3 style="margin-bottom:14px;">Seller Commission Ledger</h3>
      <table class="admin-table">
        <thead><tr><th>Seller</th><th>Shop</th><th>Revenue</th><th>Commission Owed (${Math.round(COMMISSION_RATE*100)}%)</th></tr></thead>
        <tbody>
          ${sellers.map(s=>`
            <tr>
              <td>${s.name}</td>
              <td>${s.shopName||'—'}</td>
              <td>${formatINR(sellerRevenue(s.id))}</td>
              <td style="color:var(--teal);font-weight:700;">${formatINR(sellerCommissionOwed(s.id))}</td>
            </tr>
          `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">No sellers yet</td></tr>`}
        </tbody>
      </table>
    </div>

    ${lowStockProducts(products).length ? `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--coral);">
        <h3 style="margin-bottom:10px;">⚠️ Low Stock Across Store</h3>
        <table class="admin-table">
          <thead><tr><th>Product</th><th>Seller</th><th>Stock Left</th></tr></thead>
          <tbody>
            ${lowStockProducts(products).map(p=>{
              const s = p.sellerId==='STORE' ? 'Bittu Store' : ((getUsers().find(u=>u.id===p.sellerId)||{}).shopName || '—');
              return `<tr><td>${p.name}</td><td>${s}</td><td style="color:var(--coral);font-weight:700;">${p.stock}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <div class="card">
      <h3 style="margin-bottom:14px;">Recent Orders</h3>
      <table class="admin-table">
        <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${orders.slice(-6).reverse().map(o=>{
            const u = getUsers().find(x=>x.id===o.userId);
            return `<tr>
              <td style="font-family:var(--f-mono)">${o.id}</td>
              <td>${u?u.name:'—'}</td>
              <td>${formatINR(o.total)}</td>
              <td><span class="pill pill-${o.status.toLowerCase()}">${o.status}</span></td>
              <td>${new Date(o.date).toLocaleDateString('en-IN')}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">No orders yet</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================ Products management + moderation ============================================================ */
function initAdminProducts(){
  if(!renderAdminShell({active:'products', title:'Products'})) return;
  const content = document.getElementById('admin-content');

  content.innerHTML = `
    <div class="table-toolbar">
      <input type="search" id="admin-product-search" placeholder="Search products...">
      <div style="display:flex;gap:8px;align-items:center;">
        <select id="admin-status-filter">
          <option value="">All Statuses</option>
          <option value="pending">Awaiting Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button class="btn btn-primary" id="add-product-btn">+ Add Product</button>
      </div>
    </div>
    <table class="admin-table">
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Seller</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="admin-products-tbody"></tbody>
    </table>

    <div class="modal-overlay" id="product-modal">
      <div class="modal-box">
        <h3 id="product-modal-title">Add Product</h3>
        <form id="product-form">
          <input type="hidden" id="pf-id">
          <div class="form-group"><label for="pf-name-in">Product Name</label><input id="pf-name-in" required></div>
          <div class="form-row">
            <div class="form-group"><label for="pf-cat">Category</label>
              <select id="pf-cat">${CATEGORY_LIST.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label for="pf-emoji">Icon (emoji)</label><input id="pf-emoji" value="🛍️" maxlength="2"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label for="pf-price">Price (₹)</label><input id="pf-price" type="number" min="1" required></div>
            <div class="form-group"><label for="pf-mrp">MRP (₹)</label><input id="pf-mrp" type="number" min="1" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label for="pf-stock">Stock</label><input id="pf-stock" type="number" min="0" required></div>
            <div class="form-group"><label for="pf-rating">Rating (0-5)</label><input id="pf-rating" type="number" min="0" max="5" step="0.1" required></div>
          </div>
          <div class="form-group"><label for="pf-desc">Description</label><textarea id="pf-desc" rows="3" required></textarea></div>
          <div class="modal-close-row">
            <button type="button" class="btn btn-outline" id="product-modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const tbody = document.getElementById('admin-products-tbody');
  const statusFilter = document.getElementById('admin-status-filter');
  const users = getUsers();

  function sellerLabel(sellerId){
    if(sellerId==='STORE') return 'Bittu Store';
    const s = users.find(u=>u.id===sellerId);
    return s ? (s.shopName || s.name) : '—';
  }
  function statusPill(status){
    const map = {approved:'pill-delivered', pending:'pill-pending', rejected:'pill-cancelled'};
    return `<span class="pill ${map[status]||'pill-pending'}">${status}</span>`;
  }

  function renderTable(filter){
    let list = getProducts();
    if(filter) list = list.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase()));
    if(statusFilter.value) list = list.filter(p=>p.status===statusFilter.value);
    tbody.innerHTML = list.map(p=>`
      <tr>
        <td><img src="${p.image}" alt="${p.name}"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${sellerLabel(p.sellerId)}</td>
        <td>${formatINR(p.price)} <span style="color:var(--ink-soft);text-decoration:line-through;font-size:11px;">${p.mrp>p.price?formatINR(p.mrp):''}</span></td>
        <td>${p.stock}</td>
        <td>${statusPill(p.status)}</td>
        <td style="white-space:nowrap;">
          ${p.status==='pending' ? `
            <button class="icon-btn" data-approve="${p.id}" title="Approve">✅</button>
            <button class="icon-btn" data-reject="${p.id}" title="Reject">🚫</button>
          ` : ''}
          <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${p.id}" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);">No products found</td></tr>`;
  }
  renderTable('');

  document.getElementById('admin-product-search').addEventListener('input', function(){ renderTable(this.value); });
  statusFilter.addEventListener('change', function(){ renderTable(document.getElementById('admin-product-search').value); });

  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  function openModal(product){
    document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
    document.getElementById('pf-id').value = product ? product.id : '';
    document.getElementById('pf-name-in').value = product ? product.name : '';
    document.getElementById('pf-cat').value = product ? product.category : CATEGORY_LIST[0];
    document.getElementById('pf-emoji').value = product ? product.emoji : '🛍️';
    document.getElementById('pf-price').value = product ? product.price : '';
    document.getElementById('pf-mrp').value = product ? product.mrp : '';
    document.getElementById('pf-stock').value = product ? product.stock : '';
    document.getElementById('pf-rating').value = product ? product.rating : '4.0';
    document.getElementById('pf-desc').value = product ? product.desc : '';
    modal.classList.add('show');
  }
  function closeModal(){ modal.classList.remove('show'); }

  document.getElementById('add-product-btn').addEventListener('click', ()=>openModal(null));
  document.getElementById('product-modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const id = document.getElementById('pf-id').value;
    const products = getProducts();
    const emoji = document.getElementById('pf-emoji').value || '🛍️';
    const colors = ['#FFE8B5','#DFF3D8','#FFE1E1','#EAF3FF','#F7E7CE','#E3E0F7','#DFF0FF'];
    const bg = colors[Math.floor(Math.random()*colors.length)];

    const data = {
      name: document.getElementById('pf-name-in').value.trim(),
      category: document.getElementById('pf-cat').value,
      emoji,
      price: Number(document.getElementById('pf-price').value),
      mrp: Number(document.getElementById('pf-mrp').value),
      stock: Number(document.getElementById('pf-stock').value),
      rating: Number(document.getElementById('pf-rating').value),
      desc: document.getElementById('pf-desc').value.trim()
    };

    if(id){
      const idx = products.findIndex(p=>p.id===id);
      products[idx] = {...products[idx], ...data};
    }else{
      const newId = 'P' + (Date.now()).toString().slice(-6);
      products.push({id:newId, image: productImage(emoji, bg, '#FFC93C'), sellerId:'STORE', status:'approved', ...data});
    }
    saveProducts(products);
    closeModal();
    renderTable(document.getElementById('admin-product-search').value);
    toast('Product saved');
  });

  tbody.addEventListener('click', function(e){
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    const approveBtn = e.target.closest('[data-approve]');
    const rejectBtn = e.target.closest('[data-reject]');
    if(editBtn){ openModal(getProduct(editBtn.dataset.edit)); }
    if(delBtn){
      if(confirm('Delete this product? This cannot be undone.')){
        saveProducts(getProducts().filter(p=>p.id!==delBtn.dataset.del));
        renderTable(document.getElementById('admin-product-search').value);
        toast('Product deleted');
      }
    }
    if(approveBtn){
      const products = getProducts();
      const p = products.find(x=>x.id===approveBtn.dataset.approve);
      p.status='approved';
      saveProducts(products);
      renderTable(document.getElementById('admin-product-search').value);
      toast('Product approved — now live on the store');
    }
    if(rejectBtn){
      const products = getProducts();
      const p = products.find(x=>x.id===rejectBtn.dataset.reject);
      p.status='rejected';
      saveProducts(products);
      renderTable(document.getElementById('admin-product-search').value);
      toast('Product rejected');
    }
  });
}

/* ============================================================ Orders management ============================================================ */
function initAdminOrders(){
  if(!renderAdminShell({active:'orders', title:'Orders'})) return;
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="table-toolbar">
      <input type="search" id="admin-order-search" placeholder="Search by order ID or customer...">
    </div>
    <table class="admin-table">
      <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th></tr></thead>
      <tbody id="admin-orders-tbody"></tbody>
    </table>
  `;
  const tbody = document.getElementById('admin-orders-tbody');
  const users = getUsers();

  function renderTable(filter){
    let orders = [...getOrders()].sort((a,b)=> new Date(b.date)-new Date(a.date));
    if(filter){
      const f = filter.toLowerCase();
      orders = orders.filter(o=>{
        const u = users.find(x=>x.id===o.userId);
        return o.id.toLowerCase().includes(f) || (u && u.name.toLowerCase().includes(f));
      });
    }
    tbody.innerHTML = orders.map(o=>{
      const u = users.find(x=>x.id===o.userId);
      return `<tr>
        <td style="font-family:var(--f-mono)">${o.id}</td>
        <td>${u?u.name:'—'}</td>
        <td>${o.items.length} item${o.items.length>1?'s':''}</td>
        <td>${formatINR(o.total)}</td>
        <td>${o.payMethod||'COD'}</td>
        <td>${new Date(o.date).toLocaleDateString('en-IN')}</td>
        <td>
          <select data-status="${o.id}">
            ${['Pending','Shipped','Delivered','Cancelled'].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">No orders found</td></tr>`;
  }
  renderTable('');
  document.getElementById('admin-order-search').addEventListener('input', function(){ renderTable(this.value); });

  tbody.addEventListener('change', function(e){
    const sel = e.target.closest('[data-status]');
    if(sel){
      const orders = getOrders();
      const order = orders.find(o=>o.id===sel.dataset.status);
      order.status = sel.value;
      saveOrders(orders);
      toast('Order status updated');
    }
  });
}

/* ============================================================ Sellers management (vendor approvals) ============================================================ */
function initAdminSellers(){
  if(!renderAdminShell({active:'sellers', title:'Sellers'})) return;
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="table-toolbar">
      <input type="search" id="admin-seller-search" placeholder="Search sellers...">
    </div>
    <table class="admin-table">
      <thead><tr><th>Seller</th><th>Shop</th><th>Email</th><th>Products</th><th>Revenue</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="admin-sellers-tbody"></tbody>
    </table>
  `;
  const tbody = document.getElementById('admin-sellers-tbody');

  function statusPill(status){
    const map = {approved:'pill-delivered', pending:'pill-pending', rejected:'pill-cancelled'};
    return `<span class="pill ${map[status]||'pill-pending'}">${status||'pending'}</span>`;
  }

  function renderTable(filter){
    let sellers = getSellers();
    if(filter){
      const f = filter.toLowerCase();
      sellers = sellers.filter(s=>s.name.toLowerCase().includes(f) || (s.shopName||'').toLowerCase().includes(f));
    }
    tbody.innerHTML = sellers.map(s=>`
      <tr>
        <td>${s.name}</td>
        <td>${s.shopName||'—'}</td>
        <td>${s.email}</td>
        <td>${getSellerProducts(s.id).length}</td>
        <td>${formatINR(sellerRevenue(s.id))}</td>
        <td style="color:var(--teal);font-weight:700;">${formatINR(sellerCommissionOwed(s.id))}</td>
        <td>${statusPill(s.sellerStatus)}</td>
        <td style="white-space:nowrap;">
          ${s.sellerStatus!=='approved' ? `<button class="icon-btn" data-approve="${s.id}" title="Approve seller">✅</button>` : ''}
          ${s.sellerStatus!=='rejected' ? `<button class="icon-btn" data-reject="${s.id}" title="Reject seller">🚫</button>` : ''}
          <button class="icon-btn" data-remove="${s.id}" title="Remove seller">🗑️</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--ink-soft);">No sellers registered yet</td></tr>`;
  }
  renderTable('');
  document.getElementById('admin-seller-search').addEventListener('input', function(){ renderTable(this.value); });

  tbody.addEventListener('click', function(e){
    const approveBtn = e.target.closest('[data-approve]');
    const rejectBtn = e.target.closest('[data-reject]');
    const removeBtn = e.target.closest('[data-remove]');
    if(approveBtn){
      const users = getUsers();
      users.find(u=>u.id===approveBtn.dataset.approve).sellerStatus='approved';
      saveUsers(users);
      renderTable(document.getElementById('admin-seller-search').value);
      toast('Seller approved');
    }
    if(rejectBtn){
      const users = getUsers();
      users.find(u=>u.id===rejectBtn.dataset.reject).sellerStatus='rejected';
      saveUsers(users);
      renderTable(document.getElementById('admin-seller-search').value);
      toast('Seller rejected');
    }
    if(removeBtn){
      if(confirm('Remove this seller account? Their products will remain but be unowned.')){
        saveUsers(getUsers().filter(u=>u.id!==removeBtn.dataset.remove));
        renderTable(document.getElementById('admin-seller-search').value);
        toast('Seller removed');
      }
    }
  });
}

/* ============================================================ Users management ============================================================ */
function initAdminUsers(){
  const admin = renderAdminShell({active:'users', title:'Users'});
  if(!admin) return;
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="table-toolbar">
      <input type="search" id="admin-user-search" placeholder="Search users...">
    </div>
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Orders</th><th>Actions</th></tr></thead>
      <tbody id="admin-users-tbody"></tbody>
    </table>
  `;
  const tbody = document.getElementById('admin-users-tbody');
  const rolePill = {admin:'pill-shipped', seller:'pill-pending', user:'pill-delivered'};

  function renderTable(filter){
    let users = getUsers();
    if(filter){
      const f = filter.toLowerCase();
      users = users.filter(u=>u.name.toLowerCase().includes(f) || u.email.toLowerCase().includes(f));
    }
    const orders = getOrders();
    tbody.innerHTML = users.map(u=>{
      const orderCount = orders.filter(o=>o.userId===u.id).length;
      return `<tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone||'—'}</td>
        <td><span class="pill ${rolePill[u.role]||'pill-delivered'}">${u.role}</span></td>
        <td>${new Date(u.joined).toLocaleDateString('en-IN')}</td>
        <td>${orderCount}</td>
        <td>${u.id!==admin.id ? `<button class="icon-btn" data-del-user="${u.id}" title="Remove user">🗑️</button>` : `<span style="color:var(--ink-soft);font-size:12px;">You</span>`}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);">No users found</td></tr>`;
  }
  renderTable('');
  document.getElementById('admin-user-search').addEventListener('input', function(){ renderTable(this.value); });

  tbody.addEventListener('click', function(e){
    const delBtn = e.target.closest('[data-del-user]');
    if(delBtn){
      if(confirm('Remove this user account?')){
        saveUsers(getUsers().filter(u=>u.id!==delBtn.dataset.delUser));
        renderTable(document.getElementById('admin-user-search').value);
        toast('User removed');
      }
    }
  });
}
