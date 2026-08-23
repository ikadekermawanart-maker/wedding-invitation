const json=(data,status=200)=>Response.json(data,{
  status,
  headers:{
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  }
});

export async function onRequestGet(context){
  const url=new URL(context.request.url);
  const weddingId=String(url.searchParams.get("wedding_id")||"").trim();

  if(!weddingId||weddingId.length>80){
    return json({error:"Event tidak valid"},400);
  }

  const result=await context.env.DB.prepare(`
    SELECT id,wedding_id,guest_name,message,created_at
    FROM comments
    WHERE wedding_id=?
    ORDER BY id DESC
    LIMIT 200
  `).bind(weddingId).all();

  return json({comments:result.results||[]});
}

export async function onRequestPost(context){
  let body;

  try{
    body=await context.request.json();
  }catch{
    return json({error:"JSON tidak valid"},400);
  }

  const weddingId=String(body.wedding_id||"").trim();
  const guestName=String(body.guest_name||"").trim();
  const message=String(body.message||"").trim();

  if(!weddingId||weddingId.length>80){
    return json({error:"Event tidak valid"},400);
  }

  if(!guestName||guestName.length>80){
    return json({error:"Nama wajib diisi"},400);
  }

  if(!message||message.length>500){
    return json({error:"Ucapan wajib diisi dan maksimal 500 karakter"},400);
  }

  const result=await context.env.DB.prepare(`
    INSERT INTO comments (wedding_id,guest_name,message)
    VALUES (?,?,?)
  `).bind(weddingId,guestName,message).run();

  return json({
    ok:true,
    id:result.meta?.last_row_id||null
  });
}

export async function onRequestDelete(context){
  const url=new URL(context.request.url);

  const id=Number(url.searchParams.get("id"));
  const weddingId=String(url.searchParams.get("wedding_id")||"").trim();

  if(!Number.isInteger(id)||id<1){
    return json({error:"ID komentar tidak valid"},400);
  }

  if(!weddingId||weddingId.length>80){
    return json({error:"Event tidak valid"},400);
  }

  const existing=await context.env.DB.prepare(`
    SELECT id
    FROM comments
    WHERE id=? AND wedding_id=?
  `).bind(id,weddingId).first();

  if(!existing){
    return json({error:"Komentar tidak ditemukan"},404);
  }

  await context.env.DB.prepare(`
    DELETE FROM comments
    WHERE id=? AND wedding_id=?
  `).bind(id,weddingId).run();

  return json({ok:true,id});
}