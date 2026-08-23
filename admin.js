const typeDefaults={
wedding:["The Wedding of","Wedding"],
sweet17:["Sweet Seventeen","Sweet Seventeen"],
birthday:["Birthday Celebration","Birthday"],
engagement:["The Engagement of","Engagement"],
anniversary:["Anniversary Celebration","Anniversary"],
babyshower:["Baby Shower","Baby Shower"],
graduation:["Graduation Celebration","Graduation"],
custom:["You're Invited","Custom Event"]
};

let coverUrl="";
let galleryUrls=[];
let dragIndex=null;

const $=id=>document.getElementById(id);

function sanitizeSlug(v){
  return v.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g,"")
    .replace(/\s+/g,"-")
    .replace(/-+/g,"-")
    .slice(0,80);
}

$("slug").addEventListener("input",e=>{
  e.target.value=sanitizeSlug(e.target.value);
});

$("eventType").addEventListener("change",e=>{
  $("eventLabel").value=(typeDefaults[e.target.value]||typeDefaults.custom)[0];
});

async function compressImage(file,maxDimension=1600,quality=.78){
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));

  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;

  canvas.getContext("2d").drawImage(bitmap,0,0,width,height);
  bitmap.close();

  const blob=await new Promise((resolve,reject)=>
    canvas.toBlob(
      b=>b?resolve(b):reject(new Error("Kompresi gagal")),
      "image/webp",
      quality
    )
  );

  return {blob,width,height};
}

async function uploadBlob(blob,slug,kind,index=0){
  const r=await fetch(
    `/api/upload?slug=${encodeURIComponent(slug)}&kind=${encodeURIComponent(kind)}&index=${index}`,
    {
      method:"POST",
      headers:{"Content-Type":"image/webp"},
      body:blob
    }
  );

  const data=await r.json();
  if(!r.ok) throw new Error(data.error||"Upload gagal");
  return data.url;
}

function moveGalleryItem(from,to){
  if(from===to) return;
  if(from<0||to<0||from>=galleryUrls.length||to>=galleryUrls.length) return;

  const [item]=galleryUrls.splice(from,1);
  galleryUrls.splice(to,0,item);

  renderGalleryPreview();
  $("galleryInfo").textContent=
    "Urutan foto berubah. Klik Simpan Undangan untuk menyimpan.";
}

function renderGalleryPreview(){
  const wrap=$("galleryPreview");
  wrap.replaceChildren();

  galleryUrls.forEach((url,index)=>{
    const item=document.createElement("div");
    item.className="gallery-admin-item";
    item.draggable=true;
    item.dataset.index=String(index);

    const position=document.createElement("div");
    position.className="gallery-position";
    position.textContent=String(index+1);

    const dragHandle=document.createElement("div");
    dragHandle.className="gallery-drag-handle";
    dragHandle.textContent="↕ Geser";
    dragHandle.title="Drag untuk mengubah posisi";

    const img=document.createElement("img");
    img.src=url;
    img.alt=`Preview galeri ${index+1}`;

    const actions=document.createElement("div");
    actions.className="gallery-admin-actions";

    const upBtn=document.createElement("button");
    upBtn.type="button";
    upBtn.className="secondary-btn gallery-move-btn";
    upBtn.textContent="↑ Naik";
    upBtn.disabled=index===0;
    upBtn.addEventListener("click",()=>moveGalleryItem(index,index-1));

    const downBtn=document.createElement("button");
    downBtn.type="button";
    downBtn.className="secondary-btn gallery-move-btn";
    downBtn.textContent="↓ Turun";
    downBtn.disabled=index===galleryUrls.length-1;
    downBtn.addEventListener("click",()=>moveGalleryItem(index,index+1));

    const replaceBtn=document.createElement("button");
    replaceBtn.type="button";
    replaceBtn.className="secondary-btn gallery-replace-btn";
    replaceBtn.textContent="Ganti";
    replaceBtn.addEventListener("click",()=>replaceGalleryPhoto(index));

    const deleteBtn=document.createElement("button");
    deleteBtn.type="button";
    deleteBtn.className="secondary-btn gallery-delete-btn";
    deleteBtn.textContent="Hapus";
    deleteBtn.addEventListener("click",()=>{
      galleryUrls.splice(index,1);
      renderGalleryPreview();
      $("galleryInfo").textContent=
        `${galleryUrls.length} dari 6 foto. Klik Simpan Undangan untuk menyimpan perubahan.`;
    });

    item.addEventListener("dragstart",e=>{
      dragIndex=index;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed="move";
      e.dataTransfer.setData("text/plain",String(index));
    });

    item.addEventListener("dragend",()=>{
      dragIndex=null;
      item.classList.remove("dragging");
      document.querySelectorAll(".gallery-admin-item").forEach(el=>el.classList.remove("drag-over"));
    });

    item.addEventListener("dragover",e=>{
      e.preventDefault();
      e.dataTransfer.dropEffect="move";
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave",()=>{
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop",e=>{
      e.preventDefault();
      item.classList.remove("drag-over");

      const from=dragIndex!==null?dragIndex:Number(e.dataTransfer.getData("text/plain"));
      const to=index;

      if(Number.isInteger(from)&&from!==to){
        moveGalleryItem(from,to);
      }
    });

    actions.append(upBtn,downBtn,replaceBtn,deleteBtn);
    item.append(position,dragHandle,img,actions);
    wrap.appendChild(item);
  });

  if(!galleryUrls.length){
    $("galleryInfo").textContent="Belum ada foto galeri.";
  }
}

async function replaceGalleryPhoto(index){
  const slug=sanitizeSlug($("slug").value);

  if(!slug){
    $("galleryInfo").textContent="Isi slug acara terlebih dahulu.";
    return;
  }

  const picker=document.createElement("input");
  picker.type="file";
  picker.accept="image/*";

  picker.addEventListener("change",async()=>{
    const file=picker.files?.[0];
    if(!file) return;

    $("galleryInfo").textContent=`Mengganti foto ${index+1}...`;

    try{
      const out=await compressImage(file,1400,.76);
      const url=await uploadBlob(out.blob,slug,"gallery",index);

      galleryUrls[index]=`${url.split("?")[0]}?v=${Date.now()}`;
      renderGalleryPreview();

      $("galleryInfo").textContent=
        `Foto ${index+1} berhasil diganti. Klik Simpan Undangan.`;
    }catch(err){
      $("galleryInfo").textContent=err.message;
    }
  },{once:true});

  picker.click();
}

$("coverInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  const slug=sanitizeSlug($("slug").value);

  if(!file) return;

  if(!slug){
    $("coverInfo").textContent="Isi Slug / URL acara terlebih dahulu.";
    e.target.value="";
    return;
  }

  $("coverInfo").textContent="Mengompres dan mengupload...";

  try{
    const out=await compressImage(file);
    coverUrl=await uploadBlob(out.blob,slug,"cover");
    coverUrl=`${coverUrl.split("?")[0]}?v=${Date.now()}`;

    $("coverPreview").src=coverUrl;
    $("coverPreview").style.display="block";

    $("coverInfo").textContent=
      `${(file.size/1024/1024).toFixed(2)} MB → ${(out.blob.size/1024).toFixed(0)} KB • WebP`;
  }catch(err){
    $("coverInfo").textContent=err.message;
  }
});

$("galleryInput").addEventListener("change",async e=>{
  const selected=[...(e.target.files||[])];
  const slug=sanitizeSlug($("slug").value);

  if(!selected.length) return;

  if(!slug){
    $("galleryInfo").textContent="Isi Slug / URL acara terlebih dahulu.";
    e.target.value="";
    return;
  }

  const remaining=Math.max(0,6-galleryUrls.length);

  if(!remaining){
    $("galleryInfo").textContent="Galeri sudah penuh: maksimal 6 foto.";
    e.target.value="";
    return;
  }

  const files=selected.slice(0,remaining);
  $("galleryInfo").textContent="Mengompres dan menambahkan foto...";

  try{
    const startIndex=galleryUrls.length;

    for(let i=0;i<files.length;i++){
      const out=await compressImage(files[i],1400,.76);
      const url=await uploadBlob(out.blob,slug,"gallery",startIndex+i);
      galleryUrls.push(`${url.split("?")[0]}?v=${Date.now()}-${i}`);
    }

    renderGalleryPreview();
    $("galleryInfo").textContent=
      `${galleryUrls.length} dari 6 foto. Klik Simpan Undangan.`;

    e.target.value="";
  }catch(err){
    $("galleryInfo").textContent=err.message;
  }
});

function collectEvent(){
  const type=$("eventType").value;

  return {
    slug:sanitizeSlug($("slug").value),
    event_type:type,
    event_type_label:(typeDefaults[type]||typeDefaults.custom)[1],
    event_label:$("eventLabel").value.trim(),
    event_title:$("eventTitle").value.trim(),
    main_name:$("mainName").value.trim(),
    subtitle:$("subtitle").value.trim(),
    event_date:$("eventDate").value,
    event_time:$("eventTime").value,
    location:$("eventLocation").value.trim(),
    maps_url:$("mapsUrl").value.trim(),
    description:$("description").value.trim(),
    cover_url:coverUrl,
    gallery_urls:galleryUrls.slice(0,6)
  };
}

$("eventForm").addEventListener("submit",async e=>{
  e.preventDefault();

  const status=$("saveStatus");
  const event=collectEvent();

  if(!event.slug||!event.event_title){
    status.textContent="Slug dan Judul Besar wajib diisi.";
    return;
  }

  if(event.maps_url&&!/^https?:\/\//i.test(event.maps_url)){
    status.textContent="Link Google Maps harus diawali http:// atau https://";
    return;
  }

  status.textContent="Menyimpan...";

  try{
    const r=await fetch("/api/events",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(event)
    });

    const data=await r.json();

    if(!r.ok) throw new Error(data.error||"Gagal menyimpan");

    status.textContent=
      `Tersimpan. Link: ${location.origin}/?event=${encodeURIComponent(event.slug)}&to=Tamu`;
  }catch(err){
    status.textContent=err.message;
  }
});

$("loadEvent").addEventListener("click",async()=>{
  const slug=sanitizeSlug($("slug").value);

  if(!slug){
    $("saveStatus").textContent="Isi slug terlebih dahulu.";
    return;
  }

  $("saveStatus").textContent="Memuat...";

  try{
    const r=await fetch(`/api/events?slug=${encodeURIComponent(slug)}`);
    const data=await r.json();

    if(!r.ok) throw new Error(data.error||"Tidak ditemukan");

    const e=data.event;

    $("eventType").value=e.event_type||"custom";
    $("eventLabel").value=e.event_label||"";
    $("eventTitle").value=e.event_title||"";
    $("mainName").value=e.main_name||"";
    $("subtitle").value=e.subtitle||"";
    $("eventDate").value=e.event_date||"";
    $("eventTime").value=e.event_time||"";
    $("eventLocation").value=e.location||"";
    $("mapsUrl").value=e.maps_url||"";
    $("description").value=e.description||"";

    coverUrl=e.cover_url||"";
    galleryUrls=Array.isArray(e.gallery_urls)?e.gallery_urls.slice(0,6):[];

    if(coverUrl){
      $("coverPreview").src=coverUrl;
      $("coverPreview").style.display="block";
      $("coverInfo").textContent="Foto cover tersimpan.";
    }else{
      $("coverPreview").removeAttribute("src");
      $("coverPreview").style.display="none";
      $("coverInfo").textContent="Belum ada foto cover.";
    }

    renderGalleryPreview();

    $("galleryInfo").textContent=
      galleryUrls.length
        ? `${galleryUrls.length} dari 6 foto galeri tersimpan.`
        : "Belum ada foto galeri.";

    $("saveStatus").textContent="Data berhasil dimuat.";
  }catch(err){
    $("saveStatus").textContent=err.message;
  }
});

$("generateLinks").addEventListener("click",()=>{
  const slug=sanitizeSlug($("slug").value);
  const names=$("guestList").value
    .split("\n")
    .map(v=>v.trim())
    .filter(Boolean)
    .slice(0,200);

  const wrap=$("guestLinks");
  wrap.replaceChildren();

  if(!slug){
    wrap.textContent="Isi slug acara terlebih dahulu.";
    return;
  }

  for(const name of names){
    const url=
      `${location.origin}/?event=${encodeURIComponent(slug)}&to=${encodeURIComponent(name)}`;

    const row=document.createElement("div");
    row.className="guest-link-row";

    const a=document.createElement("a");
    a.href=url;
    a.target="_blank";
    a.textContent=name;

    const input=document.createElement("input");
    input.value=url;
    input.readOnly=true;

    row.append(a,input);
    wrap.appendChild(row);
  }
});

$("loadComments").addEventListener("click",async()=>{
  const slug=sanitizeSlug($("slug").value);
  const wrap=$("adminComments");

  if(!slug){
    wrap.textContent="Isi slug acara terlebih dahulu.";
    return;
  }

  wrap.textContent="Memuat...";

  try{
    const r=await fetch(`/api/comments?wedding_id=${encodeURIComponent(slug)}`);
    const data=await r.json();

    wrap.replaceChildren();

    for(const c of data.comments||[]){
      const d=document.createElement("div");
      d.className="comment";

      const s=document.createElement("strong");
      s.textContent=c.guest_name;

      const m=document.createElement("div");
      m.textContent=c.message;

      d.append(s,m);
      wrap.appendChild(d);
    }

    if(!(data.comments||[]).length){
      wrap.textContent="Belum ada komentar.";
    }
  }catch{
    wrap.textContent="Gagal memuat komentar.";
  }
});
