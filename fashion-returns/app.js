import {MONTHS,analyze,validate,sizePeerComparison,productDiagnostics,reasonDiagnostics,REASON_GROUPS} from './model.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>Number(value).toLocaleString('en-US');
const pct=value=>value===null?'N/A':`${value.toFixed(2)}%`;
const usd=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const monthName=(month,short=false)=>new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB',{month:short?'short':'long',...(short?{}:{year:'numeric'}),timeZone:'UTC'});
let data=null,source='',retrievedAt='',view='overview',comparisonMode='prior-month';
let reasonEvidence={code:'',group:'',month:''};
let overviewEntry=null;
const clearEvidence=()=>{reasonEvidence={code:'',group:'',month:''};};
const filters={start:MONTHS[0],end:MONTHS.at(-1),category:'',product:'',size:''};
const definitions={
  rate:['Unit return rate','Returned units ÷ sold units × 100, for the selected original sales cohort. Only deliveries with a complete 30-day return window are eligible. Returns must occur 1–30 days after delivery and by 9 November 2026. Unknown reasons stay included. An empty sold-unit denominator displays N/A. Rates are recomputed from totals, never averaged.'],
  returned:['Returned units','Sum of accepted returned units linked to the selected original sales cohort, including later return dates within the approved observation window. Return records are aggregated by sales line before joining sold units, preventing double counting. Zero means no accepted returned units in the selection.'],
  refunds:['Refunded amount (USD)','Sum of product-price refunds attributable to the selected original sales cohort. Excludes tax, shipping and handling costs. This is a refund measure, not lost profit or cash flow by refund date. Empty selections show $0.00.'],
  fit:['Fit-related share','Units reported as Too small or Too large ÷ all returned units × 100. Unknown reasons remain in the denominator. No returned units means N/A. Reported reasons do not establish causation. This measure is not changed by a local reason selection.']
};
for(const id of ['start','end'])$(id).innerHTML=MONTHS.map(m=>`<option value="${m}">${monthName(m,true)} ${m.slice(0,4)}</option>`).join('');
$('start').value=filters.start;$('end').value=filters.end;
function setBusy(busy){
  $('reload').disabled=busy;
  $('reload').textContent=busy?'Loading…':'Refresh data ↻';
  $('reset').disabled=busy||!data;
  $('content').setAttribute('aria-busy',String(busy));
  document.querySelectorAll('#filters select,#comparison-mode').forEach(el=>el.disabled=busy||!data);
  const compare=$('compare-size-shortcut'),clear=$('clear-item-selection');
  if(compare)compare.disabled=busy||!data||!filters.product||!filters.size;
  if(clear)clear.disabled=busy||!data||(!filters.product&&!filters.size);
  if(busy){
    $('source-status').textContent=data?'Updating data… Showing the last validated results.':'Loading and validating data…';
    if(!data)$('content').innerHTML='<p class="loading" role="status">Loading the approved data foundation… Please wait.</p>';
  }
}
function focusHeading(){ $('page-title').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
function notice(message){$('notice').textContent=message;$('notice').hidden=!message;}
function setupOptions(){
  const categories=[...new Set(data.cohorts.map(r=>r.category))].sort();
  $('category').innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${esc(c)}</option>`).join('');
  $('category').value=filters.category;
  updateProducts();$('size').innerHTML='<option value="">All sizes</option>'+['XS','S','M','L','XL'].map(s=>`<option>${s}</option>`).join('');$('size').value=filters.size;
}
function updateProducts(){const products=[...new Map(data.cohorts.filter(r=>!filters.category||r.category===filters.category).map(r=>[r.product_id,r])).values()].sort((a,b)=>a.product_name.localeCompare(b.product_name));if(filters.product&&!products.some(p=>p.product_id===filters.product))filters.product='';$('product').innerHTML='<option value="">All products</option>'+products.map(p=>`<option value="${esc(p.product_id)}">${esc(p.product_name)}</option>`).join('');$('product').value=filters.product;}
function restoreUrl(){overviewEntry=history.state?.overviewEntry||null;const p=new URLSearchParams(location.hash.slice(1));comparisonMode=p.get('comparison')==='size-peers'?'size-peers':'prior-month';for(const k of ['start','end'])if(MONTHS.includes(p.get(k)))filters[k]=p.get(k);if(filters.start>filters.end)filters.end=filters.start;for(const k of ['category','product','size'])filters[k]=p.get(k)||'';if(!data.cohorts.some(r=>r.category===filters.category))filters.category='';if(!data.cohorts.some(r=>r.product_id===filters.product))filters.product='';if(!['XS','S','M','L','XL'].includes(filters.size))filters.size='';view=['overview','products','reasons'].includes(p.get('view'))?p.get('view'):'overview';reasonEvidence={code:p.get('evidenceReason')||'',group:REASON_GROUPS.includes(p.get('evidenceGroup'))?p.get('evidenceGroup'):'',month:MONTHS.includes(p.get('evidenceMonth'))?p.get('evidenceMonth'):''};$('start').value=filters.start;$('end').value=filters.end;}
function saveUrl(push=false){const p=new URLSearchParams({view,comparison:comparisonMode,...Object.fromEntries(Object.entries(filters).filter(([,v])=>v))});if(view==='reasons'){if(reasonEvidence.code)p.set('evidenceReason',reasonEvidence.code);if(reasonEvidence.group)p.set('evidenceGroup',reasonEvidence.group);if(reasonEvidence.month)p.set('evidenceMonth',reasonEvidence.month);}const url=`${location.pathname}${location.search}#${p}`;history[push&&location.hash!==`#${p}`?'pushState':'replaceState']({overviewEntry},'',url);}
function kpis(t){return `<section class="kpis" aria-label="Key performance indicators">${[
  ['rate','Unit return rate',pct(t.rate),`${num(t.returned)} / ${num(t.sold)} sold units`,'products'],
  ['returned','Returned units',num(t.returned),'Within the selected sales cohort','products'],
  ['refunds','Refunded amount',usd(t.refunds),'USD · Product refunds, not profit loss','products'],
  ['fit','Fit-related share',pct(t.fitShare),`${num(t.fit)} / ${num(t.returned)} returned units`,'reasons']
].map(([key,title,value,note,target],i)=>`<article class="card kpi ${i===0?'primary':''}"><div class="kpi-label">${title}<button class="help" data-help="${key}" aria-label="Definition: ${title}">?</button></div><div class="kpi-value ${key==='refunds'?'money':''}" data-kpi="${key}">${view==='overview'?`<button class="kpi-finding" data-finding="${key}" aria-haspopup="dialog" aria-label="Actions for ${title}: ${value}">${value}</button>`:value}</div><p class="kpi-note">${note}</p><button class="kpi-link" data-view="${target}">${target==='products'?'View product performance':'Explore return reasons'} ↗</button></article>`).join('')}</section>`;}
function priorMonthComparison(a){
  const c=a.current,p=a.previous;
  if(!p||c.rate===null||p.rate===null)return `<strong>${monthName(c.month)}: ${pct(c.rate)}</strong><small>Prior-month comparison unavailable: ${!p?'the previous month is outside source coverage.':'one cohort has no sold units.'} No target has been invented.</small>`;
  const d=c.rate-p.rate;
  return `<p class="comparison-title">LATEST MONTH VS PRIOR MONTH</p><div class="comparison-grid"><div><span>${monthName(c.month)}</span><strong>${pct(c.rate)}</strong><small>${num(c.returned)} / ${num(c.sold)} sold</small></div><div><span>${monthName(p.month)}</span><strong>${pct(p.rate)}</strong><small>${num(p.returned)} / ${num(p.sold)} sold</small></div><div><span>Change</span><strong>${d>0?'+':''}${d.toFixed(2)} <em>pp</em></strong><small>percentage points</small></div></div><p class="comparison-basis">Same category, product and size filters · complete 30-day observation windows.</p>`;
}
function sizeComparison(){
  const b=sizePeerComparison(data,filters);
  const basis=`Internal synthetic benchmark · ${monthName(filters.start)}–${monthName(filters.end)} · same product and eligibility rules. Rates are ratios of sums, not averages of size rates.`;
  if(b.status==='choose')return `<p class="comparison-title">SIZE VS OTHER SIZES</p><p class="comparison-message">${esc(b.message)}</p><p class="comparison-basis">Choose a product and a size to define the reference. No industry target is assumed.</p>`;
  if(b.status==='unavailable')return `<p class="comparison-title">${esc(b.productName)} · SIZE VS OTHER SIZES</p><p class="comparison-message">Comparison unavailable: ${esc(b.message)}</p><p class="comparison-basis">Zero sold-unit denominators produce N/A, not 0%. ${basis}</p>`;
  const d=b.differencePp;
  return `<p class="comparison-title">${esc(b.productName)} · FULL SELECTED PERIOD</p><div class="comparison-grid"><div><span>Selected size ${esc(filters.size)}</span><strong>${pct(b.selected.rate)}</strong><small>${num(b.selected.returned)} / ${num(b.selected.sold)} sold</small></div><div><span>Other sizes</span><strong>${pct(b.peers.rate)}</strong><small>${num(b.peers.returned)} / ${num(b.peers.sold)} sold</small></div><div><span>Selected − others</span><strong>${d>0?'+':''}${d.toFixed(2)} <em>pp</em></strong><small>percentage points</small></div></div><p class="comparison-basis">${basis}<br>Reference: ${esc(b.sizes.join(', '))}; size ${esc(filters.size)} is excluded. Both returned and sold units are pooled across the other sizes.<br>This flags a size to investigate; different buyers and sample sizes can affect rates. It does not prove a sizing problem.</p>`;
}
function comparison(a){return `<div class="comparison-control"><label for="comparison-mode">COMPARISON MODE</label><select id="comparison-mode" ${$('reload').disabled?'disabled':''}><option value="prior-month" ${comparisonMode==='prior-month'?'selected':''}>Latest month vs prior month</option><option value="size-peers" ${comparisonMode==='size-peers'?'selected':''}>Selected size vs other sizes</option></select></div><div id="comparison-result" role="status" aria-live="polite" aria-atomic="true">${comparisonMode==='size-peers'?sizeComparison():priorMonthComparison(a)}</div>`;}
function trend(a){const w=620,h=260,L=40,R=14,T=20,B=60;const points=a.monthly;const ymax=Math.max(35,Math.ceil(Math.max(...points.map(p=>p.rate??0))/10)*10);const x=i=>points.length===1?(L+w-R)/2:L+i*(w-L-R)/(points.length-1);const y=v=>T+(ymax-v)*(h-T-B)/ymax;
  // Split at missing cohorts rather than draw a line through missing rates.
  let paths=[],path='';for(let i=0;i<points.length;i++){const p=points[i];if(p.rate===null){if(path)paths.push(path);path='';}else path+=`${path?' L':'M'}${x(i)},${y(p.rate)}`;}if(path)paths.push(path);
  const ticks=Array.from({length:Math.floor(ymax/10)+1},(_,i)=>i*10);
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" role="group" aria-label="Monthly unit return rate. Use the labeled month buttons to inspect a month."><title>Monthly unit return rate by original sale month</title>${ticks.map(v=>`<line x1="${L}" x2="${w-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e4dfe6"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" fill="#716977" font-size="10">${v}%</text>`).join('')}${paths.map(d=>`<path d="${d}" fill="none" stroke="#665078" stroke-width="3"/>`).join('')}${points.map((p,i)=>`${p.rate!==null?`<g class="point" tabindex="0" role="button" data-month="${p.month}" aria-label="${monthName(p.month)}: ${pct(p.rate)}, ${p.returned} returned, ${p.sold} sold. Open product breakdown"><title>${monthName(p.month)}: ${pct(p.rate)} · ${p.returned} returned / ${p.sold} sold</title><circle class="focus-ring" cx="${x(i)}" cy="${y(p.rate)}" r="11"/><circle class="point-dot" cx="${x(i)}" cy="${y(p.rate)}" r="${i===points.length-1?5:3.5}"/></g>`:''}<text class="month-tick month-${i} ${i===points.length-1?'last-month':''}" x="${x(i)}" y="${h-32}" text-anchor="middle" fill="#716977" font-size="10">${monthName(p.month,true)}</text>${i===0||p.month.endsWith('-01')?`<text class="year-tick" x="${x(i)}" y="${h-7}" text-anchor="middle" fill="#716977" font-size="9">${p.month.slice(0,4)}</text>`:''}`).join('')}</svg>`;
}
function categories(a){const max=Math.max(35,Math.ceil(Math.max(...a.categories.map(c=>c.rate??0))/10)*10);return `<div class="category-list">${a.categories.map(c=>`<button class="category-row" data-category="${esc(c.name)}" aria-label="Explore ${esc(c.name)}: ${pct(c.rate)}, ${c.returned} returned of ${c.sold} sold"><span class="category-header"><span>${esc(c.name)} ↗</span><span>${pct(c.rate)}</span></span><span class="track"><span class="bar" style="width:${(c.rate??0)/max*100}%"></span>${a.totals.rate!==null?`<span class="reference" style="left:${a.totals.rate/max*100}%"></span>`:''}</span><small>${num(c.returned)} returned / ${num(c.sold)} sold</small></button>`).join('')}</div><div class="category-axis"><span>0%</span><span>${max/2}%</span><span>${max}%</span></div><p class="legend"><span></span> Overall selected-cohort rate: ${pct(a.totals.rate)}<br>Compare rates alongside sales and return volumes.</p><button class="chart-action" data-view="products">Explore products & sizes →</button>`;}
function trendSummary(a){const values=a.monthly.filter(m=>m.rate!==null).map(m=>m.rate);return values.length?`Monthly rates range from ${pct(Math.min(...values))} to ${pct(Math.max(...values))}. Exact counts and percentages are available in the table below.`:'No monthly rates can be calculated for these filters.';}
function selectionActions(){
  const ready=Boolean(filters.product&&filters.size),busy=$('reload').disabled;
  return `<section class="selection-actions" aria-label="Actions for the selected product and size"><div><strong>Actions for this selection</strong><p id="selection-action-help">${ready?'Compare this size with the other sizes of the same product.':'Choose one product and one size above to enable comparison.'}</p><p id="clear-item-help">Clearing product and size keeps your sales period and category.</p></div><button class="button" id="compare-size-shortcut" data-compare-size aria-describedby="selection-action-help" ${!ready||busy?'disabled':''}>${ready?`Compare ${esc(filters.size)} with other sizes`:'Compare a size'} →</button><button class="button secondary" id="clear-item-selection" data-clear-item aria-describedby="clear-item-help" ${(!filters.product&&!filters.size)||busy?'disabled':''}>Clear product & size</button></section>`;
}
function overview(a){return `${selectionActions()}${kpis(a.totals)}${a.totals.sold?`<section class="charts"><article class="card chart-card"><h2>How is the return rate changing?</h2><p class="chart-sub">Monthly unit return rate (%) · original sale month</p>${trend(a)}<p class="chart-summary">${trendSummary(a)}</p><details class="monthly-data"><summary>Read monthly values · accessible table</summary><div class="table-scroll" tabindex="0" role="region" aria-label="Monthly values; scroll horizontally if needed"><table><caption>Original sale month · sold and returned units · unit return rate (%)</caption><thead><tr><th>SALE MONTH</th><th>SOLD</th><th>RETURNED</th><th>RATE</th></tr></thead><tbody>${a.monthly.map(m=>`<tr><td>${monthName(m.month)}</td><td class="number">${num(m.sold)}</td><td class="number">${num(m.returned)}</td><td class="number">${pct(m.rate)}</td></tr>`).join('')}</tbody></table></div></details><p class="chart-detail" id="point-detail">Select a month to explore its products and sizes.</p><div class="comparison">${comparison(a)}</div></article><article class="card chart-card"><h2>Where should I look next?</h2><p class="chart-sub">Unit return rate by category · full selected period</p>${categories(a)}</article></section>`:`<section class="card empty"><h2>No sales match these filters</h2><p>Totals are zero; rates are N/A because there is no denominator.<br>Broaden the period or reset your filters.</p><button class="button" data-reset>Reset filters</button></section>`}<section class="actions"><article class="card"><h2>Investigate product and size performance</h2><p>Compare rates and volumes before choosing which products to review.</p><button class="button" data-view="products">Open Products & sizes →</button></article><article class="card"><h2>Understand the reported reasons</h2><p>Explore fit, quality and expectations. Unknown reasons remain visible.</p><button class="button secondary" data-view="reasons">Open Return reasons →</button></article></section>`;}
function rememberOverview(){if(view==='overview')overviewEntry={filters:{...filters},comparisonMode};}
function returnOverview(){
 if(overviewEntry){Object.assign(filters,overviewEntry.filters);comparisonMode=overviewEntry.comparisonMode;setupOptions();$('start').value=filters.start;$('end').value=filters.end;}
 clearEvidence();view='overview';render({push:true});focusHeading();
}
function journeyScope(){return `<section class="journey-scope" aria-label="Filter scope and navigation"><p><strong>Shared across all three screens:</strong> original sale period, category, product and size. Rates always use returned / sold units.</p><p>${view==='overview'?'Choose Products & sizes to locate the pattern, or Return reasons to test an explanation.':`Back to overview restores your starting filters and comparison mode. Sidebar Overview does the same. <button data-view="${view==='products'?'reasons':'products'}" class="text-button">${view==='products'?'Continue to Return reasons':'Continue to Products & sizes'} →</button>`}</p><p>Reset all filters clears global and local selections for the current journey. ${view==='reasons'?'Local reason/month selections apply only to evidence inside the shared cohort; they never change headline KPIs. Changing a global filter clears the local selection.':''}</p></section>`;}

function products(a){
 const d=productDiagnostics(data,filters),t=d.totals,max=Math.max(1,...d.products.map(p=>p.returned));
 const selected=filters.product?data.cohorts.find(r=>r.product_id===filters.product):null;
 return `<div class="breadcrumb"><button data-return-overview>← Back to overview</button> / Products & sizes</div>
 <p class="diagnostic-note">Rank absolute contribution, then compare rates against sold units. All charts use the shared original-sale filters above. Reported patterns are associations, not proof of a sizing problem.</p>
 ${kpis(t)}
 ${!t.sold?`<section class="card empty"><h2>No sales match these filters</h2><p>Rates are N/A because there is no sold-unit denominator. Broaden the period or reset filters.</p><button class="button" data-reset>Reset filters</button></section>`:`
 <section class="card diagnostic-section"><h2>Which products contribute most returns?</h2><p class="chart-sub">Ranked by returned units ↓ · share of ${num(t.returned)} selected-cohort returns · rate = returned / sold</p>
 <p class="chart-summary">Selected-cohort return rate: <strong>${pct(t.rate)}</strong>. A large contribution can reflect more sales; compare each rate with this cohort rate. Click a product to narrow the investigation.</p>
 <div class="product-ranking">${d.products.map(p=>`<button class="rank-row" data-product-select="${esc(p.product_id)}" aria-label="Select ${esc(p.product_name)}, ${p.returned} returned of ${p.sold} sold, ${pct(p.rate)}"><span class="rank-name">${esc(p.product_name)} <small>${esc(p.category||'Unknown category')}</small></span><span class="rank-track"><span style="width:${p.returned/max*100}%"></span></span><span class="rank-values"><strong>${num(p.returned)} returned</strong><small>${num(p.sold)} sold · ${pct(p.rate)}</small><small>${pct(t.returned?100*p.returned/t.returned:null)} of returns</small></span></button>`).join('')}</div>
 </section>
 <section class="card diagnostic-section"><h2>Which product and size combinations stand out?</h2><p class="chart-sub">Unit return rate (%) · every cell shows returned / sold units · darker = higher rate, fixed 0–100% scale</p>
 <p class="chart-summary">Counts remain visible for small groups; no group is excluded by sample size. Zero sales = N/A; sales with no returns = 0%. Unreported return reasons remain in all returned-unit totals. Select a cell to prepare its evidence context.</p>
 <div class="table-scroll heatmap-scroll" tabindex="0" role="region" aria-label="Product by size rates; scroll horizontally if needed"><table class="heatmap"><caption>Product × size · original sales cohort · keyboard-operable cells</caption><thead><tr><th scope="col">PRODUCT</th>${d.sizes.map(z=>`<th scope="col">${z}</th>`).join('')}</tr></thead><tbody>${d.products.map(p=>`<tr><th scope="row">${esc(p.product_name)}</th>${d.sizes.map(z=>{const c=d.cells.find(c=>c.product_id===p.product_id&&c.size===z);return `<td><button data-product-select="${esc(p.product_id)}" data-size-select="${z}" style="background:hsl(276 24% ${c.rate===null?97:97-c.rate*.42}%)" aria-label="Select ${esc(p.product_name)} size ${z}: ${pct(c.rate)}, ${c.returned} returned of ${c.sold} sold"><strong>${pct(c.rate)}</strong><small>${c.returned} / ${c.sold}</small></button></td>`;}).join('')}</tr>`).join('')}</tbody></table></div></section>
 <section class="card diagnostic-section"><h2>Reconciliation to the selected overview cohort</h2><p class="chart-sub">Product and size groups are disjoint. Recompute percentages from their totals.</p><dl class="reconcile"><div><dt>Sold units</dt><dd>${num(d.products.reduce((n,p)=>n+p.sold,0))} / ${num(t.sold)} overview</dd></div><div><dt>Returned units</dt><dd>${num(d.products.reduce((n,p)=>n+p.returned,0))} / ${num(t.returned)} overview</dd></div><div><dt>Recomputed rate</dt><dd>${pct(t.rate)} = ${num(t.returned)} / ${num(t.sold)}</dd></div></dl></section>`}
 <section class="card diagnostic-section evidence-selection" aria-label="Selection for future record detail"><h2>${selected?'Evidence selection prepared':'Choose a product or size to investigate'}</h2><p>${selected?`${esc(selected.product_name)} · ${filters.size?'Size '+esc(filters.size):'All sizes'} · ${monthName(filters.start)}–${monthName(filters.end)} · ${num(t.sales_lines)} sales lines, ${num(t.sold)} sold units and ${num(t.returned)} returned units.`:'Use a product bar or heatmap cell. The shared filter summary and URL will retain the selected product and size.'}</p><p>Record-detail handoff: eligible original sales lines, including lines without returns, then sale_line_id → linked returns. Choose one product and one size, then open record detail to read and correct individual sale lines through the protected server path.</p>${selected?'<button class="button" data-download-selection>Download selection context</button>':''}${selected&&filters.size?' <button class="button" data-open-records>Open record detail →</button> <button class="button" data-open-trello>Create follow-up task →</button>':''} <button class="button secondary" data-view="reasons">Explore reported reasons →</button></section>`;
}
const reasonColors={Fit:'#665078',Quality:'#a9775b',Preference:'#466e73',Expectations:'#596a39',Unknown:'#77717b'};
const signed=value=>`${value>0?'+':''}${value.toFixed(2)} pp`;
function cohortExplanation(d){
 const c=d.comparison;
 if(!c)return '<p class="chart-summary">Select at least two sale months to compare equal-length early and late cohorts. No time explanation can be tested with one month.</p>';
 const x=c.first,y=c.last,range=t=>`${monthName(t.months[0],true)} ${t.months[0].slice(0,4)}–${monthName(t.months.at(-1),true)} ${t.months.at(-1).slice(0,4)}`;
 const valid=x.sold&&y.sold;
 const mix=[...new Set([...x.products,...y.products].map(r=>r.product_id))].map(id=>{const a=x.products.find(r=>r.product_id===id),b=y.products.find(r=>r.product_id===id);return {id,name:a?.product_name||b?.product_name,first:a?.sold||0,last:b?.sold||0};});
 return `<section class="card diagnostic-section explanation"><h2>Does a change in Fit share explain the return-rate change?</h2><p><strong>Hypothesis:</strong> A shift toward Fit-related returns may explain the later cohort’s change in overall return rate. Check Fit returns per sold unit against other returns per sold unit; a changing reason share alone is insufficient evidence.</p><p class="chart-sub">Equal-length original-sale cohorts · same category/product/size filters · complete 30-day windows. ${c.omitted.length?`Middle month ${monthName(c.omitted[0])} omitted from this comparison only; charts and headline KPIs retain it.`:'Both halves cover the entire selected period.'}</p>
 <div class="table-scroll" tabindex="0" role="region" aria-label="Early and late cohort comparison"><table><caption>Fit share uses returned units; reason-specific incidence uses sold units.</caption><thead><tr><th scope="col">MEASURE</th><th scope="col">EARLY: ${range(x)}</th><th scope="col">LATE: ${range(y)}</th><th scope="col">LATE − EARLY</th></tr></thead><tbody>
 ${[['Sold units',num(x.sold),num(y.sold),'—'],['Returned units',num(x.returned),num(y.returned),'—'],['Overall return rate',`${pct(x.rate)} (${x.returned}/${x.sold})`,`${pct(y.rate)} (${y.returned}/${y.sold})`,valid?signed(y.rate-x.rate):'N/A'],['Fit share of returns',`${pct(x.fitShare)} (${x.fit}/${x.returned})`,`${pct(y.fitShare)} (${y.fit}/${y.returned})`,x.fitShare!==null&&y.fitShare!==null?signed(y.fitShare-x.fitShare):'N/A'],['Fit returns / sold',`${pct(x.fitPerSold)} (${x.fit}/${x.sold})`,`${pct(y.fitPerSold)} (${y.fit}/${y.sold})`,valid?signed(y.fitPerSold-x.fitPerSold):'N/A'],['Other + unreported returns / sold',`${pct(x.otherPerSold)} (${x.returned-x.fit}/${x.sold})`,`${pct(y.otherPerSold)} (${y.returned-y.fit}/${y.sold})`,valid?signed(y.otherPerSold-x.otherPerSold):'N/A']].map(r=>`<tr>${r.map((v,i)=>i?`<td>${v}</td>`:`<th scope="row">${v}</th>`).join('')}</tr>`).join('')}
 </tbody></table></div>
 <p class="observed"><strong>Observed:</strong> ${valid&&x.fitShare!==null&&y.fitShare!==null?`Fit share changes by ${signed(y.fitShare-x.fitShare)}, while the overall return rate changes by ${signed(y.rate-x.rate)}. Fit returns per sold unit change by ${signed(y.fitPerSold-x.fitPerSold)}; other and unreported returns per sold unit change by ${signed(y.otherPerSold-x.otherPerSold)}. Countercheck: other and unreported reasons also change, so a Fit-only explanation is incomplete. A change in composition alone does not establish a change in overall return risk.`:'At least one cohort lacks sales or returns. The hypothesis comparison is unavailable; no missing rate is replaced by zero.'}</p>
 <details class="monthly-data"><summary>Check visible confounding: product sales mix</summary><p class="chart-summary">Different product weights can change pooled rates. These shares use sold units, not returns. Filter to one product/size for a narrower comparison; this still does not control buyer differences.</p><div class="table-scroll"><table><thead><tr><th>PRODUCT</th><th>EARLY SOLD / TOTAL</th><th>LATE SOLD / TOTAL</th></tr></thead><tbody>${mix.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.first}/${x.sold} · ${pct(x.sold?100*r.first/x.sold:null)}</td><td>${r.last}/${y.sold} · ${pct(y.sold?100*r.last/y.sold:null)}</td></tr>`).join('')}</tbody></table></div></details>
 <p><strong>Limitation:</strong> Reported reasons are not verified fit measurements; unreported reasons and changing product/size mix can affect comparisons. The dataset is synthetic. <strong>Next evidence:</strong> inspect the underlying returns, size measurements and buyer feedback, then evaluate any size-guide change with a controlled comparison.</p></section>`;
}
function reasonMixChart(d){
 const W=760,H=285,L=38,T=30,B=58,plot=H-T-B,bw=Math.min(42,(W-L-10)/Math.max(1,d.monthly.length)*.65),step=(W-L-10)/Math.max(1,d.monthly.length);
 return `<svg class="reason-mix" viewBox="0 0 ${W} ${H}" role="group" aria-label="Reported reason composition by original sale month. Each segment is a selectable evidence filter; exact values are in the table below."><title>Monthly reason mix; percentage of returned units, not return rate</title>${[0,50,100].map(n=>`<line x1="${L}" x2="${W-5}" y1="${T+plot*(1-n/100)}" y2="${T+plot*(1-n/100)}" stroke="#e4dfe6"/><text x="${L-6}" y="${T+plot*(1-n/100)+4}" text-anchor="end" font-size="11" fill="#655b6e">${n}%</text>`).join('')}${d.monthly.map((m,i)=>{let accumulated=0;const x=L+step*(i+.5)-bw/2;return `<text x="${x+bw/2}" y="17" text-anchor="middle" font-size="11" fill="#655b6e">n=${m.returned}</text>${m.returned?m.groups.filter(g=>g.returned).map(g=>{const h=g.returned/m.returned*plot,y=T+plot-accumulated-h;accumulated+=h;return `<g class="mix-segment" tabindex="0" role="button" data-evidence-month="${m.month}" data-evidence-group="${g.name}" aria-label="${monthName(m.month)} ${g.name}: ${g.returned} of ${m.returned} returned units, ${pct(100*g.returned/m.returned)}. Select evidence"><title>${monthName(m.month)} · ${g.name}: ${g.returned}/${m.returned} · ${pct(100*g.returned/m.returned)}</title><rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${reasonColors[g.name]}"/></g>`;}).join(''):`<text x="${x+bw/2}" y="${T+plot/2}" text-anchor="middle" font-size="10" fill="#655b6e">No returns</text>`}<text x="${x+bw/2}" y="${H-32}" text-anchor="middle" font-size="11" fill="#655b6e">${monthName(m.month,true)}</text><text x="${x+bw/2}" y="${H-14}" text-anchor="middle" font-size="10" fill="#655b6e">${m.month.slice(0,4)}</text>`;}).join('')}</svg>`;
}
function reasons(a){
 const d=reasonDiagnostics(data,filters),t=d.totals,max=Math.max(1,...d.reasons.map(r=>r.returned));
 const evidence=data.reasons.filter(r=>matchesReasonEvidence(r));const count=evidence.reduce((n,r)=>n+Number(r.returned),0),selected=Boolean(reasonEvidence.code||reasonEvidence.group||reasonEvidence.month);
 return `<div class="breadcrumb"><button data-return-overview>← Back to overview</button> / Return reasons & cohort mix</div><p class="diagnostic-note">What was reported, and how does its composition vary over sale cohorts? Shared filters apply to every cohort calculation. Local evidence selections below never change headline KPIs.</p>${kpis(t)}
 <div class="local-context" role="status"><strong>Local evidence filter:</strong> ${selected?`${reasonEvidence.month?monthName(reasonEvidence.month):'All selected months'} · ${esc(reasonEvidence.code?d.reasons.find(r=>r.code===reasonEvidence.code)?.name||reasonEvidence.code:reasonEvidence.group||'All reasons')} · ${num(count)} returned units <button class="text-button" data-clear-evidence>Clear local filter</button>`:'None selected.'} <span>Headline cohort stays ${num(t.returned)} returned / ${num(t.sold)} sold.</span></div>
 ${!t.returned?'<section class="card empty"><h2>No returns in this sales cohort</h2><p>Reason shares and composition are N/A. Sold-unit totals and the headline return-rate rules remain unchanged.</p></section>':`
 <section class="card diagnostic-section"><h2>What reasons were reported?</h2><p class="chart-sub">Returned units ↓ · shares of all ${num(t.returned)} returned units, including Not reported</p><div class="product-ranking">${d.reasons.map(r=>`<button class="rank-row" data-evidence-reason="${esc(r.code)}" aria-label="Select reported reason ${esc(r.name)}: ${r.returned} of ${t.returned} returns"><span class="rank-name">${esc(r.name)}<small>${esc(r.group)}</small></span><span class="rank-track"><span style="width:${r.returned/max*100}%;background:${reasonColors[r.group]}"></span></span><span class="rank-values"><strong>${num(r.returned)} returned</strong><small>${pct(100*r.returned/t.returned)} of all returns</small></span></button>`).join('')}</div></section>
 <section class="card diagnostic-section"><h2>Does the mix of reasons change over time?</h2><p class="chart-sub">100% of each original sale month's returned units · n = returned-unit base · no return-date grouping</p><div class="reason-legend">${REASON_GROUPS.map(g=>`<span><i style="background:${reasonColors[g]}"></i>${g}</span>`).join('')}</div><div class="mix-scroll" tabindex="0" role="region" aria-label="Monthly reason composition chart; scroll horizontally if needed">${reasonMixChart(d)}</div><p class="chart-summary">These columns show composition, not the probability of a return. Equal heights can represent different counts. Select a colored segment for its evidence context.</p><details class="monthly-data"><summary>Read exact monthly counts and percentages</summary><div class="table-scroll"><table><caption>Percentages use all returned units in that sale month. No returns = N/A.</caption><thead><tr><th>SALE MONTH</th><th>ALL RETURNS</th>${REASON_GROUPS.map(g=>`<th>${g.toUpperCase()}</th>`).join('')}</tr></thead><tbody>${d.monthly.map(m=>`<tr><th scope="row">${monthName(m.month)}</th><td>${m.returned}</td>${m.groups.map(g=>`<td>${g.returned} · ${pct(m.returned?100*g.returned/m.returned:null)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></section>`}
 ${cohortExplanation(d)}
 <section class="card diagnostic-section evidence-selection" id="reason-evidence" tabindex="-1" aria-label="Local reason evidence selection"><h2>${selected?'Local evidence selection':'Select a reason or a month/group segment'}</h2><p>${selected?`${reasonEvidence.month?monthName(reasonEvidence.month):'All selected sale months'} · ${esc(reasonEvidence.code?d.reasons.find(r=>r.code===reasonEvidence.code)?.name||reasonEvidence.code:reasonEvidence.group||'All reported reasons')} · ${num(count)} returned units in matching aggregates.`:'No local evidence filter. Headline KPIs always describe the full shared cohort.'}</p><p>Shared cohort: ${num(t.returned)} returned / ${num(t.sold)} sold. Local evidence selection does not alter either denominator. Matching return_id → original sale_line_id access will be added in the record-detail layer; individual records are not exposed in this version.</p>${selected?'<button class="button secondary" data-clear-evidence>Clear evidence selection</button>':''} <button class="button secondary" data-view="products">Compare products & sizes →</button></section>`;
}
function matchesReasonEvidence(r){return (r.month>=filters.start&&r.month<=filters.end)&&(!filters.category||r.category===filters.category)&&(!filters.product||r.product_id===filters.product)&&(!filters.size||r.size===filters.size)&&(!reasonEvidence.code||r.reason_code===reasonEvidence.code)&&(!reasonEvidence.group||r.reason_group===reasonEvidence.group)&&(!reasonEvidence.month||r.month===reasonEvidence.month);}
function render({push=false}={}){if(!data)return;const a=analyze(data,filters);$('content').innerHTML=journeyScope()+(view==='overview'?overview(a):view==='products'?products(a):reasons(a));const names={overview:['LEVEL 1 · EXECUTIVE OVERVIEW','Returns overview','Understand the trend. Choose where to investigate.'],products:['LEVEL 2 · PRODUCT DIAGNOSIS','Products & sizes','Compare rates with the volumes behind them.'],reasons:['LEVEL 2 · REASON & COHORT DIAGNOSIS','Return reasons & cohort mix','Separate the observed pattern from a possible explanation.']};$('level-label').textContent=names[view][0];$('page-title').innerHTML=names[view][1]+'<span>.</span>';$('page-subtitle').textContent=names[view][2];document.querySelectorAll('nav [data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('context').textContent=`Sales: ${monthName(filters.start)} – ${monthName(filters.end)} · ${filters.category||'All categories'} · ${$('product').selectedOptions[0]?.textContent||'All products'} · ${filters.size?`Size ${filters.size}`:'All sizes'} · ${num(a.totals.sales_lines)} sales lines · ${num(a.totals.sold)} sold units`;$('source-status').textContent=source==='supabase'?'● Connected to Supabase · foundation v1.1':'● LOCAL PREVIEW · validated synthetic snapshot';$('freshness').textContent=`Foundation validated ${data.validated_on} · Historical observation cutoff ${data.business_as_of} · ${source==='supabase'?'Last successful data read':'Local preview loaded'} ${new Date(retrievedAt).toLocaleString('en-GB',{timeZoneName:'short'})}. No scheduled refresh.${data.practice_edits?.edit_count?` Includes ${data.practice_edits.edit_count} logged synthetic practice edit(s): ${data.practice_edits.eligible_units_delta>0?'+':''}${data.practice_edits.eligible_units_delta} sold units vs foundation v1.1 (last ${data.practice_edits.last_edited_at}).`:''}`;saveUrl(push);}
async function load({focusAfter=false}={}){const hadData=Boolean(data);setBusy(true);notice('');let phase='request';try{
  const snapshot=new URLSearchParams(location.search).get('preview')==='snapshot';
  const cfg=window.FASHION_CONFIG||{};let response;
  if(snapshot){response=await fetch('./data/validated-snapshot.json',{cache:'no-store'});}else{if(!cfg.supabaseUrl||!cfg.publishableKey)throw Error('Supabase connection is not configured. Add the project URL and public publishable key to config.js.');response=await fetch(`${cfg.supabaseUrl.replace(/\/$/,'')}/rest/v1/rpc/fashion_dashboard_v1`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});}
  if(!response.ok){let message='';try{const e=await response.json();message=e.message||e.msg||'';}catch{}throw Error(`Data request failed (${response.status}). ${message.includes('fashion_dashboard_v1')?'Run 05-dashboard-read-api.sql in your fashion-returns Supabase SQL Editor.':message||'Check the Supabase connection and try again.'}`);}
  phase='validation';const candidate=validate(await response.json());data=candidate;source=snapshot?'snapshot':'supabase';retrievedAt=new Date().toISOString();restoreUrl();setupOptions();render();if(snapshot)notice('Local preview using the validated synthetic snapshot. This is not a live Supabase connection. Remove ?preview=snapshot to use Supabase.');
}catch(error){
  const timeout=error.name==='TimeoutError';
  const reason=phase==='validation'?'The new response did not pass data validation.':timeout?'The data service took too long to respond.':'The data service could not be reached.';
  if(data){
    notice(`Refresh failed. ${reason} Showing the last successfully read, validated data. Its read time has not changed. Try Refresh data again.`);
    $('source-status').textContent='Refresh failed · last validated results retained';
  }else{
    $('content').innerHTML=`<section class="error" role="alert"><h2>Data could not be loaded</h2><p>${reason} Check your connection and try again.</p><p>No metrics are shown until a complete response has been validated.</p><button class="button" data-retry>Try again</button></section>`;
    $('source-status').textContent='Data unavailable · retry needed';
    $('freshness').textContent='No successful data read yet.';
  }
}finally{setBusy(false);if(focusAfter){if(data&&!hadData)focusHeading();else $('reload').focus();}}}
function reset(){overviewEntry=null;clearEvidence();comparisonMode='prior-month';Object.assign(filters,{start:MONTHS[0],end:MONTHS.at(-1),category:'',product:'',size:''});for(const key of ['start','end','category','size'])$(key).value=filters[key];updateProducts();render();}
document.addEventListener('change',e=>{if(e.target.id!=='comparison-mode'||!data)return;comparisonMode=e.target.value==='size-peers'?'size-peers':'prior-month';render();$('comparison-mode')?.focus();});
$('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('change',e=>{if(!data)return;const key=e.target.id;if(!Object.hasOwn(filters,key))return;clearEvidence();filters[key]=e.target.value;if(filters.start>filters.end){if(key==='start')filters.end=filters.start;else filters.start=filters.end;$('start').value=filters.start;$('end').value=filters.end;}if(key==='category')updateProducts();render();});$('reset').onclick=()=>data&&reset();$('reload').onclick=()=>load({focusAfter:true});
document.addEventListener('click',e=>{const b=e.target.closest('[data-help],[data-view],[data-category],[data-month],[data-reset],[data-retry],[data-compare-size],[data-clear-item],[data-product-select],[data-return-overview],[data-download-selection],[data-evidence-reason],[data-evidence-group],[data-clear-evidence]');if(!b)return;
 if(b.hasAttribute('data-evidence-reason')||b.hasAttribute('data-evidence-group')||b.hasAttribute('data-clear-evidence')){reasonEvidence=b.hasAttribute('data-clear-evidence')?{code:'',group:'',month:''}:b.hasAttribute('data-evidence-reason')?{code:b.dataset.evidenceReason,group:'',month:''}:{code:'',group:b.dataset.evidenceGroup,month:b.dataset.evidenceMonth};render();$('reason-evidence').focus();return;}
 if(b.hasAttribute('data-return-overview')||b.dataset.view==='overview'){if(!data)return;e.preventDefault();returnOverview();return;}
 if(b.hasAttribute('data-product-select')){clearEvidence();filters.product=b.dataset.productSelect;if(b.dataset.sizeSelect)filters.size=b.dataset.sizeSelect;setupOptions();render();focusHeading();return;}
 if(b.hasAttribute('data-download-selection')){const packet={contract:data.contract,source_type:'synthetic',selection:{...filters},grain:'Eligible original sale line including non-returned lines',next_record_key:'sale_line_id',record_access:'Not implemented in this exercise',totals:analyze(data,filters).totals};const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='fashion-evidence-selection.json';link.click();URL.revokeObjectURL(url);return;}
 if((b.dataset.view||b.dataset.category||b.dataset.month)&&!data)return;
 const previousView=view;
 if(b.dataset.view||b.dataset.category||b.dataset.month){e.preventDefault();rememberOverview();}
 if(b.hasAttribute('data-compare-size')){if(!data||!filters.product||!filters.size)return;comparisonMode='size-peers';render();$('comparison-mode')?.focus();return;}if(b.hasAttribute('data-clear-item')){if(!data)return;clearEvidence();filters.product='';filters.size='';comparisonMode='prior-month';$('product').value='';$('size').value='';render();focusHeading();return;}if(b.hasAttribute('data-retry'))return load({focusAfter:true});if(b.dataset.help){const [title,text]=definitions[b.dataset.help];$('metric-title').textContent=title;$('metric-definition').textContent=text;$('metric-dialog').showModal();return;}if(!data)return;if(b.hasAttribute('data-reset')){reset();focusHeading();return;}if(b.dataset.category){clearEvidence();filters.category=b.dataset.category;$('category').value=filters.category;updateProducts();view='products';}else if(b.dataset.month){clearEvidence();filters.start=b.dataset.month;filters.end=b.dataset.month;$('start').value=filters.start;$('end').value=filters.end;view='products';}else if(b.dataset.view)view=b.dataset.view;render({push:view!==previousView});focusHeading();});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.point,.mix-segment')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('focusin',e=>{const p=e.target.closest('[data-month]');if(p&&data){const m=analyze(data,filters).monthly.find(r=>r.month===p.dataset.month);if(m&&$('point-detail'))$('point-detail').textContent=`${monthName(m.month)}: ${pct(m.rate)} · ${num(m.returned)} returned / ${num(m.sold)} sold. Press Enter to explore.`;}});
window.addEventListener('hashchange',()=>{if(location.hash==='#main')return;if(data){restoreUrl();setupOptions();render();focusHeading();}});
load();

// Week3 Email checkpoint1: scope-aware entry and read-only connection inspection.
let findingSnapshot=null;
const emailEndpoint='/api/fashion-email';
function showFinding(key){
 const t=analyze(data,filters).totals;const values={rate:pct(t.rate),returned:num(t.returned),refunds:usd(t.refunds),fit:pct(t.fitShare)};
 findingSnapshot={metric:definitions[key][0],value:values[key],filters:{...filters},context:$('context').textContent,totals:t};
 $('finding-title').textContent=findingSnapshot.metric; $('finding-scope').textContent=`${findingSnapshot.value} · ${findingSnapshot.context}`;$('finding-menu').showModal();
}
function showConnectionStatus(result){
 $('email-status').textContent=result.message;$('email-checked').textContent=result.checkedAt?`Read-only check: ${result.checkedAt}`:'Provider authentication has not been verified.';
 $('lab-phrase-wrap').hidden=!result.configured&&result.state!=='connection_verified';
 if(result.state==='connection_verified'){$('lab-phrase-wrap').hidden=false;$('email-recipient').textContent=`Permitted test recipient: ${result.permittedRecipient}`;}
}
async function readEmailSettings(){
 $('email-status').textContent='Reading server configuration…';$('email-recipient').textContent='The permitted test recipient is configured privately as LAB_EMAIL_TO.';
 try{const response=await fetch(emailEndpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const result=await response.json();showConnectionStatus(result);}
 catch{$('email-status').textContent='The connection endpoint is unavailable. Check the deployed Vercel project. No email has been sent.';}
}
async function inspectEmail(){
 $('email-check').disabled=true;
 try{const response=await fetch(emailEndpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${$('lab-phrase').value}`},body:JSON.stringify({operation:'inspect'}),signal:AbortSignal.timeout(15000)});const result=await response.json();showConnectionStatus(result);}
 catch{$('email-status').textContent='The read-only connection check could not be completed. No email has been sent.';}
 finally{$('email-check').disabled=false;$('lab-phrase').value='';}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-finding]');if(b&&data&&view==='overview')showFinding(b.dataset.finding);});
$('share-finding').onclick=()=>{$('finding-menu').close();$('email-context').textContent=`${findingSnapshot.metric}: ${findingSnapshot.value}. ${findingSnapshot.context}. Synthetic data · foundation v1.1.`;$('email-connection').showModal();readEmailSettings();};
$('email-check').onclick=inspectEmail;$('email-refresh-status').onclick=readEmailSettings;
$('email-connection').addEventListener('close',()=>{$('lab-phrase').value='';});

// Week3 Exercise 2: protected record read and justified units_sold writeback (server path /api/fashion-record).
const recordEndpoint='/api/fashion-record';
let recordState={scope:null,lines:[],record:null,review:null};
const recordAuth=()=>({Authorization:`Bearer ${$('record-phrase').value}`});
function recordStatus(message){$('record-status').textContent=message;}
async function recordFetch(url,options={}){
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000),...options,headers:{...(options.headers||{}),...recordAuth()}});
 let body={};try{body=await response.json();}catch{}
 return {ok:response.ok,status:response.status,body};
}
function openRecords(){
 if(!data||!filters.product||!filters.size)return;
 const p=data.cohorts.find(r=>r.product_id===filters.product);
 recordState={scope:{...filters,productName:p?.product_name||filters.product},lines:[],record:null,review:null};
 $('record-scope').textContent=`${recordState.scope.productName} · Size ${filters.size} · ${monthName(filters.start)}–${monthName(filters.end)} · eligible original sale lines (synthetic).`;
 $('record-lines').innerHTML='';$('record-detail').innerHTML='';recordStatus('Checking server settings…');
 $('record-dialog').showModal();
 fetch(recordEndpoint,{cache:'no-store'}).then(r=>r.json()).then(s=>recordStatus(s.message)).catch(()=>recordStatus('The record endpoint is unavailable. Check the deployed Vercel project.'));
}
async function loadLines(){
 const s=recordState.scope;if(!s)return;$('record-load-lines').disabled=true;recordStatus('Reading sale lines…');
 try{const q=new URLSearchParams({product:s.product,size:s.size,start:s.start,end:s.end});const r=await recordFetch(`${recordEndpoint}?${q}`);
  if(!r.ok){recordStatus(r.body.message||`Read failed (${r.status}).`);return;}
  recordState.lines=r.body.lines;const sold=r.body.lines.reduce((n,l)=>n+l.units_sold,0),ret=r.body.lines.reduce((n,l)=>n+Number(l.returned_units),0);
  recordStatus(`Read ${r.body.lines.length} sale lines from Supabase: ${num(sold)} sold units, ${num(ret)} returned units. Lines with 2+ units are listed first.`);
  const sorted=[...r.body.lines].sort((a,b)=>b.units_sold-a.units_sold||a.sale_date.localeCompare(b.sale_date));
  $('record-lines').innerHTML=`<div class="table-scroll" tabindex="0" role="region" aria-label="Sale lines"><table class="record-table"><caption>sale_line_id is the stable record identity.</caption><thead><tr><th scope="col">sale_line_id</th><th scope="col">Sale date</th><th scope="col">units_sold</th><th scope="col">Returned</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>${sorted.map(l=>`<tr><th scope="row">${esc(l.sale_line_id)}</th><td>${esc(l.sale_date)}</td><td>${num(l.units_sold)}</td><td>${num(l.returned_units)}</td><td><button class="text-button" data-record-id="${esc(l.sale_line_id)}">Open ${esc(l.sale_line_id)}</button></td></tr>`).join('')}</tbody></table></div>`;
 }catch{recordStatus('Sale lines could not be read. Nothing was changed.');}
 finally{$('record-load-lines').disabled=false;}
}
function recordView(rec){
 const last=rec.last_edit?`<p><strong>Last saved change:</strong> ${esc(rec.last_edit.old_value)} → ${esc(rec.last_edit.new_value)} at ${esc(rec.last_edit.edited_at)} · “${esc(rec.last_edit.reason)}” (${esc(rec.last_edit.label)})</p>`:'<p>No saved changes for this record.</p>';
 return `<section class="record-card" aria-label="Current record"><h3>${esc(rec.sale_line_id)} · ${esc(rec.product_name)} · Size ${esc(rec.size)}</h3><dl class="record-fields"><div><dt>units_sold (current)</dt><dd class="record-value">${num(rec.units_sold)}</dd></div><div><dt>Linked returns</dt><dd>${num(rec.linked_returns)}</dd></div><div><dt>Net unit price</dt><dd>${usd(rec.net_unit_price_usd)}</dd></div><div><dt>Sales amount</dt><dd>${usd(rec.sales_amount_usd)}</dd></div><div><dt>Order / line</dt><dd>${esc(rec.order_id)} · ${esc(rec.order_line_number)}</dd></div><div><dt>Sale / delivered</dt><dd>${esc(rec.sale_date)} · ${esc(rec.delivered_date)}</dd></div><div><dt>Revision</dt><dd>${num(rec.revision)}</dd></div><div><dt>Read from Supabase</dt><dd>${esc(rec.read_at)}</dd></div></dl>${last}
 <form id="record-edit" class="record-edit"><h3>Propose a change</h3><label for="record-new">New units_sold (integer ${Math.max(1,rec.linked_returns)}–20, must differ)</label><input id="record-new" type="number" inputmode="numeric" min="${Math.max(1,rec.linked_returns)}" max="20" step="1" required><label for="record-reason">Reason (10–500 characters; label it as a synthetic practice adjustment)</label><textarea id="record-reason" rows="3" minlength="10" maxlength="500" required></textarea><button class="button" type="submit">Review change →</button></form></section>`;
}
async function openRecord(id){
 recordStatus(`Reading ${id}…`);
 try{const r=await recordFetch(`${recordEndpoint}?id=${encodeURIComponent(id)}`);
  if(!r.ok){recordStatus(r.body.message||`Read failed (${r.status}).`);return;}
  recordState.record=r.body.record;recordState.review=null;
  recordStatus(`Read ${id} from Supabase at ${r.body.record.read_at}. Current units_sold = ${r.body.record.units_sold}.`);
  $('record-detail').innerHTML=recordView(r.body.record);$('record-detail').querySelector('h3')?.scrollIntoView({block:'nearest'});
 }catch{recordStatus('The record could not be read. Nothing was changed.');}
}
function predict(rec,newUnits){
 const delta=newUnits-rec.units_sold;
 const all={start:MONTHS[0],end:MONTHS.at(-1),category:'',product:'',size:''};
 const cell={...all,product:rec.product_id,size:rec.size};
 const row=(label,t)=>{const after=t.sold+delta;return `<tr><th scope="row">${label}</th><td>${num(t.sold)} → <strong>${num(after)}</strong></td><td>${pct(t.rate)} → <strong>${pct(after?t.returned/after*100:null)}</strong></td><td>${num(t.returned)} (unchanged)</td></tr>`;};
 return `<div class="table-scroll" tabindex="0" role="region" aria-label="Predicted effect"><table class="record-table"><caption>Predicted effect, full period Oct 2025–Sep 2026 (only eligible lines count).</caption><thead><tr><th scope="col">Scope</th><th scope="col">Sold units</th><th scope="col">Unit return rate</th><th scope="col">Returned units</th></tr></thead><tbody>${row('Overview · all products',analyze(data,all).totals)}${row(`${esc(rec.product_name)} · ${esc(rec.size)} (heatmap cell)`,analyze(data,cell).totals)}</tbody></table></div><p><strong>Should change:</strong> sold units and unit return rate in these scopes, the ${esc(rec.sale_date.slice(0,7))} monthly point, and this line's sales amount (${usd(rec.sales_amount_usd)} → ${usd(newUnits*rec.net_unit_price_usd)}). <strong>Should stay unchanged:</strong> returned units, refunded amount, fit-related share, reason mix, number of sales lines and all other products/sizes.</p>`;
}
function reviewChange(e){
 e.preventDefault();const rec=recordState.record;if(!rec)return;
 const newUnits=Number($('record-new').value),reason=$('record-reason').value.trim(),min=Math.max(1,rec.linked_returns);
 if(!Number.isInteger(newUnits)||newUnits<min||newUnits>20||newUnits===rec.units_sold){recordStatus(`Enter a whole number from ${min} to 20 that differs from ${rec.units_sold}.`);$('record-new').focus();return;}
 if(reason.length<10){recordStatus('Write a reason of at least 10 characters.');$('record-reason').focus();return;}
 recordState.review={newUnits,reason};
 $('record-detail').insertAdjacentHTML('beforeend',`<section class="record-review" id="record-review" tabindex="-1" aria-label="Review before saving"><h3>Review before saving</h3><dl class="record-fields"><div><dt>Record</dt><dd>public.sales · ${esc(rec.sale_line_id)}</dd></div><div><dt>Field</dt><dd>units_sold (and derived sales_amount_usd)</dd></div><div><dt>Old → new</dt><dd><strong>${num(rec.units_sold)} → ${num(newUnits)}</strong></dd></div><div><dt>Expected revision</dt><dd>${num(rec.revision)}</dd></div></dl><p><strong>Reason:</strong> ${esc(reason)}</p>${predict(rec,newUnits)}<p>Saving only succeeds if Supabase still has units_sold = ${num(rec.units_sold)} and revision ${num(rec.revision)}; otherwise you'll see a conflict and the latest value.</p><div class="email-buttons"><button class="button secondary" id="record-cancel" type="button">Cancel · nothing saved</button><button class="button" id="record-confirm" type="button">Confirm and save to Supabase</button></div></section>`);
 $('record-edit').querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);
 recordStatus('Review the exact change. Nothing has been saved yet.');$('record-review').focus();
}
async function confirmChange(){
 const rec=recordState.record,rv=recordState.review;if(!rec||!rv)return;$('record-confirm').disabled=true;$('record-cancel').disabled=true;recordStatus('Saving…');
 try{const r=await recordFetch(recordEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'update_units_sold',sale_line_id:rec.sale_line_id,expected_units:rec.units_sold,expected_revision:rec.revision,new_units:rv.newUnits,reason:rv.reason})});
  if(r.status===409){recordState.record=r.body.current;recordState.review=null;$('record-detail').innerHTML=recordView(r.body.current);recordStatus(`Conflict: ${rec.sale_line_id} changed since you read it (now units_sold = ${r.body.current.units_sold}, revision ${r.body.current.revision}). Nothing was overwritten. Reconsider before proposing again.`);return;}
  if(!r.ok){recordStatus(r.body.message||`Save failed (${r.status}). Nothing was saved.`);$('record-confirm').disabled=false;$('record-cancel').disabled=false;return;}
  recordState.record=r.body.record;recordState.review=null;$('record-detail').innerHTML=recordView(r.body.record);
  recordStatus(`Saved: ${rec.sale_line_id} units_sold ${rec.units_sold} → ${r.body.record.units_sold} (revision ${r.body.record.revision}, ${r.body.record.last_edit?.edited_at}). Refreshing dashboard data from Supabase…`);
  await load();recordStatus(`Saved and dashboard re-read from Supabase. ${rec.sale_line_id}: units_sold ${rec.units_sold} → ${r.body.record.units_sold}, revision ${r.body.record.revision}. Close this dialog to check the changed figures.`);
 }catch{recordStatus('The save request could not be completed. Read the record again before retrying.');}
}
function cancelChange(){recordState.review=null;$('record-review')?.remove();$('record-edit')?.querySelectorAll('input,textarea,button').forEach(x=>x.disabled=false);recordStatus('Cancelled. Nothing was saved.');$('record-new')?.focus();}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-open-records]')){openRecords();return;}
 const rid=e.target.closest('[data-record-id]');if(rid){openRecord(rid.dataset.recordId);return;}
 if(e.target.closest('#record-cancel')){cancelChange();return;}
 if(e.target.closest('#record-confirm')){confirmChange();return;}
});
document.addEventListener('submit',e=>{if(e.target.id==='record-edit')reviewChange(e);});
$('record-load-lines').onclick=loadLines;
$('record-dialog').addEventListener('close',()=>{$('record-phrase').value='';recordState.review=null;});

// Week3 Exercise 3: finding → reviewed Trello card (server path /api/fashion-trello).
const trelloEndpoint='/api/fashion-trello';
let trelloState={context:null,destination:null,review:null,card:null};
const trelloAuth=()=>({Authorization:`Bearer ${$('trello-phrase').value}`});
function trelloStatus(m){$('trello-status').textContent=m;}
async function trelloPost(body){const r=await fetch(trelloEndpoint,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...trelloAuth()},body:JSON.stringify(body)});let b={};try{b=await r.json();}catch{}return {ok:r.ok,status:r.status,body:b};}
function trelloDraft(){
 const all={start:filters.start,end:filters.end,category:'',product:'',size:''};
 const sel=analyze(data,filters).totals,prod=analyze(data,{...all,product:filters.product}).totals,overall=analyze(data,all).totals;
 const name=data.cohorts.find(r=>r.product_id===filters.product)?.product_name||filters.product;
 const period=`${monthName(filters.start)}–${monthName(filters.end)}`;
 const link=`${location.origin}/#${new URLSearchParams({view:'products',start:filters.start,end:filters.end,product:filters.product,size:filters.size})}`;
 trelloState.context={name,size:filters.size,period,sel,prod,overall,link};
 const title=`Investigate high returns: ${name} size ${filters.size} (${pct(sel.rate)} unit return rate)`;
 const desc=`**Evidence (Fashion Returns dashboard, synthetic data, ${data.contract||'foundation-v1.1'})**
- Selection: ${name} · size ${filters.size} · original sales ${period}
- Unit return rate: ${pct(sel.rate)} (${num(sel.returned)} returned / ${num(sel.sold)} sold units, ${num(sel.sales_lines)} sales lines)
- Same product, all sizes: ${pct(prod.rate)} (${num(prod.returned)} / ${num(prod.sold)})
- All products: ${pct(overall.rate)} (${num(overall.returned)} / ${num(overall.sold)})
- Fit-related share for this selection: ${pct(sel.fitShare)} (${num(sel.fit)} / ${num(sel.returned)} returned units)
- Small group: ${num(sel.sold)} sold units, so one or two returns move the rate noticeably.
- Dashboard view: ${link}

**Requested next step**
Review the returned units for this product and size (reasons, return comments, size chart and product page) and check whether a sizing, quality or listing issue explains the gap versus the other sizes. Reported reasons are clues, not proof of causes.

**Useful response**
Reply on this card with: what you checked, the likely explanation (or "no clear cause"), and a recommended action (e.g. size-chart change, product-page note, supplier check, or no action) with an owner and date.`;
 $('trello-card-title').value=title;$('trello-card-desc').value=desc;
 $('trello-scope').textContent=`${name} · Size ${filters.size} · ${period} · ${pct(sel.rate)} (${num(sel.returned)}/${num(sel.sold)}) vs ${pct(prod.rate)} for the product and ${pct(overall.rate)} overall.`;
}
function destinationView(d,t){return `<dl class="record-fields trello-dest"><div><dt>Board</dt><dd>${esc(d.boardName)}</dd></div><div><dt>Destination list</dt><dd><strong>${esc(d.listName)}</strong></dd></div><div><dt>List ID</dt><dd>${esc(d.listId)}</dd></div>${t?`<div><dt>Token expires</dt><dd>${esc(t.expires)}</dd></div><div><dt>Token permissions</dt><dd>${esc(t.permissions.join(', ')||'n/a')}</dd></div>`:''}</dl>`;}
function openTrello(){
 if(!data||!filters.product||!filters.size)return;
 trelloState={context:null,destination:null,review:null,card:null};$('trello-destination').innerHTML='';$('trello-review').innerHTML='';
 $('trello-form').querySelectorAll('input,textarea,button').forEach(x=>x.disabled=false);
 trelloDraft();trelloStatus('Checking server settings…');$('trello-dialog').showModal();
 fetch(trelloEndpoint,{cache:'no-store'}).then(r=>r.json()).then(s=>trelloStatus(s.message)).catch(()=>trelloStatus('The Trello endpoint is unavailable. Check the deployed Vercel project.'));
}
async function inspectTrello(){
 $('trello-inspect').disabled=true;trelloStatus('Inspecting destination (read-only)…');
 try{const r=await trelloPost({operation:'inspect'});
  if(r.body.state==='list_needed'){trelloStatus(r.body.message);$('trello-destination').innerHTML=`<div class="table-scroll" tabindex="0" role="region" aria-label="Lists your token can reach"><table class="record-table"><caption>Token expires: ${esc(r.body.token.expires)} · permissions: ${esc(r.body.token.permissions.join(', '))}</caption><thead><tr><th scope="col">Board</th><th scope="col">List</th><th scope="col">List ID</th></tr></thead><tbody>${r.body.boards.flatMap(b=>b.lists.map(l=>`<tr><td>${esc(b.boardName)}</td><td>${esc(l.listName)}</td><td><code>${esc(l.listId)}</code></td></tr>`)).join('')}</tbody></table></div>`;return;}
  if(!r.ok){trelloStatus(r.body.message||`Check failed (${r.status}). No card was created.`);return;}
  trelloState.destination=r.body.destination;
  trelloStatus(`${r.body.message} Checked ${r.body.checkedAt}.`);$('trello-destination').innerHTML=destinationView(r.body.destination,r.body.token);
 }catch{trelloStatus('The destination check could not be completed. No card was created.');}
 finally{$('trello-inspect').disabled=false;}
}
function reviewTrello(e){
 e.preventDefault();
 if(trelloState.card){trelloStatus('A card was already created from this dialog. Open it instead of creating a duplicate.');return;}
 if(!trelloState.destination){trelloStatus('Check the destination first so you can review exactly where the card will go.');$('trello-inspect').focus();return;}
 const title=$('trello-card-title').value.trim(),desc=$('trello-card-desc').value.trim();
 if(!title||/[\r\n]/.test(title)||!desc){trelloStatus('Write a one-line title and a description.');return;}
 trelloState.review={title,desc};$('trello-form').querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);
 $('trello-review').innerHTML=`<section class="record-review" id="trello-review-box" tabindex="-1" aria-label="Review before creating"><h3>Review before creating</h3>${destinationView(trelloState.destination)}<p><strong>Title:</strong> ${esc(title)}</p><pre class="trello-desc">${esc(desc)}</pre><p>One card will be created at the top of this list. Nothing is assigned; creation does not mean the task is done.</p><div class="email-buttons"><button class="button secondary" id="trello-cancel" type="button">Cancel · no card created</button><button class="button" id="trello-confirm" type="button">Create card in “${esc(trelloState.destination.listName)}”</button></div></section>`;
 trelloStatus('Review the exact destination and content. No card has been created yet.');$('trello-review-box').focus();
}
function cancelTrello(){trelloState.review=null;$('trello-review').innerHTML='';$('trello-form').querySelectorAll('input,textarea,button').forEach(x=>x.disabled=false);trelloStatus('Cancelled. No card was created.');$('trello-card-title').focus();}
async function confirmTrello(){
 const rv=trelloState.review;if(!rv||trelloState.card)return;$('trello-confirm').disabled=true;$('trello-cancel').disabled=true;trelloStatus('Creating card…');
 try{const r=await trelloPost({operation:'create_card',expected_list_id:trelloState.destination.listId,title:rv.title,description:rv.desc});
  if(!r.ok){trelloStatus(r.body.message||`Creation failed (${r.status}). Check the board before retrying.`);$('trello-cancel').disabled=false;return;}
  trelloState.card=r.body.card;
  $('trello-review').innerHTML=`<section class="record-card" aria-label="Created card"><h3>Card created</h3><dl class="record-fields"><div><dt>Card ID</dt><dd>${esc(r.body.card.id)}</dd></div><div><dt>Board / list</dt><dd>${esc(r.body.destination.boardName)} / ${esc(r.body.destination.listName)}</dd></div><div><dt>Created</dt><dd>${esc(r.body.createdAt)}</dd></div><div><dt>Content matches review</dt><dd>${r.body.card.name===rv.title&&r.body.card.desc.trim()===rv.desc?'Yes (title and description returned by Trello)':'No — compare in Trello'}</dd></div></dl><p><a class="button" href="${esc(r.body.card.url)}" target="_blank" rel="noopener">Open card in Trello ↗</a></p><p>${esc(r.body.message)}</p></section>`;
  trelloStatus(`Card created in ${r.body.destination.listName}. Open it in Trello to verify.`);
 }catch{trelloStatus('The request could not be completed. Check the Trello list before retrying to avoid a duplicate.');}
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-open-trello]')){openTrello();return;}
 if(e.target.closest('#trello-cancel')){cancelTrello();return;}
 if(e.target.closest('#trello-confirm')){confirmTrello();return;}
});
document.addEventListener('submit',e=>{if(e.target.id==='trello-form'){reviewTrello(e);}});
$('trello-inspect').onclick=inspectTrello;
$('trello-dialog').addEventListener('close',()=>{$('trello-phrase').value='';});
