export const MONTHS = Array.from({length:12},(_,i)=>`${i<3?2025:2026}-${String((i+9)%12+1).padStart(2,'0')}`);
export function summarize(rows) {
  const result = rows.reduce((a,r)=>({sold:a.sold+Number(r.sold),returned:a.returned+Number(r.returned),refundCents:a.refundCents+Math.round(Number(r.refunds)*100),fit:a.fit+Number(r.fit),sales_lines:a.sales_lines+Number(r.sales_lines)}),{sold:0,returned:0,refundCents:0,fit:0,sales_lines:0});
  return {...result, refunds:result.refundCents/100, rate:result.sold?100*result.returned/result.sold:null,fitShare:result.returned?100*result.fit/result.returned:null};
}
export function matches(r,f,period=true){return (!period||(r.month>=f.start&&r.month<=f.end))&&(!f.category||r.category===f.category)&&(!f.product||r.product_id===f.product)&&(!f.size||r.size===f.size);}
export function group(rows,key){const groups=new Map();for(const r of rows){const k=r[key];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}return [...groups].map(([name,items])=>({name,...summarize(items),product_id:items[0].product_id,product_name:items[0].product_name,category:items[0].category}));}
export function analyze(data,f){
  const rows=data.cohorts.filter(r=>matches(r,f));
  const segment=data.cohorts.filter(r=>matches(r,f,false));
  const monthly=MONTHS.filter(m=>m>=f.start&&m<=f.end).map(month=>({month,...summarize(rows.filter(r=>r.month===month))}));
  const priorIndex=MONTHS.indexOf(f.end)-1;
  const current={month:f.end,...summarize(segment.filter(r=>r.month===f.end))};
  const previous=priorIndex>=0?{month:MONTHS[priorIndex],...summarize(segment.filter(r=>r.month===MONTHS[priorIndex]))}:null;
  const reasonMap=new Map();for(const r of data.reasons.filter(r=>matches(r,f))){const k=r.reason_code;if(!reasonMap.has(k))reasonMap.set(k,{name:r.reason_label,group:r.reason_group,returned:0});reasonMap.get(k).returned+=Number(r.returned);}
  return {totals:summarize(rows),monthly,current,previous,categories:group(rows,'category').sort((a,b)=>(b.rate??-1)-(a.rate??-1)),products:group(rows,'product_id').sort((a,b)=>(b.rate??-1)-(a.rate??-1)),sizes:group(rows,'size'),reasons:[...reasonMap.values()].sort((a,b)=>b.returned-a.returned)};
}
export function validate(data){
  if(data.contract!=='foundation-v1.1'||data.source_type!=='synthetic'||!Array.isArray(data.cohorts)||!Array.isArray(data.reasons))throw Error('The response does not match the approved synthetic data contract.');
  const keys=new Set();
  for(const r of data.cohorts){const key=[r.month,r.product_id,r.size].join('|');if(keys.has(key))throw Error('Duplicate aggregate key: load rejected.');keys.add(key);if(!MONTHS.includes(r.month)||!r.product_id||!r.product_name||!r.category||!['XS','S','M','L','XL'].includes(r.size))throw Error('Missing or invalid cohort dimensions.');for(const k of ['sold','returned','refunds','fit','sales_lines'])if(r[k]===null||r[k]===''||!Number.isFinite(Number(r[k]))||Number(r[k])<0)throw Error(`Invalid ${k}: load rejected.`);for(const k of ['sold','returned','fit','sales_lines'])if(!Number.isInteger(Number(r[k])))throw Error('Invalid unit counts.');if(Number(r.returned)>Number(r.sold)||Number(r.fit)>Number(r.returned))throw Error('Inconsistent cohort counts.');}
  const reasonKeys=new Set();let returned=0,fit=0;for(const r of data.reasons){const key=[r.month,r.product_id,r.size,r.reason_code].join('|');if(reasonKeys.has(key)||!keys.has([r.month,r.product_id,r.size].join('|'))||!r.reason_label||!r.reason_group||!Number.isInteger(Number(r.returned))||Number(r.returned)<=0)throw Error('Invalid return-reason aggregate.');reasonKeys.add(key);returned+=Number(r.returned);if(r.reason_group==='Fit')fit+=Number(r.returned);}
  const total=summarize(data.cohorts);if(total.sales_lines!==6229||total.sold!==7257||total.returned!==1660||total.refundCents!==11085240||total.fit!==844||returned!==total.returned||fit!==total.fit)throw Error('Data does not reconcile to frozen foundation v1.1. Keeping the last validated screen; a changed source requires revalidation.');
  return data;
}

// Internal benchmark: same product and sale cohort, with selected size excluded.
export function sizePeerComparison(data,f){
  if(!f.product||!f.size)return {status:'choose',message:'Select one product and one size above to compare it with the other sizes of that product.'};
  const base=data.cohorts.filter(r=>matches(r,{...f,size:''}));
  const selected=summarize(base.filter(r=>r.size===f.size));
  const peers=summarize(base.filter(r=>r.size!==f.size));
  const productName=base[0]?.product_name||data.cohorts.find(r=>r.product_id===f.product)?.product_name||f.product;
  const sizes=['XS','S','M','L','XL'].filter(s=>s!==f.size);
  if(!selected.sold||!peers.sold)return {status:'unavailable',selected,peers,productName,sizes,message:!selected.sold?'The selected size has no sold units in this period. A comparison cannot be calculated.':'The other sizes have no sold units in this period. A benchmark cannot be calculated.'};
  return {status:'available',selected,peers,productName,sizes,differencePp:selected.rate-peers.rate};
}
