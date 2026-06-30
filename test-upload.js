const fs = require('fs');

const csv = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / AdWords Grouping,Google Shopping / AdWords Labels,Google Shopping / Condition,Google Shopping / Custom Product,Google Shopping / Custom Label 0,Google Shopping / Custom Label 1,Google Shopping / Custom Label 2,Google Shopping / Custom Label 3,Google Shopping / Custom Label 4,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Status
shirt-1,Awesome Shirt,This is awesome,Raaghas,Clothing,shirt,TRUE,Size,M,SHIRT-M,200,shopify,10,deny,manual,500,1000,TRUE,TRUE,,https://example.com/img1.jpg,1,,FALSE,,,,,,,,,,,,,,,,,,,ACTIVE
shirt-1,,,,,,,,,L,SHIRT-L,200,shopify,15,deny,manual,500,1000,TRUE,TRUE,,,,,,,,,,,,,,,,,,,,,,,
`;

fs.writeFileSync('dummy.csv', csv);

async function testUpload() {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', fs.createReadStream('dummy.csv'));

  const fetch = (await import('node-fetch')).default;
  try {
    const res = await fetch('http://localhost:6005/api/v1/products/bulk-upload', {
      method: 'POST',
      body: form,
      headers: {
         // The endpoint might require auth? Let's check products.controller.ts: @Post('bulk-upload') has no @RequirePermission in the snippet! Wait, let's look closer. It just has @Post('bulk-upload'). Let's hope it's unprotected or it fails gracefully.
      }
    });
    console.log(res.status);
    console.log(await res.json());
  } catch (e) {
    console.error(e);
  }
}

testUpload();
