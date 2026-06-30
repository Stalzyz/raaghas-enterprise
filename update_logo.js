const fs = require('fs');
const path = require('path');

const targetFile = path.join('/Users/stalinkumar/Documents/Raaghas_website/apps/api/src/mail/mail.service.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const OLD_URL = 'https://via.placeholder.com/200x60/FDFBF7/611c34?text=RAAGHAS';
const NEW_URL = 'https://api.raaghas.in/uploads/60895f35665a91432ef41081032ef0109bc.webp';

// Replace all occurrences
content = content.split(OLD_URL).join(NEW_URL);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Logo URL updated successfully!');
