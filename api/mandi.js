/* Official data.gov.in prices. Never embed credentials in the browser or source control. */
export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=3600');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const key=process.env.DATA_GOV_IN_API_KEY;
  if(!key)return res.status(503).json({error:'Government API key not configured. Manual comparison and cached quotes remain available.'});
  const commodity=String(req.query.commodity||'').trim().slice(0,60);
  const state=String(req.query.state||'').trim().slice(0,60);
  const district=String(req.query.district||'').trim().slice(0,60);
  if(!/^[A-Za-z][A-Za-z\s.-]{1,59}$/.test(commodity)||!state||!/^[A-Za-z\s.-]{2,60}$/.test(state))return res.status(400).json({error:'Valid crop and state required'});
  const u=new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
  u.searchParams.set('api-key',key);u.searchParams.set('format','json');u.searchParams.set('limit','100');
  u.searchParams.set('filters[commodity]',commodity);u.searchParams.set('filters[state.keyword]',state);
  if(district)u.searchParams.set('filters[district]',district);
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),9500);
  try{
    const response=await fetch(u,{signal:abort.signal});
    if(!response.ok)throw new Error(`Government API returned ${response.status}`);
    const payload=await response.json();
    const rows=(Array.isArray(payload.records)?payload.records:[]).filter(r=>Number.isFinite(Number(r.modal_price))&&Number(r.modal_price)>0).map(r=>({
      market:String(r.market||''),district:String(r.district||''),state:String(r.state||''),commodity:String(r.commodity||''),date:String(r.arrival_date||''),
      priceKg:Number(r.modal_price)/100,priceQuintal:Number(r.modal_price),source:'data.gov.in / AGMARKNET'
    }));
    return res.status(200).json({rows,receivedAt:new Date().toISOString(),source:'https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi',note:'Wholesale modal prices converted from ₹/quintal to ₹/kg; transport, commission and actual local proximity must be checked separately.'});
  }catch(err){return res.status(502).json({error:'Could not retrieve government market data',reason:String(err.message||err)});}finally{clearTimeout(timer);}
}
