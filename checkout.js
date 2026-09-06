/* ============================================================
   Bittu Store — checkout.js (checkout.html)
   ============================================================ */

let appliedCouponCode = null;

function initCheckoutPage(){
  const user = requireAuth('login.html');
  if(!user) return;

  const lines = cartLinesWithProducts();
  if(lines.length===0){
    document.getElementById('checkout-layout').style.display='none';
    document.getElementById('checkout-empty').style.display='block';
    return;
  }

  renderSavedAddresses(user);
  renderCheckoutSummary(lines);

  document.getElementById('add-address-toggle').addEventListener('click', ()=>{
    document.getElementById('new-address-form').style.display='block';
    document.getElementById('add-address-toggle').style.display='none';
  });

  document.getElementById('new-address-form').addEventListener('submit', function(e){
    e.preventDefault();
    const addr = {
      id:'A'+Date.now().toString().slice(-6),
      label: document.getElementById('addr-label').value.trim() || 'Home',
      name: document.getElementById('addr-name').value.trim(),
      phone: document.getElementById('addr-phone').value.trim(),
      line1: document.getElementById('addr-line1').value.trim(),
      city: document.getElementById('addr-city').value.trim(),
      state: document.getElementById('addr-state').value.trim(),
      pincode: document.getElementById('addr-pincode').value.trim()
    };
    const users = getUsers();
    const u = users.find(x=>x.id===user.id);
    u.addresses = u.addresses || [];
    u.addresses.push(addr);
    saveUsers(users);
    toast('Address saved');
    this.reset();
    this.style.display='none';
    document.getElementById('add-address-toggle').style.display='inline-flex';
    renderSavedAddresses(u);
  });

  document.getElementById('apply-coupon-btn').addEventListener('click', function(){
    const input = document.getElementById('coupon-input');
    const msg = document.getElementById('coupon-msg');
    const code = input.value.trim().toUpperCase();
    const coupon = getCoupon(code);
    const subtotal = cartTotal();
    if(!coupon){
      appliedCouponCode = null;
      msg.textContent = 'Invalid coupon code.';
      msg.style.color = 'var(--coral)';
    }else if(subtotal < coupon.minOrder){
      appliedCouponCode = null;
      msg.textContent = `This coupon needs a minimum order of ${formatINR(coupon.minOrder)}.`;
      msg.style.color = 'var(--coral)';
    }else{
      appliedCouponCode = code;
      msg.textContent = `✓ Applied — ${coupon.label}`;
      msg.style.color = 'var(--teal)';
      toast('Coupon applied!');
    }
    renderCheckoutSummary(cartLinesWithProducts());
  });

  document.getElementById('place-order-btn').addEventListener('click', function(){
    const selected = document.querySelector('input[name="ship-address"]:checked');
    const errEl = document.getElementById('checkout-error');
    errEl.style.display='none';
    if(!selected){
      errEl.textContent = 'Please select or add a delivery address to continue.';
      errEl.style.display='block';
      return;
    }
    const payMethod = document.querySelector('input[name="pay-method"]:checked').value;
    const users = getUsers();
    const u = users.find(x=>x.id===user.id);
    const addr = u.addresses.find(a=>a.id===selected.value);

    const finalLines = cartLinesWithProducts();
    const subtotal = cartTotal();
    const delivery = subtotal>=399 ? 0 : 30;
    const discount = appliedCouponCode ? couponDiscount(appliedCouponCode, subtotal) : 0;
    const total = Math.max(0, subtotal + delivery - discount);

    const order = {
      id: 'BS' + Date.now().toString().slice(-8),
      userId: user.id,
      items: finalLines.map(l=>({productId:l.productId, name:l.product.name, price:l.product.price, qty:l.qty, image:l.product.image, sellerId:l.product.sellerId})),
      address: addr,
      payMethod,
      subtotal, delivery,
      couponCode: appliedCouponCode || null,
      discount,
      total,
      status:'Pending',
      date: new Date().toISOString()
    };
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    saveCart([]);
    appliedCouponCode = null;
    toast('Order placed successfully! 🎉');
    setTimeout(()=>{ location.href = 'orders.html?placed=' + order.id; }, 500);
  });
}

function renderSavedAddresses(user){
  const wrap = document.getElementById('saved-addresses');
  const list = user.addresses || [];
  if(list.length===0){
    wrap.innerHTML = `<p class="form-hint">No saved addresses yet — add one below.</p>`;
    return;
  }
  wrap.innerHTML = list.map((a,i)=>`
    <label class="address-option">
      <input type="radio" name="ship-address" value="${a.id}" ${i===0?'checked':''}>
      <div>
        <strong>${a.label}</strong> — ${a.name}, ${a.phone}<br>
        <span style="color:var(--ink-soft)">${a.line1}, ${a.city}, ${a.state} - ${a.pincode}</span>
      </div>
    </label>
  `).join('');
}

function renderCheckoutSummary(lines){
  const subtotal = cartTotal();
  const delivery = subtotal>=399 ? 0 : 30;
  const discount = appliedCouponCode ? couponDiscount(appliedCouponCode, subtotal) : 0;
  const total = Math.max(0, subtotal + delivery - discount);

  document.getElementById('checkout-items').innerHTML = lines.map(l=>`
    <div class="summary-row">
      <span>${l.product.name} × ${l.qty}</span>
      <span>${formatINR(l.product.price*l.qty)}</span>
    </div>
  `).join('');
  document.getElementById('checkout-totals').innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${formatINR(subtotal)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>${delivery===0?'FREE':formatINR(delivery)}</span></div>
    ${discount>0 ? `<div class="summary-row" style="color:var(--teal);"><span>Coupon (${appliedCouponCode})</span><span>−${formatINR(discount)}</span></div>` : ''}
    <div class="summary-row summary-total"><span>Total</span><span>${formatINR(total)}</span></div>
  `;
}
