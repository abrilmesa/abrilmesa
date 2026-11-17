import sqlite3,json
from pathlib import Path
p=Path('outputs/fashion-returns-block03-ex04');rows=json.loads((p/'journey-observed-local.json').read_text())+json.loads((p/'journey-observed-live.json').read_text())
c=sqlite3.connect('file:outputs/fashion-returns-foundation-v1.1/fashion_returns.sqlite?mode=ro',uri=True)
result=[]
for r in rows:
 f=r['filters'];where=['substr(s.sale_date,1,7) between ? and ?'];args=[f['start'],f['end']]
 for key,col in [('category','p.category'),('product','p.product_id'),('size','v.size')]:
  if f[key]:where.append(col+'=?');args.append(f[key])
 scope=' from sales s join variants v on s.variant_id=v.variant_id join products p on v.product_id=p.product_id '
 condition=' where '+' and '.join(where)
 sold=c.execute('select coalesce(sum(s.units_sold),0)'+scope+condition,args).fetchone()[0]
 returned,refund,fit=c.execute("select coalesce(sum(r.returned_units),0),coalesce(sum(r.refund_usd),0),coalesce(sum(case when rr.reason_group='Fit' then r.returned_units else 0 end),0)"+scope+' join returns r on r.sale_line_id=s.sale_line_id join return_reasons rr on r.reason_code=rr.reason_code'+condition,args).fetchone()
 expected=[100*returned/sold if sold else None,returned,float(refund),100*fit/returned if returned else None]
 observed=[None if v=='N/A' else float(v.replace(',','').replace('$','').replace('%','')) for v in r['kpis']]
 passed=all(a is None and b is None or a is not None and b is not None and abs(a-b)<.005001 for a,b in zip(expected,observed))
 assert passed,(r['label'],expected,observed)
 result.append({'step':r['label'],'filters':f,'sourceExpected':expected,'screenObserved':r['kpis'],'passed':passed})
(p/'expected-vs-observed.json').write_text(json.dumps({'passed':True,'checkedSteps':len(result),'source':'Independent raw SQLite sales and returns queries with dimension keys; no raw-return join in sold-unit sum','checks':result},indent=2))
print(json.dumps({'passed':True,'checkedSteps':len(result)}))
