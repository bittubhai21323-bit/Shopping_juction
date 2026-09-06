/* ============================================================
   Bittu Store — products.js
   Handles: home page sections, products.html grid + filters,
   product.html detail view.
   ============================================================ */

function renderGridInto(containerId, list, basePath){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(list.length===0){
    el.innerHTML = `<div class="empty-state"><div class="big-emoji">🛍️</div><h3>No products found</h3><p>Try a different search term or category.</p></div>`;
    return;
  }
  el.innerHTML = list.map(p=>productCardHTML(p, basePath)).join('');
}

/* ---------------- Home page ---------------- */
function initHomePage(){
  const products = getApprovedProducts();
  const trending = [...products].sort((a,b)=>b.rating-a.rating).slice(0,8);
  const fresh = [...products].slice(-8).reverse();
  const offers = products.filter(p=>discountPct(p.price,p.mrp)>=15).slice(0,8);

  renderGridInto('trending-grid', trending, '');
  renderGridInto('new-grid', fresh, '');
  renderGridInto('offers-grid', offers.length? offers : products.slice(0,8), '');

  const chipRow = document.getElementById('category-chips');
  if(chipRow){
    chipRow.innerHTML = CATEGORY_LIST.map(c=>{
      const emojiMap = {'Fruits & Veg':'🥦','Dairy & Bakery':'🥛','Snacks':'🍪','Beverages':'🧃','Grocery':'🌾','Personal Care':'🧴','Household':'🧹'};
      return `<a class="chip" href="products.html?cat=${encodeURIComponent(c)}">${emojiMap[c]||'🛍️'} ${c}</a>`;
    }).join('');
  }
  wireProductGridEvents('');
}

/* ---------------- Products listing page ---------------- */
function initProductsPage(){
  const params = new URLSearchParams(location.search);
  let cat = params.get('cat') || '';
  let q = (params.get('q')||'').toLowerCase();
  const searchInput = document.getElementById('header-search-input');

  const catList = document.getElementById('filter-categories');
  const sortSelect = document.getElementById('sort-select');
  const priceMax = document.getElementById('filter-price');
  const priceMaxLabel = document.getElementById('filter-price-label');
  const resultsHeading = document.getElementById('results-heading');
  const clearBtn = document.getElementById('clear-filters');

  catList.innerHTML = CATEGORY_LIST.map(c=>`
    <label class="cat-check">
      <input type="checkbox" value="${c}" ${c===cat?'checked':''}> ${c}
    </label>`).join('');

  function selectedCategories(){
    return Array.from(catList.querySelectorAll('input:checked')).map(i=>i.value);
  }

  function applyFilters(){
    let list = getApprovedProducts();
    const cats = selectedCategories();
    if(cats.length) list = list.filter(p=>cats.includes(p.category));
    if(q) list = list.filter(p=>p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    const maxP = Number(priceMax.value);
    list = list.filter(p=>p.price<=maxP);

    const sortVal = sortSelect.value;
    if(sortVal==='price-asc') list.sort((a,b)=>a.price-b.price);
    else if(sortVal==='price-desc') list.sort((a,b)=>b.price-a.price);
    else if(sortVal==='rating') list.sort((a,b)=>b.rating-a.rating);
    else if(sortVal==='discount') list.sort((a,b)=>discountPct(b.price,b.mrp)-discountPct(a.price,a.mrp));

    resultsHeading.textContent = q
      ? `Results for "${q}" (${list.length})`
      : (cats.length===1 ? `${cats[0]} (${list.length})` : `All Products (${list.length})`);

    renderGridInto('products-grid', list, '');
  }

  catList.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);
  priceMax.addEventListener('input', ()=>{
    priceMaxLabel.textContent = formatINR(priceMax.value);
    applyFilters();
  });
  clearBtn.addEventListener('click', ()=>{
    catList.querySelectorAll('input').forEach(i=>i.checked=false);
    priceMax.value = priceMax.max;
    priceMaxLabel.textContent = formatINR(priceMax.value);
    sortSelect.value='featured';
    if(searchInput) searchInput.value='';
    q='';
    history.replaceState(null,'','products.html');
    applyFilters();
  });

  if(searchInput && q) searchInput.value = q;
  priceMaxLabel.textContent = formatINR(priceMax.value);
  applyFilters();
  wireProductGridEvents('');
}

/* ---------------- Product detail page ---------------- */
function initProductDetailPage(){
  const id = new URLSearchParams(location.search).get('id');
  const product = getProduct(id);
  const wrap = document.getElementById('product-detail');
  const viewer = currentUser();
  const canPreview = product && (product.status==='approved' || (viewer && (viewer.role==='admin' || viewer.id===product.sellerId)));
  if(!canPreview){
    wrap.innerHTML = `<div class="empty-state"><div class="big-emoji">😕</div><h3>Product not found</h3><p>It may have been removed. <a href="products.html">Browse all products</a></p></div>`;
    return;
  }
  document.title = product.name + ' — Bittu Store';
  document.getElementById('crumb-cat').textContent = product.category;
  document.getElementById('crumb-cat').href = 'products.html?cat=' + encodeURIComponent(product.category);
  document.getElementById('crumb-name').textContent = product.name;

  const disc = discountPct(product.price, product.mrp);
  const wished = isWishlisted(product.id);

  wrap.innerHTML = `
    <div class="pd-image">
      <img src="${product.image}" alt="${product.name}">
      ${disc>0?`<span class="price-tag">${disc}% OFF</span>`:''}
    </div>
    <div class="pd-info">
      <span class="product-cat">${product.category}</span>
      <h1>${product.name}</h1>
      <div class="product-rating" style="font-size:14px;margin-bottom:6px;">${starString(product.rating)} <span style="color:var(--ink-soft)">${product.rating} rating</span></div>
      <div class="price-row" style="margin:10px 0;">
        <span class="price-now" style="font-size:28px;">${formatINR(product.price)}</span>
        ${product.mrp>product.price?`<span class="price-was" style="font-size:15px;">${formatINR(product.mrp)}</span>`:''}
        ${disc>0?`<span class="eyebrow" style="color:var(--teal)">SAVE ${disc}%</span>`:''}
      </div>
      <p style="color:var(--ink-soft);line-height:1.6;">${product.desc}</p>
      <p style="font-family:var(--f-mono);font-size:13px;color:${product.stock>5?'var(--teal)':'var(--coral)'};margin:14px 0;">
        ${product.stock===0?'● Out of stock':(product.stock<=5?'● Hurry! Only '+product.stock+' left in stock':'● In stock')}
      </p>
      <div class="qty-row">
        <label for="pd-qty" style="font-weight:600;font-size:13px;">Qty</label>
        <div class="qty-box">
          <button type="button" id="pd-qty-minus" aria-label="Decrease quantity">−</button>
          <input id="pd-qty" type="number" min="1" value="1" max="${product.stock||1}">
          <button type="button" id="pd-qty-plus" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="product-actions" style="margin-top:18px;max-width:420px;">
        <button class="btn btn-outline" id="pd-add" ${product.stock===0?'disabled':''}>Add to Cart</button>
        <button class="btn btn-primary" id="pd-buy" ${product.stock===0?'disabled':''}>Buy Now</button>
      </div>
      <button class="btn btn-coral" id="pd-wish" style="margin-top:12px;">${wished?'❤️ Saved to Wishlist':'🤍 Add to Wishlist'}</button>
    </div>
  `;

  const qtyInput = document.getElementById('pd-qty');
  document.getElementById('pd-qty-minus').addEventListener('click', ()=>{
    qtyInput.value = Math.max(1, Number(qtyInput.value)-1);
  });
  document.getElementById('pd-qty-plus').addEventListener('click', ()=>{
    qtyInput.value = Math.min(Number(qtyInput.max)||99, Number(qtyInput.value)+1);
  });
  document.getElementById('pd-add').addEventListener('click', ()=>{
    addToCart(product.id, Number(qtyInput.value));
  });
  document.getElementById('pd-buy').addEventListener('click', ()=>{
    addToCart(product.id, Number(qtyInput.value));
    location.href = 'checkout.html';
  });
  document.getElementById('pd-wish').addEventListener('click', function(){
    const active = toggleWishlist(product.id);
    this.textContent = active ? '❤️ Saved to Wishlist' : '🤍 Add to Wishlist';
  });

  const related = getApprovedProducts().filter(p=>p.category===product.category && p.id!==product.id).slice(0,4);
  renderGridInto('related-grid', related, '');
  wireProductGridEvents('');

  renderReviewsSection(product.id);
}

/* ---------------- Reviews (product.html) ---------------- */
function renderReviewsSection(productId){
  const reviews = getProductReviews(productId);
  const avg = avgReviewRating(productId);
  const summaryEl = document.getElementById('reviews-summary');
  const listEl = document.getElementById('reviews-list');
  const formWrap = document.getElementById('review-form-wrap');

  summaryEl.innerHTML = `
    <h3 style="margin-bottom:16px;">Customer Reviews</h3>
    <div class="review-summary-row">
      ${avg!==null ? `
        <span class="review-avg-num">${avg}</span>
        <div>
          <div class="stars" style="font-size:16px;">${starString(avg)}</div>
          <span class="form-hint">${reviews.length} review${reviews.length>1?'s':''}</span>
        </div>
      ` : `<p class="form-hint">No reviews yet — be the first to share your thoughts!</p>`}
    </div>
  `;

  listEl.innerHTML = reviews.map(r=>`
    <div class="review-item">
      <div class="rev-head">
        <span class="rev-name">${r.userName}</span>
        <span class="rev-date">${new Date(r.date).toLocaleDateString('en-IN')}</span>
      </div>
      <div class="rev-stars">${starString(r.rating)}</div>
      ${r.comment ? `<div class="rev-comment">${r.comment}</div>` : ''}
    </div>
  `).join('');

  const user = currentUser();
  if(!user){
    formWrap.innerHTML = `<p class="form-hint" style="margin-top:16px;"><a href="login.html">Login</a> to write a review.</p>`;
    return;
  }
  if(hasUserReviewed(productId, user.id)){
    formWrap.innerHTML = `<p class="form-hint" style="margin-top:16px;">✓ You've already reviewed this product. Thanks for the feedback!</p>`;
    return;
  }

  let selectedRating = 0;
  formWrap.innerHTML = `
    <h4 style="margin-top:20px;margin-bottom:10px;font-size:14px;">Write a review</h4>
    <div class="star-select" id="star-select">
      ${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}">★</button>`).join('')}
    </div>
    <div class="form-group">
      <textarea id="review-comment" rows="3" placeholder="Share your experience with this product..."></textarea>
    </div>
    <button class="btn btn-primary" id="submit-review-btn">Submit Review</button>
  `;
  const starBtns = formWrap.querySelectorAll('[data-star]');
  starBtns.forEach(btn=>{
    btn.addEventListener('click', function(){
      selectedRating = Number(this.dataset.star);
      starBtns.forEach(b=>b.classList.toggle('selected', Number(b.dataset.star)<=selectedRating));
    });
  });
  document.getElementById('submit-review-btn').addEventListener('click', function(){
    if(selectedRating===0){
      toast('Please select a star rating');
      return;
    }
    addReview(productId, selectedRating, document.getElementById('review-comment').value);
    toast('Review submitted — thank you!');
    renderReviewsSection(productId);
  });
}
