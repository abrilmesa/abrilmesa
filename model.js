/* Shared calculations used by the app and its data checks. */
(function(root){
  'use strict';
  function normalize(data){
    if(!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !Number.isFinite(data.metadata?.generated)) throw new Error('The earthquake dataset is not valid USGS GeoJSON.');
    return data.features.filter(f=>f.properties?.type==='earthquake' && Number.isFinite(f.properties.mag) && Number.isFinite(f.properties.time) && Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length>=3 && f.geometry.coordinates.every(Number.isFinite) && Math.abs(f.geometry.coordinates[0])<=180 && Math.abs(f.geometry.coordinates[1])<=90).map(f=>({id:f.id,mag:f.properties.mag,place:f.properties.place || 'Location not specified',time:f.properties.time,depth:f.geometry.coordinates[2],lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],url:f.properties.url,magType:f.properties.magType || 'not specified',status:f.properties.status || 'not specified'}));
  }
  function filter(events,options,anchor){
    const query=options.query.trim().toLowerCase(),minimum=options.minimum==='all'?-Infinity:Number(options.minimum),cutoff=anchor-Number(options.hours)*3600000;
    return events.filter(e=>e.time>=cutoff && e.time<=anchor && e.mag>=minimum && e.place.toLowerCase().includes(query) && (options.depth==='all' || (options.depth==='shallow'?e.depth<=70:e.depth>70)));
  }
  function summarize(events){return {count:events.length,largest:events.reduce((best,e)=>!best||e.mag>best.mag?e:best,null),averageDepth:events.length?events.reduce((sum,e)=>sum+e.depth,0)/events.length:null,strong:events.filter(e=>e.mag>=4.5).length};}
  function distribution(events){return [{label:'< 1.0',color:'#b8cda0',count:events.filter(e=>e.mag<1).length},{label:'1.0–2.4',color:'#8fa97d',count:events.filter(e=>e.mag>=1&&e.mag<2.5).length},{label:'2.5–4.4',color:'#e4c37f',count:events.filter(e=>e.mag>=2.5&&e.mag<4.5).length},{label:'≥ 4.5',color:'#eaa078',count:events.filter(e=>e.mag>=4.5).length}];}
  function timeline(events,hours,anchor){
    const start=new Date(anchor-Number(hours)*3600000);start.setUTCHours(0,0,0,0);const end=new Date(anchor);end.setUTCHours(0,0,0,0);const bins=[];
    for(let t=start.getTime();t<=end.getTime();t+=86400000) bins.push({time:t,count:0});
    for(const e of events){const index=Math.floor((e.time-start.getTime())/86400000);if(bins[index])bins[index].count++;}return bins;
  }
  function csv(events){const cell=value=>'"'+String(value??'').replace(/"/g,'""')+'"';return [['id','location','magnitude','magnitude_type','depth_km','latitude','longitude','time_utc','usgs_url'],...events.map(e=>[e.id,/^[=+@\-\t\r]/.test(e.place)?"'"+e.place:e.place,e.mag,e.magType,e.depth,e.lat,e.lon,new Date(e.time).toISOString(),e.url])].map(row=>row.map(cell).join(',')).join('\r\n');}
  root.QuakeModel={normalize,filter,summarize,distribution,timeline,csv};
})(typeof window==='undefined'?globalThis:window);
