// ---------- Config ----------
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SPARK_CHARS = ['▁','▂','▃','▄','▅','▆','▇','█'];

const state = {
  products: [],       // [{id, name, base, growth, weekendBoost}]
  salesByProduct: {}, // { product_id: [{date, value, dow}, ...] }
  forecasts: {},      // { product_id: forecastObject }
  productIdx: 0,
  activeAdjustment: 1,
  activeCap: null,
  uploadedImages: {}, // { product_id: dataURL }
};

// ---------- CSV loading ----------
async function loadCSV(path) {
  const res = await fetch(path);
  const text = await res.text();
  const [headerLine, ...lines] = text.trim().split('\n');
  const headers = headerLine.split(',').map(h => h.trim());
  return lines
    .filter(l => l.trim().length > 0)
    .map(line => {
      const cells = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] ? cells[i].trim() : ''; });
      return row;
    });
}

async function loadData() {
  const [productRows, salesRows] = await Promise.all([
    loadCSV('data/products.csv'),
    loadCSV('data/sales_history.csv'),
  ]);

  state.products = productRows.map(r => ({
    id: r.product_id,
    name: r.name,
    base: parseFloat(r.base_units),
    growth: parseFloat(r.daily_growth),
    weekendBoost: parseFloat(r.weekend_boost),
    emoji: r.emoji || '☕',
  }));

  state.products.forEach(p => { state.salesByProduct[p.id] = []; });
  salesRows.forEach(r => {
    const date = new Date(r.date);
    const dow = date.getDay();
    if (state.salesByProduct[r.product_id]) {
      state.salesByProduct[r.product_id].push({ date, value: parseInt(r.units_sold, 10), dow });
    }
  });

  state.products.forEach(p => {
    state.salesByProduct[p.id].sort((a, b) => a.date - b.date);
    state.forecasts[p.id] = forecast(state.salesByProduct[p.id]);
  });
}

// ---------- Stats helpers ----------
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
}

// ---------- Forecasting ----------
function forecast(data) {
  const values = data.map(x => x.value);
  const histAvg = mean(values);
  const recent7 = mean(values.slice(-7));
  const std = stddev(values);

  // Forecast the day after the dataset's own last recorded date —
  // this is real historical data, so "tomorrow" is relative to it, not to today's real-world date.
  const lastDate = data[data.length - 1].date;
  const tomorrow = new Date(lastDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDow = tomorrow.getDay();

  const dowVals = data.filter(x => x.dow === targetDow).map(x => x.value);
  const dowAvg = dowVals.length ? mean(dowVals) : histAvg;
  const dowFactor = dowAvg / histAvg;

  const predicted = Math.max(1, Math.round(recent7 * dowFactor));
  const trendPct = ((recent7 - histAvg) / histAvg) * 100;

  return {
    predicted,
    histAvg: Math.round(histAvg),
    recent7: Math.round(recent7),
    dowFactor,
    trendPct,
    sampleSize: dowVals.length,
    std: Math.round(std),
    lower: Math.max(0, Math.round(predicted - std)),
    upper: Math.round(predicted + std),
    targetDow,
    forecastDate: tomorrow,
  };
}

function confidenceLabel(n) {
  if (n >= 5) return 'high';
  if (n >= 2) return 'medium';
  return 'low';
}

// A short, natural-language read of one product's forecast —
// built only from numbers the model actually computed (no invented weights).
function productSentence(p, f) {
  const pct = f.trendPct;
  const dir = pct >= 0 ? 'up' : 'down';
  const conf = confidenceLabel(f.sampleSize);
  let s = `${p.name} demand is ${dir} ${Math.abs(pct).toFixed(0)}% vs its historical average — `
    + `I'd stock ${f.predicted} units for ${DAY_NAMES[f.targetDow]}. `
    + `Confidence: ${conf} (${f.sampleSize} past ${DAY_NAMES[f.targetDow]}${f.sampleSize === 1 ? '' : 's'} in the data).`;
  if (pct <= -12) {
    const cut = Math.min(25, Math.round(Math.abs(pct) / 1.5));
    s += ` Trending toward excess — consider cutting the order by ~${cut}%.`;
  } else if (pct >= 12) {
    s += ` Demand is climbing — don't undercount tomorrow.`;
  }
  return s;
}

// Scans every product for the biggest riser and biggest decliner —
// the "cold open" line for a live demo.
function buildInsightBanner() {
  let riser = null, decliner = null;
  state.products.forEach(p => {
    const f = state.forecasts[p.id];
    if (!riser || f.trendPct > riser.f.trendPct) riser = { p, f };
    if (!decliner || f.trendPct < decliner.f.trendPct) decliner = { p, f };
  });
  const parts = [];
  if (riser && riser.f.trendPct > 3) {
    parts.push(`${riser.p.name} demand is up ${riser.f.trendPct.toFixed(0)}% this week — `
      + `I'd stock ${riser.f.predicted} units for tomorrow (confidence: ${confidenceLabel(riser.f.sampleSize)}).`);
  }
  if (decliner && decliner.f.trendPct < -3 && (!riser || decliner.p.id !== riser.p.id)) {
    const cut = Math.min(25, Math.round(Math.abs(decliner.f.trendPct) / 1.5));
    parts.push(`${decliner.p.name} is trending toward waste — I'd cut tomorrow's order by ~${cut}%.`);
  }
  return parts.join(' ') || 'Demand is holding steady across the board — no big movers today.';
}

function sparkline(data) {
  const vals = data.slice(-14).map(d => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  return vals.map(v => {
    const idx = max === min ? 4 : Math.round(((v - min) / (max - min)) * (SPARK_CHARS.length - 1));
    return SPARK_CHARS[idx];
  }).join('');
}

// ---------- What-if parsing ----------
function parseWhatIf(text) {
  const t = text.toLowerCase().replace(/[–—]/g, '-');
  if (/weather|rain|heatwave|storm/.test(t) && !/%/.test(t)) return { type: 'unsupported', topic: 'weather' };
  if (/festival|event|holiday/.test(t) && !/%/.test(t)) return { type: 'unsupported', topic: 'festival/event' };
  const capMatch = t.match(/(?:only|limit|cap|available|have|stock(?:ed)? with|stock)\s*(?:of\s*)?(\d+)\s*units?/) || t.match(/(\d+)\s*units?\s*(?:available|in stock|on hand)/);
  if (capMatch) return { type: 'cap', value: Math.max(0, parseInt(capMatch[1], 10)) };
  if (/double|twice/.test(t)) return { type: 'pct', value: 2, pct: 100 };
  if (/half|halve/.test(t)) return { type: 'pct', value: 0.5, pct: -50 };
  const pctMatch = t.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    let pct = parseFloat(pctMatch[1]);
    if (/decrease|drop|down|less|lower|fall|reduce|decreases/.test(t)) pct = -Math.abs(pct);
    if (/increase|rise|up|more|higher|grow|grows/.test(t)) pct = Math.abs(pct);
    return { type: 'pct', value: Math.max(0, 1 + pct / 100), pct };
  }
  return { type: 'unknown' };
}

// ---------- Rendering ----------
function currentProduct() { return state.products[state.productIdx]; }

function renderProductMedia() {
  const p = currentProduct();
  const image = document.getElementById('productImage');
  const placeholder = document.getElementById('mediaPlaceholder');
  if (!image || !placeholder || !p) return;
  const saved = state.uploadedImages[p.id];
  if (saved) {
    image.src = saved;
    image.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    image.removeAttribute('src');
    image.style.display = 'none';
    placeholder.textContent = p.emoji || '☕';
    placeholder.style.display = 'grid';
  }
}

function renderNav() {
  const nav = document.getElementById('productNav');
  const count = document.getElementById('productCount');
  if (count) count.textContent = `${state.products.length} menu items`;
  nav.innerHTML = '';
  state.products.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.textContent = p.name;
    if (i === state.productIdx) btn.classList.add('active');
    btn.onclick = () => {
      state.productIdx = i;
      state.activeAdjustment = 1;
      state.activeCap = null;
      resetAnswer();
      renderAll();
    };
    nav.appendChild(btn);
  });
}

function renderTicket() {
  const p = currentProduct();
  renderProductMedia();
  const f = state.forecasts[p.id];

  document.getElementById('ticketProduct').textContent = p.name.toUpperCase();
  document.getElementById('ticketDate').textContent = 'Forecast for ' + f.forecastDate
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const scenarioNote = state.activeCap !== null
    ? ` Stock cap active: ${state.activeCap} units.`
    : state.activeAdjustment !== 1
      ? ` Scenario adjustment active: ${((state.activeAdjustment - 1) * 100).toFixed(0)}%.`
      : '';
  document.getElementById('managerLine').textContent = productSentence(p, f) + scenarioNote;

  const adjusted = Math.round(f.predicted * state.activeAdjustment);
  const displayVal = state.activeCap !== null ? Math.min(adjusted, state.activeCap) : adjusted;
  document.getElementById('predictedNum').textContent = displayVal + ' units';

  const lo = Math.round(f.lower * state.activeAdjustment), hi = Math.round(f.upper * state.activeAdjustment);
  document.getElementById('rangeText').textContent = `likely ${lo}–${hi} · for ${DAY_NAMES[f.targetDow]}`;

  document.getElementById('sparkline').textContent = sparkline(state.salesByProduct[p.id]);

  const pct = ((f.dowFactor - 1) * 100).toFixed(0);
  const rows = [
    ['Hist. avg (60d)', f.histAvg + ' /day', false],
    ['Recent 7-day avg', f.recent7 + ' /day', false],
    [DAY_NAMES[f.targetDow] + ' adjustment', (pct >= 0 ? '+' : '') + pct + '%', false],
    ['Confidence', confidenceLabel(f.sampleSize) + ` (${f.sampleSize} past ${DAY_NAMES[f.targetDow]}s)`, false],
    ['Weather impact', 'n/a — no data', true],
    ['Festival / event', 'n/a — no data', true],
  ];
  const trail = document.getElementById('reasoningTrail');
  trail.innerHTML = '';
  rows.forEach(([k, v, dim]) => {
    const row = document.createElement('div');
    row.className = 'line-item' + (dim ? ' dim' : '');
    row.innerHTML = `<span class="k">${k}</span><span class="fill"></span><span class="v">${v}</span>`;
    trail.appendChild(row);
  });

  renderCostRows();
}

function renderCostRows() {
  const p = currentProduct();
  const f = state.forecasts[p.id];
  const predicted = Math.round(f.predicted * state.activeAdjustment);
  const margin = parseFloat(document.getElementById('marginInput').value) || 0;
  const waste = parseFloat(document.getElementById('wasteInput').value) || 0;

  const levels = [
    { label: 'Understock', qty: Math.round(predicted * 0.85) },
    { label: 'Balanced', qty: predicted, rec: true },
    { label: 'Overstock', qty: Math.round(predicted * 1.15) },
  ];

  const box = document.getElementById('costRows');
  box.innerHTML = '';
  levels.forEach(l => {
    const diff = l.qty - predicted;
    const cost = diff < 0 ? Math.abs(diff) * margin : diff * waste;
    const row = document.createElement('div');
    row.className = 'cost-row' + (cost > 0 ? ' risk' : '');
    row.innerHTML = `<span class="name">${l.qty} units${l.rec ? '<span class="stamp">recommended</span>' : ''}</span><span class="amt">₹${Math.round(cost).toLocaleString('en-IN')}</span>`;
    box.appendChild(row);
  });
}

function resetAnswer() {
  const box = document.getElementById('answerBox');
  box.classList.remove('show', 'fallback');
  box.innerHTML = '';
  document.getElementById('whatifInput').value = '';
  const title = document.getElementById('scenarioTitle');
  const detail = document.getElementById('scenarioDetail');
  const status = document.querySelector('.scenario-status');
  if (title) title.textContent = 'No scenario applied';
  if (detail) detail.textContent = 'Run a scenario to compare the recommendation with your available stock or expected demand.';
  if (status) status.textContent = 'BASELINE';
}

function handleAsk() {
  const input = document.getElementById('whatifInput');
  const q = input.value.trim();
  if (!q) return;
  const parsed = parseWhatIf(q);
  const box = document.getElementById('answerBox');
  const title = document.getElementById('scenarioTitle');
  const detail = document.getElementById('scenarioDetail');
  const status = document.querySelector('.scenario-status');
  box.classList.add('show');
  box.classList.remove('fallback');
  const p = currentProduct();
  const f = state.forecasts[p.id];
  const base = f.predicted;
  const margin = parseFloat(document.getElementById('marginInput').value) || 0;
  if (parsed.type === 'pct') {
    state.activeAdjustment = parsed.value;
    state.activeCap = null;
    renderAll();
    const newVal = Math.round(base * parsed.value);
    const change = parsed.pct >= 0 ? `increase of ${parsed.pct}%` : `decrease of ${Math.abs(parsed.pct)}%`;
    status.textContent = 'DEMAND CHANGE';
    title.textContent = `${newVal} units recommended`;
    detail.textContent = `The scenario applies a ${change} to the base forecast of ${base} units. Use this as a planning assumption, not a proven prediction.`;
    box.innerHTML = `<div class="h">Scenario applied: ${newVal} units</div><div class="d">Base: ${base} units · Adjusted: ${newVal} units · Change: ${parsed.pct >= 0 ? '+' : ''}${parsed.pct}%</div>`;
  } else if (parsed.type === 'cap') {
    state.activeCap = parsed.value;
    state.activeAdjustment = 1;
    renderAll();
    const recommended = Math.min(base, parsed.value);
    const shortfall = Math.max(0, base - parsed.value);
    const surplus = Math.max(0, parsed.value - base);
    status.textContent = 'STOCK LIMIT';
    title.textContent = shortfall > 0 ? `${shortfall} units potentially uncovered` : `${surplus} units above forecast`;
    detail.textContent = shortfall > 0 ? `Available stock: ${parsed.value}. Base forecast: ${base}. Prioritize replenishment or prepare for possible lost sales.` : `Available stock: ${parsed.value}. Base forecast: ${base}. The limit covers expected demand, with ${surplus} units as a buffer.`;
    box.innerHTML = shortfall > 0 ? `<div class="h">Risk: approximately ${shortfall} units short</div><div class="d">Estimated lost-sales exposure: ₹${Math.round(shortfall * margin).toLocaleString('en-IN')}. Recommended usable stock: ${recommended} units.</div>` : `<div class="h">Covered: ${recommended} units of expected demand</div><div class="d">You have approximately ${surplus} units above the base forecast. Review waste cost before ordering the full amount.</div>`;
  } else if (parsed.type === 'unsupported') {
    box.classList.add('fallback');
    status.textContent = 'DATA LIMITATION';
    title.textContent = `No ${parsed.topic} signal available`;
    detail.textContent = 'The current dataset does not contain a measured weather or event variable, so the dashboard avoids inventing an impact.';
    box.innerHTML = `<div class="h">Cannot calculate a reliable impact</div><div class="d">No ${parsed.topic} data is available. Try a measurable scenario such as “demand increases by 20%” or “only 50 units available”.</div>`;
  } else {
    box.classList.add('fallback');
    status.textContent = 'TRY ANOTHER INPUT';
    title.textContent = 'Scenario not understood';
    detail.textContent = 'Use a percentage change, a stock limit, or one of the quick scenario buttons.';
    box.innerHTML = `<div class="h">Use a computable scenario</div><div class="d">Examples: “increase demand by 15%”, “drop demand 10%”, “only 40 units available”, or “double demand”.</div>`;
  }
}

function renderKpis() {
  const total = state.products.reduce((sum, p) => sum + state.forecasts[p.id].predicted, 0);
  const rising = state.products.filter(p => state.forecasts[p.id].trendPct > 0).length;
  const selected = currentProduct();
  const selectedForecast = selected ? state.forecasts[selected.id].predicted : 0;
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('kpiProducts', state.products.length);
  set('kpiDemand', `${total}u`);
  set('kpiRising', `${rising}/${state.products.length}`);
  set('kpiSelected', `${Math.round(selectedForecast * state.activeAdjustment)}u`);
}

function renderAll() {
  renderNav();
  renderTicket();
  document.getElementById('insightBanner').textContent = buildInsightBanner();
  renderAnalytics();
  renderKpis();
}


// ---------- Visual analytics ----------
function drawLineChart(canvas, values) {
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth || 500, h = 230, dpr = window.devicePixelRatio || 1;
  canvas.width = w*dpr; canvas.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const pad={l:34,r:12,t:18,b:28}, max=Math.max(...values,1), min=0;
  const x=i=>pad.l+i*(w-pad.l-pad.r)/Math.max(values.length-1,1);
  const y = value => h-pad.b-(value-min)/(max-min)*(h-pad.t-pad.b);
  ctx.strokeStyle='#8a6b55'; ctx.lineWidth=1;
  for(let i=0;i<4;i++){const yy=pad.t+i*(h-pad.t-pad.b)/3;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();}
  ctx.fillStyle='#d7c0aa';ctx.font='10px DM Sans';
  for(let i=0;i<4;i++){const val=Math.round(max-(max/3)*i);const yy=pad.t+i*(h-pad.t-pad.b)/3+3;ctx.fillText(val,pad.l-27,yy);}
  ctx.beginPath(); values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));
  ctx.lineTo(x(values.length-1),h-pad.b);ctx.lineTo(x(0),h-pad.b);ctx.closePath();
  ctx.fillStyle='rgba(216,161,109,.16)';ctx.fill();
  ctx.beginPath(); values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));
  ctx.strokeStyle='#d8a16d';ctx.lineWidth=2.5;ctx.stroke();
  values.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3,0,Math.PI*2);ctx.fillStyle='#d8a16d';ctx.fill();});
  ctx.fillStyle='#d7c0aa';ctx.font='10px DM Sans';
  ctx.fillText('14 days ago',pad.l,h-8);ctx.fillText('Latest',w-43,h-8);
}
function drawBarChart(canvas, predicted) {
  const ctx=canvas.getContext('2d'), w=canvas.clientWidth||500,h=230,dpr=window.devicePixelRatio||1;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const vals=[Math.round(predicted*.85),predicted,Math.round(predicted*1.15)], labels=['Under','Recommended','Over'];
  const max=Math.max(...vals,1), base=h-35, chartH=h-65, bw=Math.min(65,w/6);
  ctx.strokeStyle='#8a6b55';ctx.beginPath();ctx.moveTo(25,base);ctx.lineTo(w-20,base);ctx.stroke();
  vals.forEach((v,i)=>{const x=45+i*(w-90)/3, bh=v/max*chartH;ctx.fillStyle=i===1?'#9b6b45':'#b98a61';ctx.beginPath();ctx.roundRect(x,base-bh,bw,bh,7);ctx.fill();ctx.fillStyle='#ead5c0';ctx.font='11px DM Sans';ctx.textAlign='center';ctx.fillText(v+'u',x+bw/2,base-bh-8);ctx.fillStyle='#d7c0aa';ctx.font='10px DM Sans';ctx.fillText(labels[i],x+bw/2,base+18);});
}
function renderAnalytics() {
  const p=currentProduct(), data=state.salesByProduct[p.id]||[], vals=data.slice(-14).map(d=>d.value);
  const trend=document.getElementById('salesTrendChart'), comparison=document.getElementById('stockComparisonChart');
  if(trend && vals.length) drawLineChart(trend,vals);
  if(comparison) drawBarChart(comparison,state.forecasts[p.id].predicted*state.activeAdjustment);
  const peak=data.reduce((a,b)=>b.value>a.value?b:a,data[0]);
  const avg=vals.length?Math.round(mean(vals)):0;
  const f=state.forecasts[p.id];
  document.getElementById('analyticsInsights').innerHTML=`
    <div class="mini-insight"><span class="mini-label">Peak day</span><strong>${peak?peak.value+' units':'—'}</strong><p>${peak?'Highest recorded daily sales in the available history.':'No sales data available.'}</p></div>
    <div class="mini-insight"><span class="mini-label">Recent average</span><strong>${avg} units</strong><p>Average daily demand across the latest 14 recorded days.</p></div>
    <div class="mini-insight"><span class="mini-label">Planning note</span><strong>${f.trendPct>=0?'Watch rising demand':'Watch excess stock'}</strong><p>${f.trendPct>=0?'Recent demand is above the historical average.':'Recent demand is below the historical average.'}</p></div>`;
}


// ---------- Product image upload ----------
const imageInput = document.getElementById('productImageInput');
const clearImageBtn = document.getElementById('clearImageBtn');

if (imageInput) {
  imageInput.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const p = currentProduct();
      state.uploadedImages[p.id] = reader.result;
      renderProductMedia();
    };
    reader.readAsDataURL(file);
  });
}
if (clearImageBtn) {
  clearImageBtn.addEventListener('click', () => {
    const p = currentProduct();
    delete state.uploadedImages[p.id];
    if (imageInput) imageInput.value = '';
    renderProductMedia();
  });
}

// ---------- Wiring ----------
document.getElementById('askBtn').addEventListener('click', handleAsk);
document.getElementById('resetScenarioBtn').addEventListener('click', () => { state.activeAdjustment = 1; state.activeCap = null; resetAnswer(); renderAll(); });
document.getElementById('whatifInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleAsk(); });
document.querySelectorAll('.chips button').forEach(btn => {
  btn.addEventListener('click', () => { document.getElementById('whatifInput').value = btn.dataset.q; handleAsk(); });
});
document.getElementById('marginInput').addEventListener('input', renderCostRows);
document.getElementById('wasteInput').addEventListener('input', renderCostRows);
window.addEventListener('resize', renderAnalytics);

loadData().then(renderAll).catch(err => {
  document.querySelector('.main-content').insertAdjacentHTML(
    'afterbegin',
    `<div style="color:#8E3B34;font-size:12px;margin-bottom:10px;">Couldn't load data/*.csv — open this folder with a local server (see README.md), not directly as a file.</div>`
  );
  console.error(err);
});

// ---------- Local multi-agent chat ----------
function addChatMessage(role, speaker, text) {
  const windowEl = document.getElementById('chatWindow');
  if (!windowEl) return;
  const item = document.createElement('div');
  item.className = `chat-message ${role}`;
  const label = document.createElement('span');
  label.className = 'speaker'; label.textContent = speaker;
  item.appendChild(label);
  item.appendChild(document.createTextNode(text));
  windowEl.appendChild(item);
  windowEl.scrollTop = windowEl.scrollHeight;
}

function agentAnswer(question) {
  const q = question.toLowerCase();
  const p = currentProduct();
  const f = state.forecasts[p.id];
  const data = state.salesByProduct[p.id] || [];
  const recent = data.slice(-7).map(x => x.value);
  const recentAvg = recent.length ? Math.round(mean(recent)) : 0;
  const margin = parseFloat(document.getElementById('marginInput')?.value) || 0;
  const waste = parseFloat(document.getElementById('wasteInput')?.value) || 0;
  const base = f.predicted;

  if (/increase|rise|up|drop|decrease|fall|double|half|only .*units|available/.test(q) && /%|double|half|units?/.test(q)) {
    const parsed = parseWhatIf(question);
    if (parsed.type === 'pct') {
      const next = Math.round(base * parsed.value);
      return `Forecast check: the baseline is ${base} units.\nScenario test: ${parsed.pct >= 0 ? '+' : ''}${parsed.pct}% demand → ${next} units.\nBrewBuddy: use this only as a planning assumption, then check ingredient capacity and the What-if Lab result.`;
    }
    if (parsed.type === 'cap') {
      const shortage = Math.max(0, base - parsed.value);
      return `Stock check: available stock is ${parsed.value} units against a baseline forecast of ${base}.\nBrewBuddy: ${shortage ? `approximately ${shortage} units may be uncovered, representing about ₹${Math.round(shortage * margin)} in unmet-unit exposure.` : 'the available stock covers the baseline forecast.'}`;
    }
  }
  if (/risk|short|waste|overstock|understock/.test(q)) {
    const under = Math.round(base * .85), over = Math.round(base * 1.15);
    return `Risk insight: an understock option is about ${under} units and an overstock option is about ${over} units.\nPotential shortage cost uses ₹${margin} per unmet unit; excess stock uses ₹${waste} per unit. These are editable assumptions.`;
  }
  if (/why|recommend|stock|decision|summarize|summary/.test(q)) {
    const direction = f.trendPct >= 0 ? 'above' : 'below';
    return `Sales insight: the latest 7-day average is ${recentAvg} units, compared with a historical average of ${f.histAvg}.\nForecast insight: the recommended baseline is ${base} units for ${DAY_NAMES[f.targetDow]}.\nBrewBuddy: demand is ${Math.abs(f.trendPct).toFixed(0)}% ${direction} the historical average. Start with ${base} units, review capacity and use the What-if Lab before finalizing.`;
  }
  if (/average|sales|history|trend/.test(q)) {
    return `Sales insight: ${p.name} has a recent 7-day average of ${recentAvg} units and a historical average of ${f.histAvg} units. The recent trend is ${f.trendPct >= 0 ? 'rising' : 'falling'} by about ${Math.abs(f.trendPct).toFixed(0)}% versus the historical average.`;
  }
  return `BrewBuddy: I can help with ${p.name}'s forecast of ${base} units. Try asking “Why should I stock this item?”, “What are the main risks?”, or “What if demand increases by 20%?”`;
}

function handleChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const question = input.value.trim();
  if (!question) return;
  addChatMessage('user', 'You', question);
  addChatMessage('agent', 'Cafelytics Agent Team', agentAnswer(question));
  input.value = '';
}

document.getElementById('chatSend')?.addEventListener('click', handleChat);
document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleChat(); });
document.querySelectorAll('[data-chat]').forEach(btn => btn.addEventListener('click', () => {
  const input = document.getElementById('chatInput');
  input.value = btn.dataset.chat; handleChat();
}));
