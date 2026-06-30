const fs = require('fs');

const serverFile = '/var/www/raaghas_new/current/apps/admin/.next/server/app/logistics/fulfillment/page.js';
const clientChunk = '/var/www/raaghas_new/current/apps/admin/.next/static/chunks/app/logistics/fulfillment/page-3fb12236604f6767.js';

function patchFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error("File not found: " + filePath);
        return;
    }

    let code = fs.readFileSync(filePath, 'utf8');

    // We will extract the exact template literal from the vps-chunk.js
    // We already have it in vps-html.txt, but it's safer to use regex to find and replace it.
    
    // The start is: <title>Packing Slips</title>
    // The end is: window.print(); window.close(); }, 500); }
    // We can replace everything inside <html> ... </html>
    
    const htmlRegex = /<html>[\s\S]*?<\/html>/g;
    
    const newHtml = `<html>
        <head>
          <title>Packing Slips</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 0; }
            .slip { page-break-after: always; padding: 40px; margin: 0 auto; max-width: 800px; box-sizing: border-box; }
            @media print { .slip { border: none; margin: 0; padding: 40px; } }
          </style>
        </head>
        <body>
          \${r.map((e,t)=>{
             const a = e.shippingAddr || (typeof e.shippingAddress === 'string' ? JSON.parse(e.shippingAddress || '{}') : (e.shippingAddress || {}));
             return \`
            <div class="slip">
              <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">SHIP TO</h3>
                  <div style="font-size: 14px; line-height: 1.5; color: #000;">
                    <div>\${e.customerName}</div>
                    <div>\${a.line1 || a.address || a.address1 || ''}</div>
                    \${a.line2 || a.address2 ? \`<div>\${a.line2 || a.address2}</div>\` : ''}
                    <div>\${a.city || ''} \${a.state || a.province || ''}</div>
                    <div>\${a.postalCode || a.pincode || a.zip || ''}</div>
                    <div>\${a.country || 'India'}</div>
                    <div style="margin-top: 5px;">\${a.phone || a.phoneNumber || e.customerPhone || ''}</div>
                  </div>
                </div>
                <div style="flex: 1; text-align: right;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: normal; color: #333; letter-spacing: 1px;">RAAGHAS CLOTHING</h1>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px;">
                <div style="flex: 1; border-top: 1px solid #000; padding-top: 15px; margin-right: 40px;">
                  <div style="font-size: 14px; line-height: 1.5; text-align: left; color: #000;">
                    <div>Thank you for shopping with us!</div>
                    <div>Raaghas Clothing</div>
                    <div>Salem:636001,Phno 6360664805</div>
                    <div>www.raaghasclothing.com</div>
                  </div>
                </div>
                <div style="text-align: right; font-size: 14px; line-height: 1.5; color: #000;">
                  <div>Order \${e.formattedOrderNumber || e.orderNumber || e.id.slice(-4)}</div>
                  <div>\${new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          \`}).join('')}
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>`;

    if (!code.includes("<title>Packing Slips</title>")) {
        console.log("Could not find packing slip HTML in " + filePath);
        return;
    }

    code = code.replace(htmlRegex, newHtml);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Successfully patched " + filePath);
}

patchFile(serverFile);
patchFile(clientChunk);
