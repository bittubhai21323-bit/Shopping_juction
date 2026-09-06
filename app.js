/* ============================================================
   Bittu Store — app.js
   Shared data layer (localStorage-backed) + header/footer render
   Roles: 'user' | 'seller' | 'admin'
   Products carry: sellerId ('STORE' for official store items,
   else a seller's user id) + status ('approved'|'pending'|'rejected')
   ============================================================ */

const LS = {
  products: 'bittu_products',
  users: 'bittu_users',
  session: 'bittu_session',
  wishlist: 'bittu_wishlist_',
  cart: 'bittu_cart_',
  orders: 'bittu_orders',
  reviews: 'bittu_reviews',
  theme: 'bittu_theme'
};

const COMMISSION_RATE = 0.20; // 20% platform commission on seller sales
const LOW_STOCK_THRESHOLD = 5;

/* ---------- coupon codes (demo) ---------- */
const COUPONS = {
  WELCOME10: {type:'percent', value:10, minOrder:0,   label:'10% off your order'},
  FRESH50:   {type:'flat',    value:50, minOrder:399, label:'₹50 off on orders above ₹399'},
  BULK100:   {type:'flat',    value:100,minOrder:999, label:'₹100 off on orders above ₹999'}
};
function getCoupon(code){
  return COUPONS[(code||'').trim().toUpperCase()] || null;
}
function couponDiscount(code, subtotal){
  const c = getCoupon(code);
  if(!c || subtotal < c.minOrder) return 0;
  return c.type==='percent' ? Math.round(subtotal * c.value/100) : c.value;
}

/* ---------- theme (light/dark) ---------- */
function initTheme(){
  const saved = localStorage.getItem(LS.theme) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current==='dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(LS.theme, next);
  const btn = document.getElementById('theme-toggle-btn');
  if(btn) btn.textContent = next==='dark' ? '☀️' : '🌙';
}
initTheme();

/* ---------- tiny storage helpers ---------- */
function lsGet(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch(e){ return fallback; }
}
function lsSet(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

/* ---------- placeholder product art (no external images needed) ---------- */
function productImage(emoji, bg, fg){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <rect width='400' height='400' fill='${bg}'/>
    <circle cx='200' cy='170' r='120' fill='${fg}' opacity='0.55'/>
    <text x='200' y='230' font-size='150' text-anchor='middle' dominant-baseline='middle'>${emoji}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ---------- seed data ---------- */
const CATEGORY_LIST = ['Fruits & Veg','Dairy & Bakery','Snacks','Beverages','Grocery','Personal Care','Household'];

const SEED_PRODUCTS = [
  {name:'Alphonso Mangoes (1kg)', category:'Fruits & Veg', price:249, mrp:320, rating:4.6, stock:24, emoji:'🥭', bg:'#FFE8B5', fg:'#FFC93C', desc:'Sweet, fibre-free Alphonso mangoes picked at peak ripeness. Great for shakes, or just as they are.'},
  {name:'Fresh Spinach Bunch', category:'Fruits & Veg', price:22, mrp:30, rating:4.2, stock:40, emoji:'🥬', bg:'#DFF3D8', fg:'#0AA396', desc:'Locally sourced spinach, hand-picked and washed. Rich in iron, perfect for sabzi or smoothies.'},
  {name:'Royal Gala Apples (4pc)', category:'Fruits & Veg', price:180, mrp:220, rating:4.4, stock:35, emoji:'🍎', bg:'#FFE1E1', fg:'#FF5A5F', desc:'Crisp, juicy Royal Gala apples imported and quality-checked for freshness.'},
  {name:'Farm Fresh Toned Milk (1L)', category:'Dairy & Bakery', price:58, mrp:62, rating:4.7, stock:60, emoji:'🥛', bg:'#EAF3FF', fg:'#0B4C9C', desc:'Pasteurised toned milk delivered fresh daily. Rich in calcium and protein.'},
  {name:'Whole Wheat Brown Bread', category:'Dairy & Bakery', price:45, mrp:50, rating:4.1, stock:28, emoji:'🍞', bg:'#F7E7CE', fg:'#946200', desc:'Soft, fibre-rich brown bread baked fresh every morning at our local bakery.'},
  {name:'Amul Butter (500g)', category:'Dairy & Bakery', price:255, mrp:270, rating:4.8, stock:18, emoji:'🧈', bg:'#FFF3C4', fg:'#E8AC0E', desc:'Creamy, delicious butter — a breakfast table staple loved across India.'},
  {name:'Classic Salted Chips', category:'Snacks', price:20, mrp:20, rating:4.0, stock:120, emoji:'🥔', bg:'#FFEFD6', fg:'#FF8A3D', desc:'Crunchy potato chips with just the right amount of salt.'},
  {name:'Masala Peanuts (200g)', category:'Snacks', price:60, mrp:75, rating:4.3, stock:70, emoji:'🥜', bg:'#F4E3C8', fg:'#C97A2B', desc:'Crunchy roasted peanuts tossed in a tangy homestyle masala.'},
  {name:'Chocolate Chip Cookies', category:'Snacks', price:99, mrp:120, rating:4.5, stock:50, emoji:'🍪', bg:'#EFDDC9', fg:'#946200', desc:'Loaded with chocolate chips, baked crisp on the edges and soft in the centre.'},
  {name:'Assam Masala Chai (250g)', category:'Beverages', price:145, mrp:170, rating:4.6, stock:45, emoji:'🍵', bg:'#F7DFC1', fg:'#B3541E', desc:'Strong Assam tea leaves blended with aromatic whole spices.'},
  {name:'Fresh Orange Juice (1L)', category:'Beverages', price:110, mrp:130, rating:4.2, stock:30, emoji:'🧃', bg:'#FFE3B3', fg:'#FF8A00', desc:'No added sugar, 100% fresh squeezed orange juice.'},
  {name:'Filter Coffee Decoction', category:'Beverages', price:135, mrp:150, rating:4.4, stock:22, emoji:'☕', bg:'#E7D3BE', fg:'#5C3A21', desc:'South Indian filter coffee decoction — just add hot milk.'},
  {name:'Basmati Rice (5kg)', category:'Grocery', price:499, mrp:560, rating:4.7, stock:38, emoji:'🍚', bg:'#F4F1E3', fg:'#B79A4C', desc:'Long-grain aged Basmati rice, aromatic and perfect for biryani.'},
  {name:'Toor Dal (1kg)', category:'Grocery', price:145, mrp:160, rating:4.5, stock:55, emoji:'🫘', bg:'#FFF0C9', fg:'#E8AC0E', desc:'Premium quality toor dal, cleaned and polished.'},
  {name:'Cold-Pressed Groundnut Oil', category:'Grocery', price:210, mrp:240, rating:4.3, stock:33, emoji:'🛢️', bg:'#FBEFD2', fg:'#C97A2B', desc:'Traditionally extracted groundnut oil with rich aroma and flavour.'},
  {name:'Herbal Face Wash (100ml)', category:'Personal Care', price:149, mrp:180, rating:4.1, stock:42, emoji:'🧴', bg:'#DFF3EE', fg:'#0AA396', desc:'Gentle herbal face wash for daily use, suitable for all skin types.'},
  {name:'Ayurvedic Hair Oil (200ml)', category:'Personal Care', price:175, mrp:210, rating:4.4, stock:26, emoji:'🧴', bg:'#E3E0F7', fg:'#5B4B9C', desc:'A traditional blend of herbs to nourish hair from root to tip.'},
  {name:'Sandalwood Soap (Pack of 4)', category:'Personal Care', price:120, mrp:140, rating:4.6, stock:60, emoji:'🧼', bg:'#FDEBD8', fg:'#C97A2B', desc:'Handcrafted soap with a soothing sandalwood fragrance.', seller:true},
  {name:'Dishwash Liquid (500ml)', category:'Household', price:95, mrp:110, rating:4.2, stock:48, emoji:'🧽', bg:'#DFF0FF', fg:'#0B4C9C', desc:'Cuts through grease easily, gentle on hands, lemon fresh scent.', seller:true},
  {name:'Floor Cleaner (1L)', category:'Household', price:130, mrp:150, rating:4.0, stock:37, emoji:'🧹', bg:'#E7F5E1', fg:'#0A7A47', desc:'Disinfectant floor cleaner that leaves a long-lasting fresh fragrance.', seller:true},
  {name:'Cotton Kitchen Towels (Set of 3)', category:'Household', price:180, mrp:220, rating:4.3, stock:29, emoji:'🧺', bg:'#FDEFDD', fg:'#C97A2B', desc:'Super-absorbent, soft cotton towels for everyday kitchen use.', seller:true},
  {name:'Incense Sticks (Sandalwood)', category:'Household', price:60, mrp:70, rating:4.5, stock:80, emoji:'🕯️', bg:'#F1E4D0', fg:'#946200', desc:'Hand-rolled incense sticks with a calm, woody fragrance.', seller:true}
];

function seedIfNeeded(){
  if(!localStorage.getItem(LS.products)){
    const withMeta = SEED_PRODUCTS.map((p,i)=>{
      const {seller, ...rest} = p;
      return {
        id:'P'+(i+1).toString().padStart(3,'0'),
        image: productImage(p.emoji, p.bg, p.fg),
        sellerId: seller ? 'U002' : 'STORE',
        status: 'approved',
        ...rest
      };
    });
    // one demo item awaiting moderation, so admin/products.html has something to review
    withMeta.push({
      id:'P901', name:'Neem & Tulsi Toothpaste (100g)', category:'Personal Care',
      price:85, mrp:99, rating:0, stock:40, desc:'Herbal toothpaste with neem and tulsi extracts for healthy gums.',
      emoji:'🪥', image: productImage('🪥','#DFF3EE','#0AA396'),
      sellerId:'U002', status:'pending'
    });
    lsSet(LS.products, withMeta);
  }
  if(!localStorage.getItem(LS.users)){
    lsSet(LS.users, [
      {id:'U001', name:'Bittu Kushawha', email:'[email protected]', password:'admin123', role:'admin', joined:new Date().toISOString(), addresses:[]},
      {id:'U002', name:'Rahul Verma', email:'[email protected]', phone:'9812345670', password:'seller123', role:'seller', shopName:'Fresh Mart', sellerStatus:'approved', joined:new Date().toISOString(), addresses:[]}
    ]);
  }
  if(!localStorage.getItem(LS.orders)){
    lsSet(LS.orders, []);
  }
}
seedIfNeeded();

/* ---------- migration: keep older saved data compatible with the new schema ---------- */
function migrateData(){
  let changed = false;
  const products = getProducts();
  products.forEach(p=>{
    if(p.sellerId===undefined){ p.sellerId='STORE'; changed=true; }
    if(p.status===undefined){ p.status='approved'; changed=true; }
  });
  if(changed) saveProducts(products);

  changed = false;
  const users = getUsers();
  users.forEach(u=>{
    if(!u.role){ u.role='user'; changed=true; }
    if(u.role==='seller' && !u.sellerStatus){ u.sellerStatus='approved'; changed=true; }
    if(!u.addresses){ u.addresses=[]; changed=true; }
  });
  if(changed) saveUsers(users);
}
migrateData();

/* ---------- data accessors ---------- */
function getProducts(){ return lsGet(LS.products, []); }
function getProduct(id){ return getProducts().find(p=>p.id===id); }
function saveProducts(list){ lsSet(LS.products, list); }
function getApprovedProducts(){ return getProducts().filter(p=>p.status==='approved'); }

function getUsers(){ return lsGet(LS.users, []); }
function saveUsers(list){ lsSet(LS.users, list); }
function getSellers(){ return getUsers().filter(u=>u.role==='seller'); }
function getSeller(id){ return getUsers().find(u=>u.id===id && u.role==='seller'); }

function getOrders(){ return lsGet(LS.orders, []); }
function saveOrders(list){ lsSet(LS.orders, list); }

/* ---------- seller helpers ---------- */
function getSellerProducts(sellerId){ return getProducts().filter(p=>p.sellerId===sellerId); }
function sellerOrderEntries(sellerId){
  // returns [{order, items, subtotal}] — only the items within each order that belong to this seller
  return getOrders().map(o=>{
    const items = o.items.filter(it=>it.sellerId===sellerId);
    if(items.length===0) return null;
    const subtotal = items.reduce((s,it)=>s+it.price*it.qty,0);
    return {order:o, items, subtotal};
  }).filter(Boolean);
}
function sellerRevenue(sellerId){
  return sellerOrderEntries(sellerId).reduce((s,e)=>s+e.subtotal,0);
}
function sellerCommissionOwed(sellerId){
  return Math.round(sellerRevenue(sellerId) * COMMISSION_RATE);
}
function platformGrossRevenue(){
  return getOrders().reduce((s,o)=>s+o.total,0);
}
function platformCommissionLedger(){
  return getSellers().reduce((s,sel)=>s+sellerCommissionOwed(sel.id),0);
}
function lowStockProducts(list, threshold){
  return (list||getProducts()).filter(p=>p.status==='approved' && p.stock>0 && p.stock<=(threshold||LOW_STOCK_THRESHOLD));
}

/* ---------- product reviews ---------- */
function getReviews(){ return lsGet(LS.reviews, []); }
function saveReviews(list){ lsSet(LS.reviews, list); }
function getProductReviews(productId){
  return getReviews().filter(r=>r.productId===productId).sort((a,b)=> new Date(b.date)-new Date(a.date));
}
function avgReviewRating(productId){
  const revs = getProductReviews(productId);
  if(revs.length===0) return null;
  return Math.round((revs.reduce((s,r)=>s+r.rating,0)/revs.length)*10)/10;
}
function addReview(productId, rating, comment){
  const u = currentUser();
  if(!u) return false;
  const reviews = getReviews();
  reviews.push({
    id:'R'+Date.now().toString().slice(-8),
    productId, userId:u.id, userName:u.name,
    rating:Number(rating), comment:(comment||'').trim(),
    date:new Date().toISOString()
  });
  saveReviews(reviews);
  return true;
}
function hasUserReviewed(productId, userId){
  return getReviews().some(r=>r.productId===productId && r.userId===userId);
}

/* ---------- session / auth ---------- */
function getSession(){ return lsGet(LS.session, null); }
function setSession(userId){ lsSet(LS.session, {userId}); }
function clearSession(){ localStorage.removeItem(LS.session); }
function currentUser(){
  const s = getSession();
  if(!s) return null;
  return getUsers().find(u=>u.id===s.userId) || null;
}
function requireAuth(redirectTo){
  const u = currentUser();
  if(!u){
    const next = encodeURIComponent(location.pathname.split('/').pop());
    location.href = (redirectTo||'login.html') + '?next=' + next;
  }
  return u;
}
function logout(){
  clearSession();
  toast('Logged out');
  setTimeout(()=>{ location.href = 'index.html'; }, 400);
}
function requireAdmin(){
  const u = currentUser();
  if(!u || u.role!=='admin'){
    location.href = '../login.html';
  }
  return u;
}
function requireSeller(){
  const u = currentUser();
  if(!u || u.role!=='seller'){
    location.href = '../login.html';
  }
  return u;
}

/* ---------- cart (per user, or guest bucket) ---------- */
function cartKey(){
  const u = currentUser();
  return LS.cart + (u ? u.id : 'guest');
}
function getCart(){ return lsGet(cartKey(), []); }
function saveCart(cart){ lsSet(cartKey(), cart); }
function addToCart(productId, qty){
  qty = qty || 1;
  const cart = getCart();
  const line = cart.find(l=>l.productId===productId);
  if(line){ line.qty += qty; } else { cart.push({productId, qty}); }
  saveCart(cart);
  updateHeaderCounts();
  toast('Added to cart 🛒');
}
function updateCartQty(productId, qty){
  let cart = getCart();
  if(qty<=0){ cart = cart.filter(l=>l.productId!==productId); }
  else{
    const line = cart.find(l=>l.productId===productId);
    if(line) line.qty = qty;
  }
  saveCart(cart);
  updateHeaderCounts();
}
function removeFromCart(productId){ updateCartQty(productId, 0); }
function cartCount(){ return getCart().reduce((s,l)=>s+l.qty,0); }
function cartLinesWithProducts(){
  return getCart().map(l=>({...l, product:getProduct(l.productId)})).filter(l=>l.product);
}
function cartTotal(){
  return cartLinesWithProducts().reduce((s,l)=>s + l.product.price*l.qty, 0);
}

/* ---------- wishlist ---------- */
function wishlistKey(){
  const u = currentUser();
  return LS.wishlist + (u ? u.id : 'guest');
}
function getWishlist(){ return lsGet(wishlistKey(), []); }
function isWishlisted(productId){ return getWishlist().includes(productId); }
function toggleWishlist(productId){
  let w = getWishlist();
  if(w.includes(productId)){ w = w.filter(id=>id!==productId); }
  else{ w.push(productId); toast('Saved to wishlist ❤️'); }
  lsSet(wishlistKey(), w);
  updateHeaderCounts();
  return w.includes(productId);
}

/* ---------- formatting helpers ---------- */
function formatINR(n){ return '₹' + Number(n).toLocaleString('en-IN'); }
function starString(rating){
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5-full);
}
function discountPct(price, mrp){
  if(!mrp || mrp<=price) return 0;
  return Math.round(((mrp-price)/mrp)*100);
}

/* ---------- toast ---------- */
function toast(msg){
  let el = document.querySelector('.toast');
  if(!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), 2200);
}

/* ---------- product card markup (shared by index/products/wishlist) ---------- */
function productCardHTML(p, basePath){
  basePath = basePath || '';
  const disc = discountPct(p.price, p.mrp);
  const wished = isWishlisted(p.id);
  return `
  <div class="product-card" data-id="${p.id}">
    <div class="product-thumb">
      <a href="${basePath}product.html?id=${p.id}"><img src="${p.image}" alt="${p.name}" loading="lazy"></a>
      ${disc>0 ? `<span class="price-tag">${disc}% OFF</span>` : ''}
      <button class="wishlist-btn ${wished?'active':''}" data-wish="${p.id}" aria-label="Toggle wishlist">${wished?'❤️':'🤍'}</button>
      ${p.stock<=5 ? `<span class="stock-flag">${p.stock===0?'Out of stock':'Only '+p.stock+' left'}</span>` : ''}
    </div>
    <div class="product-body">
      <span class="product-cat">${p.category}</span>
      <a href="${basePath}product.html?id=${p.id}" class="product-name">${p.name}</a>
      <span class="product-rating">${starString(p.rating)} <span style="color:var(--ink-soft)">(${p.rating})</span></span>
      <div class="price-row">
        <span class="price-now">${formatINR(p.price)}</span>
        ${p.mrp>p.price ? `<span class="price-was">${formatINR(p.mrp)}</span>` : ''}
      </div>
      <div class="product-actions">
        <button class="btn btn-outline" data-add="${p.id}" ${p.stock===0?'disabled':''}>Add to Cart</button>
        <button class="btn btn-primary" data-buy="${p.id}" ${p.stock===0?'disabled':''}>Buy Now</button>
      </div>
    </div>
  </div>`;
}

function wireProductGridEvents(basePath){
  document.addEventListener('click', function(e){
    const wishBtn = e.target.closest('[data-wish]');
    if(wishBtn){
      const active = toggleWishlist(wishBtn.dataset.wish);
      wishBtn.classList.toggle('active', active);
      wishBtn.textContent = active ? '❤️' : '🤍';
      return;
    }
    const addBtn = e.target.closest('[data-add]');
    if(addBtn){
      addToCart(addBtn.dataset.add, 1);
      return;
    }
    const buyBtn = e.target.closest('[data-buy]');
    if(buyBtn){
      addToCart(buyBtn.dataset.buy, 1);
      location.href = (basePath||'') + 'checkout.html';
      return;
    }
  });
}

/* ============================================================
   Header / Footer (injected so every page stays in sync)
   ============================================================ */
function renderHeader(opts){
  opts = opts || {};
  const basePath = opts.basePath || '';
  const active = opts.active || '';
  const mount = document.getElementById('site-header-mount');
  if(!mount) return;
  const u = currentUser();

  let roleLink = '';
  if(u && u.role==='admin'){
    roleLink = `<a href="${basePath}${basePath?'':'admin/'}index.html" style="color:var(--coral)">Admin Panel</a>`;
  }else if(u && u.role==='seller'){
    roleLink = `<a href="${basePath}${basePath?'':'seller/'}index.html" style="color:var(--teal)">Seller Dashboard</a>`;
  }

  mount.innerHTML = `
    <div class="announce">🚚 Free delivery on orders above ₹399 &nbsp;•&nbsp; Fresh from your neighbourhood store, Bittu Store</div>
    <header class="site-header">
      <div class="header-row">
        <a href="${basePath}index.html" class="logo">Bittu<span>Store</span><small>kirana, delivered</small></a>
        <form class="search-form" role="search" id="header-search-form">
          <input type="search" id="header-search-input" placeholder="Search for atta, milk, snacks..." aria-label="Search products" autocomplete="off">
          <button type="submit" aria-label="Search">🔍</button>
          <div class="search-suggestions" id="search-suggestions"></div>
        </form>
        <div class="header-actions">
          <button type="button" id="theme-toggle-btn" class="header-icon-link" style="border:0;background:none;font-size:18px;" aria-label="Toggle dark mode">${(localStorage.getItem(LS.theme)||'light')==='dark'?'☀️':'🌙'}</button>
          <a href="${basePath}${u?'profile.html':'login.html'}" class="header-icon-link">
            <span class="ico">👤</span><span>${u ? u.name.split(' ')[0] : 'Login'}</span>
          </a>
          <a href="${basePath}wishlist.html" class="header-icon-link">
            <span class="ico">🤍</span><span>Wishlist</span>
            <span class="badge-count" id="wishlist-count">0</span>
          </a>
          <a href="${basePath}cart.html" class="header-icon-link">
            <span class="ico">🛒</span><span>Cart</span>
            <span class="badge-count" id="cart-count">0</span>
          </a>
        </div>
      </div>
      <nav class="category-nav">
        <div class="container">
          <a href="${basePath}products.html" class="${active==='all'?'active':''}">All Products</a>
          ${CATEGORY_LIST.map(c=>`<a href="${basePath}products.html?cat=${encodeURIComponent(c)}">${c}</a>`).join('')}
          <a href="${basePath}support.html">Help</a>
          ${roleLink}
        </div>
      </nav>
    </header>
  `;

  const form = document.getElementById('header-search-form');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const q = document.getElementById('header-search-input').value.trim();
    location.href = basePath + 'products.html' + (q ? '?q='+encodeURIComponent(q) : '');
  });

  const searchInput = document.getElementById('header-search-input');
  const suggestBox = document.getElementById('search-suggestions');
  searchInput.addEventListener('input', function(){
    const q = this.value.trim().toLowerCase();
    if(q.length < 2){ suggestBox.innerHTML=''; suggestBox.classList.remove('show'); return; }
    const matches = getApprovedProducts().filter(p=>p.name.toLowerCase().includes(q)).slice(0,6);
    if(matches.length===0){ suggestBox.innerHTML=''; suggestBox.classList.remove('show'); return; }
    suggestBox.innerHTML = matches.map(p=>`
      <a href="${basePath}product.html?id=${p.id}" class="suggest-row">
        <img src="${p.image}" alt="">
        <span>${p.name}</span>
        <span class="suggest-price">${formatINR(p.price)}</span>
      </a>
    `).join('');
    suggestBox.classList.add('show');
  });
  document.addEventListener('click', function(e){
    if(!form.contains(e.target)){ suggestBox.classList.remove('show'); }
  });

  const themeBtn = document.getElementById('theme-toggle-btn');
  if(themeBtn) themeBtn.addEventListener('click', toggleTheme);

  updateHeaderCounts();
}

function updateHeaderCounts(){
  const cc = document.getElementById('cart-count');
  const wc = document.getElementById('wishlist-count');
  if(cc) cc.textContent = cartCount();
  if(wc) wc.textContent = getWishlist().length;
}

function renderFooter(opts){
  opts = opts || {};
  const basePath = opts.basePath || '';
  const mount = document.getElementById('site-footer-mount');
  if(!mount) return;
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <h4>Bittu Store</h4>
            <p>Your neighbourhood kirana store, now online. Fresh groceries, daily essentials and local favourites — delivered to your door.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="${basePath}products.html">All Products</a></li>
              <li><a href="${basePath}products.html?cat=Fruits%20%26%20Veg">Fruits &amp; Veg</a></li>
              <li><a href="${basePath}products.html?cat=Grocery">Grocery</a></li>
              <li><a href="${basePath}wishlist.html">Wishlist</a></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><a href="${basePath}profile.html">My Profile</a></li>
              <li><a href="${basePath}orders.html">My Orders</a></li>
              <li><a href="${basePath}cart.html">My Cart</a></li>
              <li><a href="${basePath}login.html">Login / Sign up</a></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><a href="${basePath}support.html">Help Centre</a></li>
              <li>Mon–Sun, 7am – 11pm</li>
              <li>[email protected]</li>
              <li>+91 98765 43210</li>
            </ul>
          </div>
        </div>

        <div class="seller-cta">
          <div>
            <h4 style="margin:0 0 4px;">📦 Want to sell your products on Bittu Store?</h4>
            <p style="margin:0;">Reach out to our seller support team, or register directly — we'll help you get listed.</p>
          </div>
          <ul class="seller-contact-list">
            <li>📞 <a href="tel:+916203213464">+91 62032 13464</a></li>
            <li>💬 <a href="https://wa.me/916203113464" target="_blank" rel="noopener">WhatsApp: +91 62031 13464</a></li>
            <li>✉️ <a href="mailto:[email protected]">[email protected]</a></li>
          </ul>
          <a href="${basePath}login.html?mode=signup&seller=1" class="btn btn-primary btn-sm">Become a Seller</a>
        </div>

        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Bittu Store. All rights reserved.</span>
          <span>Made with ❤️ for the neighbourhood.</span>
        </div>
      </div>
    </footer>
  `;
}
