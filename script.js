const params = new URLSearchParams(location.search);
const slug = (params.get("event") || "demo").trim().slice(0,80);
const guest = (params.get("to") || "Tamu Undangan").trim().slice(0,80);

document.getElementById("guestName").textContent = guest;
document.getElementById("commentName").value = guest;

document.getElementById("openInvitation").addEventListener("click",()=>{
  document.getElementById("content").classList.remove("hidden");
  document.getElementById("content").scrollIntoView({behavior:"smooth"});
});

function setText(id,value,fallback=""){document.getElementById(id).textContent=value||fallback}

function renderGallery(items){
  const card=document.getElementById("galleryCard");
  const wrap=document.getElementById("gallery");
  wrap.replaceChildren();
  const valid=Array.isArray(items)?items.filter(Boolean):[];
  if(!valid.length){card.classList.add("hidden");return}
  card.classList.remove("hidden");
  for(const url of valid){
    const img=document.createElement("img");
    img.src=url; img.alt="Foto galeri acara"; img.loading="lazy";
    wrap.appendChild(img);
  }
}

async function loadEvent(){
  try{
    const r=await fetch(`/api/events?slug=${encodeURIComponent(slug)}`);
    if(!r.ok) throw new Error();
    const {event}=await r.json();
    document.title=event.event_title||"Digital Invitation";
    setText("eventLabel",event.event_label,"You're Invited");
    setText("eventTitle",event.event_title,"Special Celebration");
    setText("eventTypeText",event.event_type_label,"Invitation");
    setText("mainName",event.main_name,event.event_title);
    setText("subtitle",event.subtitle);
    setText("eventDate",event.event_date||"-");
    setText("eventTime",event.event_time||"-");
    setText("eventLocation",event.location||"-");
    setText("description",event.description);
    const cover=document.getElementById("coverImage");
    if(event.cover_url){cover.src=event.cover_url;cover.style.display="block"}
    renderGallery(event.gallery_urls||[]);
  }catch{
    setText("mainName","Buat acara melalui /admin.html");
  }
}

function renderComments(items){
  const wrap=document.getElementById("comments");
  wrap.replaceChildren();
  document.getElementById("commentCount").textContent=`${items.length} ucapan`;
  if(!items.length){const p=document.createElement("p");p.className="muted";p.textContent="Belum ada ucapan.";wrap.appendChild(p);return}
  for(const item of items){
    const div=document.createElement("div");div.className="comment";
    const name=document.createElement("strong");name.textContent=item.guest_name;
    const msg=document.createElement("div");msg.textContent=item.message;
    const time=document.createElement("time");time.textContent=new Date(item.created_at+"Z").toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"});
    div.append(name,msg,time);wrap.appendChild(div);
  }
}

async function loadComments(){
  try{
    const r=await fetch(`/api/comments?wedding_id=${encodeURIComponent(slug)}`);
    const data=await r.json();
    if(!r.ok) throw new Error();
    renderComments(data.comments||[]);
  }catch{document.getElementById("comments").textContent="Komentar belum dapat dimuat."}
}

document.getElementById("commentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const status=document.getElementById("formStatus");
  const name=document.getElementById("commentName").value.trim();
  const message=document.getElementById("commentMessage").value.trim();
  if(!name||!message)return;
  status.textContent="Mengirim...";
  try{
    const r=await fetch("/api/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wedding_id:slug,guest_name:name,message})});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Gagal mengirim");
    document.getElementById("commentMessage").value="";
    status.textContent="Ucapan berhasil dikirim.";
    await loadComments();
  }catch(err){status.textContent=err.message}
});

loadEvent();loadComments();
