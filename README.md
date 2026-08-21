# Wedding Invitation MVP

Fitur awal:
- Nama tamu dari `?to=Nama`
- Komentar/ucapan tamu tersimpan di Cloudflare D1
- Upload foto lokal
- Resize maksimal 1600px
- Kompres otomatis ke WebP
- Template undangan sederhana

## 1. Install Node.js
Gunakan Node.js versi LTS.

## 2. Login Cloudflare

```bash
npx wrangler login
```

## 3. Buat database D1

```bash
npx wrangler d1 create wedding-comments
```

Salin `database_id` dari hasil perintah tersebut.

## 4. Buat konfigurasi Wrangler

Salin:

`wrangler.toml.example` → `wrangler.toml`

Kemudian ganti:

`PASTE-YOUR-D1-DATABASE-ID-HERE`

dengan ID database D1 Anda.

## 5. Buat tabel komentar

```bash
npx wrangler d1 execute wedding-comments --remote --file=schema.sql
```

## 6. Jalankan secara lokal

```bash
npx wrangler pages dev . --d1 DB=DATABASE_ID_ANDA
```

Buka URL lokal yang muncul.

Contoh nama tamu:

`http://localhost:8788/?to=Vio`

## 7. Deploy

Cara paling stabil untuk Pages Functions adalah menghubungkan project ke GitHub/GitLab atau deploy dengan Wrangler.

```bash
npx wrangler pages project create
npx wrangler pages deploy .
```

Setelah project dibuat, pastikan D1 binding bernama `DB` terhubung ke database `wedding-comments`.

Di Cloudflare Dashboard:
Workers & Pages → project → Settings → Bindings → Add → D1 database

Variable name:
`DB`

Database:
`wedding-comments`

Kemudian redeploy.

## Catatan foto

Demo kompres foto saat ini memproses foto di browser dan menampilkan hasil kompres.
Tahap berikutnya adalah menyimpan hasil foto ke storage (R2) dan menghubungkannya ke builder/admin.
