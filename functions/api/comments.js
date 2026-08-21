const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet(context){
  const weddingId=(new URL(context.request.url).searchParams.get("wedding_id")||"").trim();
  if(!weddingId||weddingId.length>100)return json({error:"event id tidak valid"},400);
  const result=await context.env.DB.prepare(`SELECT id,wedding_id,guest_name,message,created_at FROM comments WHERE wedding_id=? ORDER BY id DESC LIMIT 50`).bind(weddingId).all();
  return json({comments:result.results||[]});
}
export async function onRequestPost(context){
  let body;try{body=await context.request.json()}catch{return json({error:"Format JSON tidak valid"},400)}
  const weddingId=String(body.wedding_id||"").trim(),guestName=String(body.guest_name||"").trim(),message=String(body.message||"").trim();
  if(!weddingId||weddingId.length>100)return json({error:"event id tidak valid"},400);
  if(!guestName||guestName.length>80)return json({error:"Nama wajib diisi, maksimal 80 karakter"},400);
  if(!message||message.length>500)return json({error:"Ucapan wajib diisi, maksimal 500 karakter"},400);
  await context.env.DB.prepare(`INSERT INTO comments (wedding_id,guest_name,message) VALUES (?,?,?)`).bind(weddingId,guestName,message).run();
  return json({ok:true},201);
}
