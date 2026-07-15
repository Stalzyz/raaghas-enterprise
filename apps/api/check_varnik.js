const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas',
});
async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT i.position, i."altText", i.url 
    FROM "Image" i 
    JOIN "Product" p ON p.id = i."productId" 
    WHERE p.handle = 'varnik-26602' 
    ORDER BY i.position ASC
  `);
  console.log('DB after fix:');
  res.rows.forEach(r => console.log(`  position=${r.position} altText=${r.altText} url=${r.url}`));
  await client.end();
}
main().catch(console.error);
