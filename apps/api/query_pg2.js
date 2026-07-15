const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://raaghas_user:Raaghas%40Prod2024@localhost:5432/raaghas',
});

async function main() {
  await client.connect();
  
  // Check product
  const prodRes = await client.query(`SELECT id, handle, title FROM "Product" WHERE handle='premium-wear37261' LIMIT 1`);
  if (prodRes.rows.length === 0) {
    console.log('Product NOT FOUND in local DB');
    await client.end();
    return;
  }
  const product = prodRes.rows[0];
  console.log('Product:', product);
  
  // Check images
  const imgRes = await client.query(`SELECT * FROM "Image" WHERE "productId" = $1`, [product.id]);
  console.log('Images:', imgRes.rows);
  
  // Check any image at all
  const anyImg = await client.query(`SELECT * FROM "Image" LIMIT 5`);
  console.log('Sample Images in DB:', anyImg.rows);
  
  await client.end();
}
main().catch(console.error);
