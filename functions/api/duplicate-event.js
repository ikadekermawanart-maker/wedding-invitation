const json=(data,status=200)=>Response.json(data,{
  status,
  headers:{
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  }
});

export async function onRequestPost(context){
  let body;

  try{
    body=await context.request.json();
  }catch{
    return json({error:"JSON tidak valid"},400);
  }

  const source=String(body.source_slug||"").trim();
  const target=String(body.target_slug||"").trim();

  if(!/^[a-z0-9-]{1,80}$/.test(source)){
    return json({error:"Slug sumber tidak valid"},400);
  }

  if(!/^[a-z0-9-]{1,80}$/.test(target)){
    return json({error:"Slug baru tidak valid"},400);
  }

  if(source===target){
    return json({error:"Slug baru harus berbeda dari slug sumber"},400);
  }

  const sourceRow=await context.env.DB.prepare(`
    SELECT slug
    FROM events
    WHERE slug=?
  `).bind(source).first();

  if(!sourceRow){
    return json({error:"Event sumber tidak ditemukan"},404);
  }

  const targetRow=await context.env.DB.prepare(`
    SELECT slug
    FROM events
    WHERE slug=?
  `).bind(target).first();

  if(targetRow){
    return json({
      error:"Slug baru sudah digunakan. Pilih slug lain agar event lama tidak tertimpa."
    },409);
  }

  await context.env.DB.prepare(`
    INSERT INTO events (
      slug,
      event_type,
      event_type_label,
      event_label,
      event_title,
      main_name,
      subtitle,
      event_date,
      date_language,
      event_time,
      location,
      maps_url,
      music_url,
      dresscode_title,
      dresscode_note,
      dresscode_male_colors,
      dresscode_female_colors,
      description,
      cover_url,
      cover_video_url,
      gallery_urls,
      created_at,
      updated_at
    )
    SELECT
      ?,
      event_type,
      event_type_label,
      event_label,
      event_title,
      main_name,
      subtitle,
      event_date,
      COALESCE(NULLIF(date_language,''),'id'),
      event_time,
      location,
      maps_url,
      music_url,
      dresscode_title,
      dresscode_note,
      dresscode_male_colors,
      dresscode_female_colors,
      description,
      cover_url,
      cover_video_url,
      gallery_urls,
      datetime('now'),
      datetime('now')
    FROM events
    WHERE slug=?
  `).bind(target,source).run();

  return json({
    ok:true,
    source_slug:source,
    target_slug:target
  });
}
