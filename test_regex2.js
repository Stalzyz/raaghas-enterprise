const s = '<https://shop.myshopify.com/admin/api/2024-04/products.json?page_info=next>; rel="next", <https://shop.myshopify.com/admin/api/2024-04/products.json?page_info=prev>; rel="previous"';
const match = s.match(/<([^>]+)>;\s*rel="next"/);
console.log(match ? match[1] : null);
