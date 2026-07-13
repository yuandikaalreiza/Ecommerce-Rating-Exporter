# Shopee Shop Rating Exporter / Ekspor Penilaian Toko Shopee

Ekstensi Chrome (Manifest V3) untuk mengekspor ulasan yang tampil di **Shopee Seller Centre → Penilaian Toko** menjadi satu file `.xlsx`. Ekstensi ini tidak melakukan login, meminta kredensial, atau memanggil API privat. Ekstensi memakai halaman yang sudah dibuka dalam sesi Chrome pengguna yang berwenang.

A Chrome Extension (Manifest V3) that exports the reviews visible in **Shopee Seller Centre → Shop Rating** to one `.xlsx` file. It does not log in, request credentials, or call private APIs. It uses the page already open in the authorised user's Chrome session.

## Kolom ekspor / Exported columns

`product_name`, `product_variation`, `buyer_id`, `star`, `review_date`, `order_id`, `review_message`, `seller_response`

Nama kolom XLSX sengaja tetap dalam bahasa Inggris agar format laporan stabil untuk semua pengguna. Variasi, pesan ulasan, atau tanggapan penjual yang tidak tersedia akan diekspor sebagai sel kosong. Ekstensi mengenali label `Variation:` dan `Variasi:`. Jika Shopee hanya menampilkan ulasan singkat yang berakhir dengan `...Lainnya` atau `…Lainnya`, ekstensi mengekspor pesan ulasan sebagai kosong agar teks tidak lengkap tidak dianggap sebagai ulasan penuh. Order ID disimpan sebagai teks agar Excel tidak mengubahnya menjadi notasi ilmiah.

The XLSX column names intentionally remain in English so the report format is stable for every user. An unavailable variation, review message, or seller response is exported as a blank cell. The extractor recognizes both `Variation:` and Indonesian `Variasi:` labels. If Shopee only exposes an abbreviated review ending in `...Lainnya` / `…Lainnya`, it exports a blank review message rather than incomplete text. Order IDs are stored as text so Excel cannot convert them to scientific notation.

## Instalasi di Chrome / Install locally in Chrome

1. Buka / Open `chrome://extensions`.
2. Aktifkan / Enable **Developer mode**.
3. Pilih / Choose **Load unpacked**.
4. Pilih folder proyek ini / Select this project folder: `Shopee Product Extractor`.
5. Sematkan / Pin **Shopee Shop Rating Exporter** ke toolbar Chrome.

## Cara pakai / Use

1. Login ke Shopee Seller Centre seperti biasa, lalu buka halaman Penilaian Toko / Shop Rating.
2. Pilih rentang tanggal, filter bintang, dan filter status yang diinginkan, lalu klik tombol Shopee **Terapkan / Apply**.
3. Tunggu hasil filter dimuat.
4. Buka ekstensi, lalu pilih **Ekspor semua halaman / Export all pages**.
5. Biarkan tab terbuka hingga popup menampilkan ekspor selesai. Chrome akan mengunduh `shopee_shop_rating_YYYY-MM-DD_HHMMSS.xlsx`.

Ekstensi mempertahankan filter yang dipilih pengguna. Ekstensi dapat mengeklik kontrol ulasan **More** atau **Lainnya** untuk mendapatkan pesan lebih lengkap, kemudian hanya mengeklik tombol halaman berikutnya pada Penilaian Toko. Ekstensi tidak membalas ulasan, mengubah filter, atau mengirim data ke server.

The extension retains the filters selected by the user. It may click a review's **More** or **Lainnya** control to capture a longer review, then clicks only the Shop Rating pagination next button. It does not reply to reviews, alter filters, or send data to a server.

## Batasan MVP / MVP limits

- Halaman Shopee Seller Centre harus tetap terbuka selama pengambilan data.
- Jika tampilan Shopee berubah, selector halaman mungkin perlu diperbarui.
- Ekstensi memperluas kontrol **More** dan **Lainnya** yang terlihat sebelum membaca halaman. Uji langsung dalam sesi login diperlukan untuk mengonfirmasi perilaku Shopee terhadap ulasan panjang.

- The Shopee Seller Centre page must remain open during collection.
- A Shopee page-layout change may require updating the page selectors.
- The extension expands visible **More** and **Lainnya** controls before reading a page. A live logged-in test is required to confirm Shopee's behaviour for long reviews.
