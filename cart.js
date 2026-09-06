/* ============================================================
   Bittu Store — cart.js (cart.html)
   ============================================================ */

function renderCartPage(){
  const lines = cartLinesWithProducts();
  const listEl = document.getElementById('cart-list');
  const summaryEl = document.getElementById('cart-summary');
  const emptyEl = document.getElementById('cart-empty');
  const layoutEl = document.getElementById('cart-layout');

  if(lines.length===0){
    layoutEl.style.display='none';
    emptyEl.style.display='block';
    return;
  }
  layoutEl.style.display='grid';
  emptyEl.style.display='none';

  listEl.innerHTML = lines.map(l=>`
    <div class="cart-line" data-id="${l.productId}">
      <img src="${l.product.image}" alt="${l.product.name}">
      <div class="cart-line-info">
        <a href="product.html?id=${l.productId}" class="product-name">${l.product.name}</a>
        <span class="product-cat">${l.product.category}</span>
        <span class="price-now">${formatINR(l.product.price)}</span>
        <button class="link-remove" data-remove="${l.productId}">Remove</button>
      </div>
      <div class="qty-box">
        <button type="button" data-dec="${l.productId}" aria-label="Decrease quantity">−</button>
        <input type="number" min="1" max="${l.product.stock}" value="${l.qty}" data-qty="${l.productId}">
        <button type="button" data-inc="${l.productId}" aria-label="Increase quantity">+</button>
      </div>
      <div class="cart-line-total price-now">${formatINR(l.product.price * l.qty)}</div>
    </div>
  `).join('');

  const subtotal = cartTotal();
  const delivery = subtotal >= 399 || subtotal===0 ? 0 : 30;
  const total = subtotal + delivery;

  summaryEl.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${formatINR(subtotal)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>${delivery===0?'FREE':formatINR(delivery)}</span></div>
    ${delivery>0?`<p class="form-hint">Add ${formatINR(399-subtotal)} more for free delivery</p>`:''}
    <div class="summary-row summary-total"><span>Total</span><span>${formatINR(total)}</span></div>
    <a href="checkout.html" class="btn btn-primary btn-block">Proceed to Checkout</a>
    <a href="products.html" class="btn btn-outline btn-block" style="margin-top:10px;">Continue Shopping</a>
  `;
}

document.addEventListener('click', function(e){
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  const rem = e.target.closest('[data-remove]');
  if(inc){
    const cart = getCart();
    const line = cart.find(l=>l.productId===inc.dataset.inc);
    const prod = getProduct(inc.dataset.inc);
    if(line && prod && line.qty < prod.stock){ updateCartQty(inc.dataset.inc, line.qty+1); renderCartPage(); }
  }
  if(dec){
    const cart = getCart();
    const line = cart.find(l=>l.productId===dec.dataset.dec);
    if(line){ updateCartQty(dec.dataset.dec, line.qty-1); renderCartPage(); }
  }
  if(rem){
    removeFromCart(rem.dataset.remove);
    toast('Removed from cart');
    renderCartPage();
  }
});
document.addEventListener('change', function(e){
  const qtyInput = e.target.closest('[data-qty]');
  if(qtyInput){
    const val = Math.max(1, Number(qtyInput.value)||1);
    updateCartQty(qtyInput.dataset.qty, val);
    renderCartPage();
  }
});
