const WEDDING_ID = "demo-wedding";

const params = new URLSearchParams(location.search);
const guest = (params.get("to") || "Tamu Undangan").trim().slice(0, 80);
document.getElementById("guestName").textContent = guest;
document.getElementById("commentName").value = guest;

document.getElementById("openInvitation").addEventListener("click", () => {
  document.getElementById("content").classList.remove("hidden");
  document.getElementById("content").scrollIntoView({behavior:"smooth"});
});

function escapeText(value) {
  return String(value ?? "");
}

function renderComments(items) {
  const wrap = document.getElementById("comments");
  wrap.replaceChildren();
  document.getElementById("commentCount").textContent = `${items.length} ucapan`;

  if (!items.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Belum ada ucapan. Jadilah yang pertama.";
    wrap.appendChild(p);
    return;
  }

  for (const item of items) {
    const div = document.createElement("div");
    div.className = "comment";

    const name = document.createElement("strong");
    name.textContent = escapeText(item.guest_name);

    const msg = document.createElement("div");
    msg.textContent = escapeText(item.message);

    const time = document.createElement("time");
    time.textContent = new Date(item.created_at).toLocaleString("id-ID", {
      dateStyle: "medium", timeStyle: "short"
    });

    div.append(name, msg, time);
    wrap.appendChild(div);
  }
}

async function loadComments() {
  try {
    const r = await fetch(`/api/comments?wedding_id=${encodeURIComponent(WEDDING_ID)}`);
    if (!r.ok) throw new Error("Gagal memuat komentar");
    const data = await r.json();
    renderComments(data.comments || []);
  } catch (e) {
    document.getElementById("comments").textContent =
      "Komentar akan aktif setelah database Cloudflare D1 dihubungkan.";
  }
}

document.getElementById("commentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("formStatus");
  const name = document.getElementById("commentName").value.trim();
  const message = document.getElementById("commentMessage").value.trim();

  if (!name || !message) return;

  status.textContent = "Mengirim...";
  try {
    const r = await fetch("/api/comments", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ wedding_id: WEDDING_ID, guest_name: name, message })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Gagal mengirim");
    document.getElementById("commentMessage").value = "";
    status.textContent = "Ucapan berhasil dikirim.";
    await loadComments();
  } catch (err) {
    status.textContent = err.message;
  }
});

async function compressImage(file, maxDimension = 1600, quality = 0.78) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Gagal mengompres foto")), "image/webp", quality);
  });
  return { blob, width, height };
}

document.getElementById("photoInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const info = document.getElementById("compressInfo");
  info.textContent = "Mengompres...";

  try {
    const result = await compressImage(file);
    const img = document.getElementById("previewImage");
    const url = URL.createObjectURL(result.blob);
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    img.dataset.url = url;
    img.src = url;
    img.style.display = "block";

    const before = (file.size / 1024 / 1024).toFixed(2);
    const after = (result.blob.size / 1024).toFixed(0);
    info.textContent = `Sebelum: ${before} MB → Sesudah: ${after} KB • ${result.width}×${result.height} • WebP`;
  } catch (err) {
    info.textContent = err.message;
  }
});

loadComments();
