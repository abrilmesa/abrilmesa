// Server-only record read/write for one synthetic numeric field (sales.units_sold).
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const reply=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 try{
  const {createRecordService}=await import('../server-lib/fashion-record.mjs');const service=createRecordService();
  const query=Object.fromEntries(new URL(req.url,'http://local').searchParams);
  if(req.method==='GET'){
   if(!query.id&&!query.product)return reply(200,service.status());
   const r=await service.read(query,req.headers.authorization);return reply(r.status,r.body);
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(405,{state:'rejected',message:'Use GET or POST.'});}
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return reply(403,{state:'rejected',message:'Origin not allowed.'});
  if(!(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{state:'rejected',message:'Use application/json.'});
  let raw;if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{let chunks=[],n=0;for await(const chunk of req){n+=chunk.length;if(n>4096)return reply(413,{state:'rejected',message:'Request too large.'});chunks.push(chunk);}raw=Buffer.concat(chunks).toString('utf8');}
  if(Buffer.byteLength(raw)>4096)return reply(413,{state:'rejected',message:'Request too large.'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{state:'rejected',message:'Invalid JSON.'});}
  const r=await service.update(body,req.headers.authorization);return reply(r.status,r.body);
 }catch{return reply(503,{state:'unavailable',message:'The record service is unavailable. Nothing was saved.'});}
};
