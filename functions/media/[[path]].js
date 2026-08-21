export async function onRequestGet(context){
  if(!context.env.MEDIA)return new Response("R2 binding MEDIA belum terhubung",{status:500});
  const path=context.params.path,key=Array.isArray(path)?path.join("/"):String(path||"");
  const object=await context.env.MEDIA.get(key);
  if(!object)return new Response("Not found",{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set("etag",object.httpEtag);headers.set("Cache-Control","public, max-age=31536000");
  return new Response(object.body,{headers});
}
