const s = '<https://shop.myshopify.com/admin/api/2024-04/products.json?page_info=abc>; rel="previous", <https://shop.myshopify.com/admin/api/2024-04/products.json?page_info=xyz>; rel="next"';
const match = s.match(/<([^>]+)>;\s*rel="next"/);
console.log(match);
