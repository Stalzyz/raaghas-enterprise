const Papa = require('papaparse');
const fs = require('fs');

let csvString = fs.readFileSync('/Users/stalinkumar/Desktop/RS 0307-26.csv', 'utf-8');
if (csvString.charCodeAt(0) === 0xFEFF) {
  csvString = csvString.slice(1);
}
const parsed = Papa.parse(csvString, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
});
let rows = parsed.data;
rows = rows.map(row => {
  const title = row.Title || row.Name || '';
  let handle = row.Handle || '';
  if (!handle && title) {
    handle = title.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  return { ...row, Title: title, Handle: handle };
});
const productGroups = new Map();
let lastKey = null;
for (const row of rows) {
  let key = row.Product_ID || row.Handle;
  if (!key) {
    if (lastKey) key = lastKey;
    else if (row.Name || row.Title) { key = row.Name || row.Title; lastKey = key; }
  } else {
    lastKey = key;
  }
  if (!key) continue;
  if (!productGroups.has(key)) productGroups.set(key, []);
  productGroups.get(key).push(row);
}
for (const [key, productRows] of productGroups.entries()) {
  const firstRow = productRows[0];
  const images = [];
  if (firstRow.Main_Image) images.push({ url: firstRow.Main_Image, position: 0 });
  if (firstRow.Image_2) images.push({ url: firstRow.Image_2, position: 1 });
  if (firstRow.Image_3) images.push({ url: firstRow.Image_3, position: 2 });
  console.log('firstRow.Main_Image:', firstRow.Main_Image);
  console.log('images:', images);
}
