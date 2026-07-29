# TikTok Rating Exporter / Ekspor Rating TikTok

Ekstensi Chrome terpisah untuk mengekspor **TikTok Shop Seller Center → Rating Produk** ke satu file XLSX. Ekstensi mendukung halaman TikTok Shop yang dikelola oleh Tokopedia di `seller-id.tokopedia.com`. Muat folder ini sebagai ekstensi terpisah dari Shopee: `tiktok-rating-exporter`.

A separate Chrome Extension that exports **TikTok Shop Seller Center → Product Rating** to one XLSX file. It supports TikTok Shop pages managed by Tokopedia at `seller-id.tokopedia.com`. Load this folder separately from Shopee: `tiktok-rating-exporter`.

## Kolom ekspor / Exported columns

`product_name`, `product_variation`, `buyer_id`, `star`, `review_date`, `order_id`, `review_message`, `seller_response`

`product_variation` menggunakan nilai SKU TikTok. Nilai yang tidak tersedia akan kosong. Ekstensi mendukung label antarmuka Indonesia dan Inggris, termasuk `ID Pesanan:` dan `Order ID:`. `review_date` hanya berisi tanggal ulasan; informasi tambahan seperti `Diubah 5 hari yang lalu` atau `Edited 5 days ago` tidak diekspor. `order_id` selalu ditulis sebagai **teks** dalam XLSX—bukan angka—sehingga ID Pesanan TikTok 18 digit tetap utuh dan Excel tidak mengganti empat digit terakhir dengan nol.

`product_variation` uses the TikTok SKU value. Unavailable values stay blank. The extension supports Indonesian and English interface labels, including `ID Pesanan:` and `Order ID:`. `review_date` contains only the review date; extra text such as `Diubah 5 hari yang lalu` or `Edited 5 days ago` is not exported. `order_id` is always written as **text** in XLSX—not a number—so 18-digit TikTok Order IDs remain intact and Excel cannot replace trailing digits with zeroes.

## Instalasi dan penggunaan / Install and use

1. Buka / Open `chrome://extensions`.
2. Aktifkan / Enable **Developer mode**.
3. Klik / Click **Load unpacked**.
4. Pilih folder / Select `/Users/yuandikaalfahreiza/Documents/Shopee Product Extractor/tiktok-rating-exporter`.
5. Login seperti biasa, buka TikTok Shop Seller Center → **Rating Produk**, dan atur filter yang diinginkan.
6. Buka ekstensi dan klik **Ekspor semua halaman / Export all pages**.

Ekstensi membaca semua halaman yang sesuai dengan filter saat ini, tanpa mengubah filter, membalas ulasan, atau mengirim data ke server.

The extension reads every page matching the current filters without altering filters, replying to reviews, or sending data to a server.
