const fs = require('fs');
const Papa = require('papaparse');
const file = fs.readFileSync('/Users/stalinkumar/Downloads/varnika salwar set.csv', 'utf-8');
const parsed = Papa.parse(file, { header: true, skipEmptyLines: true, dynamicTyping: true });
console.log(parsed.data.slice(0, 4).map(r => ({ Handle: r.Handle, Size: r.Size, Stock_Qty: r.Stock_Qty, ' ': r[' '] })));
