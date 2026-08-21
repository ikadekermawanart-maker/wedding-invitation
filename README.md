# Invitation Builder V1

## Fitur
- Wedding, Sweet Seventeen, Birthday, Engagement, Anniversary, Baby Shower, Graduation, Custom Event
- Data acara tersimpan di D1
- Nama tamu dari URL `?event=slug&to=Nama`
- Komentar per acara
- Admin builder di `/admin.html`
- Upload foto cover dan galeri
- Foto otomatis resize + kompres WebP di browser
- Foto disimpan di Cloudflare R2
- Generator link tamu

## Binding
D1:
- Variable name: `DB`
- Database: `wedding-comments`

R2:
- Variable name: `MEDIA`
- Bucket: misalnya `invitation-media`

## Database
Jalankan `schema.sql` di D1 Console.

## URL
Admin:
`https://DOMAIN.pages.dev/admin.html`

Undangan:
`https://DOMAIN.pages.dev/?event=vio-sweet17&to=Kadek`

## Catatan keamanan
V1 belum memiliki login admin. Jangan gunakan sebagai produk publik final sebelum autentikasi admin ditambahkan.
