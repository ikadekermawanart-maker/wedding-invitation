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
let musicUrl="";
let maleDressColors=[];
let femaleDressColors=[];
let dragIndex=null;

const $=id=>document.getElementById(id);

const invitationTemplateUrls={
  sweet17:"https://sweet-seventeen-template.pages.dev"
};

function getInvitationBaseUrl(type){
  const configured=invitationTemplateUrls[type];
  return configured || location.origin;
}

function buildInvitationUrl(slug,guestName="Tamu"){
  const type=$("eventType").value;
  const base=getInvitationBaseUrl(type).replace(/\/+$/,"");
  return `${base}/?event=${encodeURIComponent(slug)}&to=${encodeURIComponent(guestName)}`;
}

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

function normalizeHex(value){
  const v=String(value||"").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null;
}

function renderDressColors(type){
  const list = type==="male" ? maleDressColors : femaleDressColors;
  const wrap = type==="male" ? $("maleColors") : $("femaleColors");

  wrap.replaceChildren();

  list.forEach((color,index)=>{
    const item=document.createElement("div");
    item.className="dresscode-color-item";

    const picker=document.createElement("input");
    picker.type="color";
    picker.value=color;
    picker.title="Pilih warna";

    const text=document.createElement("input");
    text.type="text";
    text.value=color.toUpperCase();
    text.maxLength=7;
    text.placeholder="#000000";
    text.className="dresscode-hex";

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="secondary-btn dresscode-remove";
    remove.textContent="×";
    remove.title="Hapus warna";

    const updateColor=(value)=>{
      const valid=normalizeHex(value);
      if(!valid)return;
      list[index]=valid;
      picker.value=valid;
      text.value=valid;
    };

    picker.addEventListener("input",()=>updateColor(picker.value));
    text.addEventListener("change",()=>updateColor(text.value));

    remove.addEventListener("click",()=>{
      list.splice(index,1);
      renderDressColors(type);
    });

    item.append(picker,text,remove);
    wrap.appendChild(item);
  });
}

function addDressColor(type,color="#000000"){
  const list=type==="male"?maleDressColors:femaleDressColors;

  if(list.length>=6){
    $("saveStatus").textContent="Maksimal 6 warna per kategori Dress Code.";
    return;
  }

  list.push(normalizeHex(color)||"#000000");
  renderDressColors(type);
}

$("addMaleColor").addEventListener("click",()=>addDressColor("male","#000000"));
$("addFemaleColor").addEventListener("click",()=>addDressColor("female","#000000"));

async function uploadMusicFile(file,slug){
  const allowedTypes=[
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac"
  ];

  if(!allowedTypes.includes(file.type)){
    throw new Error("Format musik tidak didukung. Gunakan MP3, M4A, atau AAC.");
  }

  if(file.size>12*1024*1024){
    throw new Error("Ukuran musik terlalu besar. Maksimal 12 MB.");
  }

  const r=await fetch(
    `/api/upload?slug=${encodeURIComponent(slug)}&kind=music`,
    {
      method:"POST",
      headers:{"Content-Type":file.type},
      body:file
    }
  );

  const data=await r.json();
  if(!r.ok) throw new Error(data.error||"Upload musik gagal");

  return data.url;
}

$("musicInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  const slug=sanitizeSlug($("slug").value);

  if(!file) return;

  if(!slug){
    $("musicInfo").textContent="Isi Slug / URL acara terlebih dahulu.";
    e.target.value="";
    return;
  }

  $("musicInfo").textContent="Mengupload musik...";

  try{
    const url=await uploadMusicFile(file,slug);
    musicUrl=`${url.split("?")[0]}?v=${Date.now()}`;

    $("musicPreview").src=musicUrl;
    $("musicPreview").style.display="block";
    $("removeMusic").style.display="inline-flex";

    $("musicInfo").textContent=
      `${file.name} • ${(file.size/1024/1024).toFixed(2)} MB • berhasil diupload`;

    e.target.value="";
  }catch(err){
    $("musicInfo").textContent=err.message;
  }
});

$("removeMusic").addEventListener("click",()=>{
  musicUrl="";
  $("musicPreview").pause();
  $("musicPreview").removeAttribute("src");
  $("musicPreview").load();
  $("musicPreview").style.display="none";
  $("removeMusic").style.display="none";
  $("musicInfo").textContent="Musik dihapus dari event. Klik Simpan Undangan.";
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
    music_url:musicUrl,
    dresscode_title:$("dresscodeTitle").value.trim(),
    dresscode_note:$("dresscodeNote").value.trim(),
    dresscode_male_colors:maleDressColors.slice(0,6),
    dresscode_female_colors:femaleDressColors.slice(0,6),
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

    const invitationUrl=buildInvitationUrl(event.slug,"Tamu");
    status.textContent=`Tersimpan. Link: ${invitationUrl}`;
  }catch(err){
    status.textContent=err.message;
  }
});


function getCurrentInvitationUrl(guestName="Tamu"){
  const slug=sanitizeSlug($("slug").value);

  if(!slug){
    $("saveStatus").textContent="Isi slug acara terlebih dahulu.";
    return null;
  }

  return buildInvitationUrl(slug,guestName);
}

$("previewInvitation").addEventListener("click",()=>{
  const url=getCurrentInvitationUrl("Tamu");

  if(!url)return;

  window.open(url,"_blank","noopener");
});

$("copyInvitationLink").addEventListener("click",async()=>{
  const url=getCurrentInvitationUrl("Tamu");

  if(!url)return;

  try{
    await navigator.clipboard.writeText(url);
    $("saveStatus").textContent="Link undangan berhasil dicopy.";
  }catch{
    const input=document.createElement("textarea");
    input.value=url;
    input.style.position="fixed";
    input.style.opacity="0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();

    $("saveStatus").textContent="Link undangan berhasil dicopy.";
  }
});

$("shareWhatsApp").addEventListener("click",()=>{
  const url=getCurrentInvitationUrl("Tamu");

  if(!url)return;

  const title=$("eventTitle").value.trim()||"Undangan";
  const message=`${title}\n\nSilakan buka undangan melalui link berikut:\n${url}`;

  const waUrl=`https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl,"_blank","noopener");
});


$("duplicateEvent").addEventListener("click",async()=>{
  const sourceSlug=sanitizeSlug($("slug").value);

  if(!sourceSlug){
    $("saveStatus").textContent="Muat event yang ingin diduplikat terlebih dahulu.";
    return;
  }

  const raw=prompt(
    `Duplikat event "${sourceSlug}".\n\nMasukkan slug baru:`,
    `${sourceSlug}-copy`
  );

  if(raw===null)return;

  const targetSlug=sanitizeSlug(raw);

  if(!targetSlug){
    alert("Slug baru tidak valid.");
    return;
  }

  if(targetSlug===sourceSlug){
    alert("Slug baru harus berbeda dari slug lama.");
    return;
  }

  const ok=confirm(
    `Duplikat event?\n\nDari:\n${sourceSlug}\n\nMenjadi:\n${targetSlug}\n\n`+
    `Data acara, foto, galeri, musik, Maps, dan Dress Code akan direferensikan ke event baru.\n`+
    `Komentar tamu TIDAK akan disalin.`
  );

  if(!ok)return;

  $("saveStatus").textContent="Menduplikat event...";

  try{
    const r=await fetch("/api/duplicate-event",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        source_slug:sourceSlug,
        target_slug:targetSlug
      })
    });

    const data=await r.json();

    if(!r.ok){
      throw new Error(data.error||"Gagal menduplikat event");
    }

    $("slug").value=targetSlug;
    $("saveStatus").textContent=
      `Event berhasil diduplikat menjadi "${targetSlug}". Memuat data baru...`;

    // Load the newly-created event into the form.
    $("loadEvent").click();

  }catch(err){
    $("saveStatus").textContent=err.message;
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

    if(!r.ok)throw new Error(data.error||"Tidak ditemukan");

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
    $("dresscodeTitle").value=e.dresscode_title||"";
    $("dresscodeNote").value=e.dresscode_note||"";

    maleDressColors=Array.isArray(e.dresscode_male_colors)
      ? e.dresscode_male_colors.filter(normalizeHex).slice(0,6)
      : [];

    femaleDressColors=Array.isArray(e.dresscode_female_colors)
      ? e.dresscode_female_colors.filter(normalizeHex).slice(0,6)
      : [];

    renderDressColors("male");
    renderDressColors("female");

    $("description").value=e.description||"";

    musicUrl=e.music_url||"";

    if(musicUrl){
      $("musicPreview").src=musicUrl;
      $("musicPreview").style.display="block";
      $("removeMusic").style.display="inline-flex";
      $("musicInfo").textContent="Musik tersimpan untuk event ini.";
    }else{
      $("musicPreview").pause();
      $("musicPreview").removeAttribute("src");
      $("musicPreview").load();
      $("musicPreview").style.display="none";
      $("removeMusic").style.display="none";
      $("musicInfo").textContent="Belum ada musik.";
    }

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
    const url=buildInvitationUrl(slug,name);

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

async function loadAdminComments(){
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

    if(!r.ok) throw new Error(data.error||"Gagal memuat komentar");

    wrap.replaceChildren();

    for(const c of data.comments||[]){
      const d=document.createElement("div");
      d.className="comment admin-comment-item";

      const content=document.createElement("div");
      content.className="admin-comment-content";

      const s=document.createElement("strong");
      s.textContent=c.guest_name;

      const m=document.createElement("div");
      m.textContent=c.message;

      const meta=document.createElement("small");
      meta.className="admin-comment-meta";
      meta.textContent=c.created_at||"";

      const deleteBtn=document.createElement("button");
      deleteBtn.type="button";
      deleteBtn.className="secondary-btn admin-comment-delete";
      deleteBtn.textContent="Hapus";

      deleteBtn.addEventListener("click",async()=>{
        const ok=confirm(`Hapus ucapan dari "${c.guest_name}"?\n\n${c.message}`);
        if(!ok)return;

        deleteBtn.disabled=true;
        deleteBtn.textContent="Menghapus...";

        try{
          const del=await fetch(
            `/api/comments?id=${encodeURIComponent(c.id)}&wedding_id=${encodeURIComponent(slug)}`,
            {method:"DELETE"}
          );

          const result=await del.json();

          if(!del.ok){
            throw new Error(result.error||"Gagal menghapus komentar");
          }

          await loadAdminComments();
        }catch(err){
          deleteBtn.disabled=false;
          deleteBtn.textContent="Hapus";
          alert(err.message);
        }
      });

      content.append(s,m,meta);
      d.append(content,deleteBtn);
      wrap.appendChild(d);
    }

    if(!(data.comments||[]).length){
      wrap.textContent="Belum ada komentar.";
    }
  }catch(err){
    wrap.textContent=err.message||"Gagal memuat komentar.";
  }
}

$("loadComments").addEventListener("click",loadAdminComments);