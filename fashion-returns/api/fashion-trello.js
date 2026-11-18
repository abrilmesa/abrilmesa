// Server-only Trello inspection and card creation (Exercise 3).
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const reply=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 try{
  const {createTrelloService}=await import('../server-lib/fashion-trello.mjs');const service=createTrelloService();
    if(req.method==='GET')return reply(200,service.status());
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(405,{state:'rejected',message:'Use GET or POST.'});}
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return reply(403,{state:'rejected',message:'Origin not allowed.'});
  if(!(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{state:'rejected',message:'Use application/json.'});
  let raw;if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{let chunks=[],n=0;for await(const chunk of req){n+=chunk.length;if(n>16384)return reply(413,{state:'rejected',message:'Request too large.'});chunks.push(chunk);}raw=Buffer.concat(chunks).toString('utf8');}
  if(Buffer.byteLength(raw)>16384)return reply(413,{state:'rejected',message:'Request too large.'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{state:'rejected',message:'Invalid JSON.'});}
  const r=body&&body.operation==='inspect'&&Object.keys(body).length===1?await service.inspect(req.headers.authorization):await service.create(body,req.headers.authorization);return reply(r.status,r.body);
 }catch{return reply(503,{state:'unavailable',message:'The Trello service is unavailable. No card was created.'});}
};
