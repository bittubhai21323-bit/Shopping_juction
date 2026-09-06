/* ============================================================
   Bittu Store — seller-graph.js
   Small dependency-free bar graph (plain divs, no canvas/libs)
   used on the seller dashboard for order-status and 7-day sales.
   ============================================================ */

const STATUS_COLORS = {
  Pending:'#FFC93C',
  Shipped:'#0B4C9C',
  Delivered:'#0AA396',
  Cancelled:'#FF5A5F'
};

/**
 * Renders a simple bar graph into #containerId.
 * data: [{label, value, color}]
 */
function renderBarGraph(containerId, data){
  const el = document.getElementById(containerId);
  if(!el) return;
  const max = Math.max(1, ...data.map(d=>d.value));
  el.innerHTML = `
    <div class="bar-graph">
      ${data.map(d=>{
        const pct = Math.round((d.value / max) * 100);
        return `
        <div class="bar-graph-col">
          <span class="bar-graph-value">${d.value}</span>
          <div class="bar-graph-bar" style="height:${Math.max(pct,3)}%; background:${d.color||'var(--teal)'};"></div>
          <span class="bar-graph-label">${d.label}</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* Order-status graph for a seller (or admin, across all sellers) */
function renderSellerOrderStatusGraph(containerId, entries){
  // entries: array of {order:{status}} — from sellerOrderEntries()
  const counts = {Pending:0, Shipped:0, Delivered:0, Cancelled:0};
  entries.forEach(e=>{ if(counts[e.order.status]!==undefined) counts[e.order.status]++; });
  const data = Object.keys(counts).map(k=>({label:k, value:counts[k], color:STATUS_COLORS[k]}));
  renderBarGraph(containerId, data);
}

/* Last-7-days revenue graph for a seller */
function renderSeller7DayGraph(containerId, sellerId){
  const entries = sellerOrderEntries(sellerId);
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date();
    d.setDate(d.getDate()-i);
    days.push({date:d, label:d.toLocaleDateString('en-IN',{weekday:'short'}), value:0});
  }
  entries.forEach(e=>{
    const od = new Date(e.order.date);
    days.forEach(day=>{
      if(od.toDateString()===day.date.toDateString()){ day.value += e.subtotal; }
    });
  });
  renderBarGraph(containerId, days.map(d=>({label:d.label, value:d.value, color:'var(--teal)'})));
}
