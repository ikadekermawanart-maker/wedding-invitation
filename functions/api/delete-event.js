const json=(data,status=200)=>Response.json(data,{
  status,
  headers:{
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  }
});

export async function onRequestDelete(context){
  const url=new URL(context.request.url);
  const slug=String(url.searchParams.get("slug")||"").trim();

  if(!/^[a-z0-9-]{1,80}$/.test(slug)){
    return json({error:"Slug tidak valid"},400);
  }

  const existing=await context.env.DB.prepare(`
    SELECT slug
    FROM events
    WHERE slug=?
  `).bind(slug).first();

  if(!existing){
    return json({error:"Event tidak ditemukan"},404);
  }

  // Hapus komentar milik event terlebih dahulu.
  await context.env.DB.prepare(`
    DELETE FROM comments
    WHERE wedding_id=?
  `).bind(slug).run();

  // Hapus event.
  await context.env.DB.prepare(`
    DELETE FROM events
    WHERE slug=?
  `).bind(slug).run();

  /*
    File R2 sengaja TIDAK dihapus.

    Alasannya:
    - Event hasil duplikasi bisa masih mereferensikan foto/musik event lama.
    - Menghapus file R2 otomatis berisiko merusak event lain.
    - Pembersihan file R2 sebaiknya menjadi fitur terpisah setelah kita punya
      sistem pemeriksaan file yang sudah tidak dipakai.
  */

  return json({
    ok:true,
    deleted_slug:slug
  });
}
