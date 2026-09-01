const json=(data,status=200)=>Response.json(data,{
  status,
  headers:{
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  }
});

export async function onRequestGet(context){
  const slug=(new URL(context.request.url).searchParams.get("slug")||"").trim();

  if(!slug||slug.length>80){
    return json({error:"Slug tidak valid"},400);
  }

  const row=await context.env.DB.prepare(`
    SELECT
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
      welcome_message,
      welcome_photo_url,
      cover_url,
      cover_video_url,
      gallery_urls,
      created_at,
      updated_at
    FROM events
    WHERE slug=?
  `).bind(slug).first();

  if(!row){
    return json({error:"Acara tidak ditemukan"},404);
  }

  row.date_language=row.date_language==="en"?"en":"id";

  try{
    row.gallery_urls=row.gallery_urls?JSON.parse(row.gallery_urls):[];
  }catch{
    row.gallery_urls=[];
  }

  try{
    row.dresscode_male_colors=row.dresscode_male_colors
      ? JSON.parse(row.dresscode_male_colors)
      : [];
  }catch{
    row.dresscode_male_colors=[];
  }

  try{
    row.dresscode_female_colors=row.dresscode_female_colors
      ? JSON.parse(row.dresscode_female_colors)
      : [];
  }catch{
    row.dresscode_female_colors=[];
  }

  return json({event:row});
}

export async function onRequestPost(context){
  let body;

  try{
    body=await context.request.json();
  }catch{
    return json({error:"JSON tidak valid"},400);
  }

  const slug=String(body.slug||"").trim();
  const title=String(body.event_title||"").trim();
  const mapsUrl=String(body.maps_url||"").trim();
  const musicUrl=String(body.music_url||"").trim();
  const coverVideoUrl=String(body.cover_video_url||"").trim();
  const dresscodeTitle=String(body.dresscode_title||"").trim();
  const dresscodeNote=String(body.dresscode_note||"").trim();
  const welcomeMessage=String(body.welcome_message||"").trim();
  const welcomePhotoUrl=String(body.welcome_photo_url||"").trim();
  const dateLanguage=body.date_language==="en"?"en":"id";

  const cleanColors=(value)=>{
    if(!Array.isArray(value)) return [];

    return value.map(item=>{
      if(typeof item==="string"){
        const color=String(item||"").trim().toUpperCase();
        return /^#[0-9A-F]{6}$/.test(color)
          ? {color,name:""}
          : null;
      }

      if(item && typeof item==="object"){
        const color=String(item.color||"").trim().toUpperCase();
        const name=String(item.name||"").trim().slice(0,40);

        return /^#[0-9A-F]{6}$/.test(color)
          ? {color,name}
          : null;
      }

      return null;
    }).filter(Boolean).slice(0,6);
  };

  const maleColors=cleanColors(body.dresscode_male_colors);
  const femaleColors=cleanColors(body.dresscode_female_colors);

  if(!/^[a-z0-9-]{1,80}$/.test(slug)){
    return json({error:"Slug tidak valid"},400);
  }

  if(!title||title.length>160){
    return json({error:"Judul wajib diisi"},400);
  }

  if(mapsUrl&&!/^https?:\/\//i.test(mapsUrl)){
    return json({error:"Link Google Maps tidak valid"},400);
  }

  if(musicUrl &&
     !/^https?:\/\//i.test(musicUrl) &&
     !/^\/media\//i.test(musicUrl)){
    return json({error:"URL musik tidak valid"},400);
  }

  if(coverVideoUrl &&
     !/^https?:\/\//i.test(coverVideoUrl) &&
     !/^\/media\//i.test(coverVideoUrl)){
    return json({error:"URL video cover tidak valid"},400);
  }

  if(welcomePhotoUrl &&
     !/^https?:\/\//i.test(welcomePhotoUrl) &&
     !/^\/media\//i.test(welcomePhotoUrl)){
    return json({error:"URL foto kata sambutan tidak valid"},400);
  }

  const gallery=JSON.stringify(
    Array.isArray(body.gallery_urls)?body.gallery_urls.slice(0,6):[]
  );

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
      welcome_message,
      welcome_photo_url,
      cover_url,
      cover_video_url,
      gallery_urls,
      updated_at
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      event_type=excluded.event_type,
      event_type_label=excluded.event_type_label,
      event_label=excluded.event_label,
      event_title=excluded.event_title,
      main_name=excluded.main_name,
      subtitle=excluded.subtitle,
      event_date=excluded.event_date,
      date_language=excluded.date_language,
      event_time=excluded.event_time,
      location=excluded.location,
      maps_url=excluded.maps_url,
      music_url=excluded.music_url,
      dresscode_title=excluded.dresscode_title,
      dresscode_note=excluded.dresscode_note,
      dresscode_male_colors=excluded.dresscode_male_colors,
      dresscode_female_colors=excluded.dresscode_female_colors,
      description=excluded.description,
      welcome_message=excluded.welcome_message,
      welcome_photo_url=excluded.welcome_photo_url,
      cover_url=excluded.cover_url,
      cover_video_url=excluded.cover_video_url,
      gallery_urls=excluded.gallery_urls,
      updated_at=datetime('now')
  `).bind(
    slug,
    String(body.event_type||"custom").slice(0,40),
    String(body.event_type_label||"Invitation").slice(0,80),
    String(body.event_label||"You're Invited").slice(0,120),
    title,
    String(body.main_name||"").slice(0,160),
    String(body.subtitle||"").slice(0,220),
    String(body.event_date||"").slice(0,20),
    dateLanguage,
    String(body.event_time||"").slice(0,20),
    String(body.location||"").slice(0,240),
    mapsUrl.slice(0,1000),
    musicUrl.slice(0,1000),
    dresscodeTitle.slice(0,120),
    dresscodeNote.slice(0,220),
    JSON.stringify(maleColors),
    JSON.stringify(femaleColors),
    String(body.description||"").slice(0,1200),
    welcomeMessage.slice(0,1200),
    welcomePhotoUrl.slice(0,1000),
    String(body.cover_url||"").slice(0,500),
    coverVideoUrl.slice(0,1000),
    gallery
  ).run();

  return json({ok:true,slug});
}
