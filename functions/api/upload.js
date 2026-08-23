const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

const MUSIC_TYPES = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac"
};

export async function onRequestPost(context) {
  if (!context.env.MEDIA) {
    return json({ error: "R2 binding MEDIA belum terhubung" }, 500);
  }

  const url = new URL(context.request.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const kind = (url.searchParams.get("kind") || "").trim();
  const index = Number(url.searchParams.get("index") || 0);

  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    return json({ error: "Slug tidak valid" }, 400);
  }

  if (!["cover", "gallery", "music"].includes(kind)) {
    return json({ error: "Jenis upload tidak valid" }, 400);
  }

  const contentType = (context.request.headers.get("Content-Type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const body = await context.request.arrayBuffer();

  if (!body.byteLength) {
    return json({ error: "File kosong" }, 400);
  }

  let key;
  let maxBytes;

  if (kind === "music") {
    const extension = MUSIC_TYPES[contentType];

    if (!extension) {
      return json({
        error: "Format musik tidak didukung. Gunakan MP3, M4A, atau AAC."
      }, 415);
    }

    // Maksimal 12 MB per file musik.
    maxBytes = 12 * 1024 * 1024;

    if (body.byteLength > maxBytes) {
      return json({
        error: "Ukuran musik terlalu besar. Maksimal 12 MB."
      }, 413);
    }

    key = `${slug}/music.${extension}`;

  } else {
    if (contentType !== "image/webp") {
      return json({ error: "Foto harus berformat WebP" }, 415);
    }

    // Hasil kompres foto seharusnya jauh di bawah batas ini.
    maxBytes = 5 * 1024 * 1024;

    if (body.byteLength > maxBytes) {
      return json({ error: "Ukuran foto terlalu besar" }, 413);
    }

    if (kind === "cover") {
      key = `${slug}/cover.webp`;
    } else {
      if (!Number.isInteger(index) || index < 0 || index > 20) {
        return json({ error: "Index galeri tidak valid" }, 400);
      }

      key = `${slug}/gallery-${index}.webp`;
    }
  }

  await context.env.MEDIA.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000"
    }
  });

  return json({
    ok: true,
    kind,
    url: `/media/${key}`,
    size: body.byteLength
  });
}
