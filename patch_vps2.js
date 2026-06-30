const fs = require('fs');
const filePath = '/var/www/raaghas_new/current/apps/api/dist/src/payments/payments.service.js';
let code = fs.readFileSync(filePath, 'utf8');

const target = \`                    checksum: \\\`\${sha256hash}###\${saltIndex}\\\`,
                };
            }\`;

const replacement = \`                    checksum: \\\`\${sha256hash}###\${saltIndex}\\\`,
                };
            } else if (data.gateway === 'CASH_ON_DELIVERY') {
                providerOrderId = 'COD_' + result.order.id + '_' + Date.now();
                paymentPayload = { cod: true };
            }\`;

if (code.includes("else if (data.gateway === 'CASH_ON_DELIVERY')")) {
    console.log("Already patched.");
} else {
    code = code.replace(target, replacement);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Patched successfully.");
}
