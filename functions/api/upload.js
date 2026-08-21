const json=(data,status=200)=>Response.json(data,{status});
export async function onRequestPost(context){
  if(!context.env.MEDIA)return json({error:"R2 binding MEDIA belum terhubung"},500);
  const url=new URL(context.request.url),slug=(url.searchParams.get("slug")||"").trim(),kind=(url.searchParams.get("kind")||"image").trim(),index=Number(url.searchParams.get("index")||0);
  if(!/^[a-z0-9-]{1,80}$/.test(slug))return json({error:"Slug tidak valid"},400);
  if(!["cover","gallery"].includes(kind))return json({error:"Jenis foto tidak valid"},400);
  if(!Number.isInteger(index)||index<0||index>20)return json({error:"Index tidak valid"},400);
  if((context.request.headers.get("Content-Type")||"")!=="image/webp")return json({error:"Hanya WebP yang diterima"},415);
  const body=await context.request.arrayBuffer();
  if(!body.byteLength||body.byteLength>5*1024*1024)return json({error:"Ukuran foto tidak valid"},400);
  const key=kind==="cover"?`${slug}/cover.webp`:`${slug}/gallery-${index}.webp`;
  await context.env.MEDIA.put(key,body,{httpMetadata:{contentType:"image/webp",cacheControl:"public, max-age=31536000"}});
  return json({ok:true,url:`/media/${key}`});
}
