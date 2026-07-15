const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas',
});
async function main() {
  await client.connect();
  
  // Get any product with images
  const res = await client.query(`
    SELECT p.id, p.handle, p.title, i.url as image_url
    FROM "Product" p
    LEFT JOIN "Image" i ON i."productId" = p.id
    LIMIT 10
  `);
  console.log('Products with images (local DB):');
  res.rows.forEach(r => console.log(r));
  
  // Check how images are stored in DB
  const imgSample = await client.query(`SELECT url FROM "Image" LIMIT 5`);
  console.log('\nSample image URLs in DB:', imgSample.rows.map(r => r.url));
  
  await client.end();
}
main().catch(console.error);
