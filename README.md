# Shopee Shop Rating Exporter

A Chrome Extension (Manifest V3) that exports the reviews visible in **Shopee Seller Centre → Shop Rating** to one `.xlsx` file. It does not log in, submit credentials, or make private API calls. It uses the page already open in the user's authorised Chrome session.

## Exported columns

`product_name`, `product_variation`, `buyer_id`, `star`, `review_date`, `order_id`, `review_message`, `seller_response`

An unavailable variation, review message, or seller response is exported as a blank cell. The extractor recognizes both `Variation:` and Indonesian `Variasi:` labels. If Shopee only exposes an abbreviated review ending in `...Lainnya` / `…Lainnya`, it exports a blank review message rather than incomplete text. Order IDs are stored as text so Excel cannot convert them to scientific notation.

## Install locally in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this project folder: `Shopee Product Extractor`.
5. Pin **Shopee Shop Rating Exporter** to the Chrome toolbar.

## Use

1. Log into Shopee Seller Centre normally and open the Shop Rating page.
2. Manually choose the desired date range, rating filters, and status filters, then click Shopee's **Apply** button.
3. Wait for the filtered results to load.
4. Open the extension and choose **Export all pages**.
5. Keep the tab open until the popup reports completion. Chrome downloads `shopee_shop_rating_YYYY-MM-DD_HHMMSS.xlsx`.

The extension retains the filters selected by the user. It may click a review's **More** or **Lainnya** control to capture a longer review, then clicks only the Shop Rating pagination next button. It does not reply to reviews, alter filters, or send data to a server.

## MVP limits

- The Shopee Seller Centre page must remain open during collection.
- A Shopee page-layout change may require updating the page selectors.
- The extension expands visible review **More** controls before reading a page. The final logged-in test should confirm the specific Shopee UI behaviour for long messages.
