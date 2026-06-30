const fs = require('fs');
const path = require('path');

const mailServicePath = path.join(__dirname, 'apps/api/src/mail/mail.service.ts');
let content = fs.readFileSync(mailServicePath, 'utf8');

// Update wrapEmailHtml logo
content = content.replace(
  /<img src="https:\/\/api\.raaghas\.in\/uploads\/[^"]+" alt="Raaghas"/g,
  '<img src="https://raaghas.in/logo-dark.svg" alt="Raaghas"'
);

// We need to strip out the repeated wrappers in the HTML variables
// The inner content starts with `<div style="text-align: center;">` for all of them EXCEPT the pre-header text.
// Actually, since there are 7 templates, I'll just write a script that captures the core content of each template and replaces the whole let html = `...` block.

const blocks = content.match(/let html = `([\s\S]*?)`;/g);

if (blocks) {
  blocks.forEach(block => {
    // Extract everything between <!-- Body --> and <!-- Footer -->
    const bodyMatch = block.match(/<!-- Body -->\s*([\s\S]*?)\s*<!-- Footer -->/);
    if (bodyMatch) {
      const coreContent = bodyMatch[1].trim();
      content = content.replace(block, `let html = \`\n          \${'${coreContent}'}\n    \`;`);
    } else {
       // If no <!-- Body --> found (like in sendDailySettlementReport), just strip the wrapper
       const innerMatch = block.match(/<div style="max-width: 600px[^>]+>([\s\S]*?)<\/div>\s*<\/div>\s*`/);
       if (innerMatch) {
         content = content.replace(block, `let html = \`\n          \${'${innerMatch[1].trim()}'}\n    \`;`);
       }
    }
  });
}

// Ensure wrapEmailHtml is properly formatted
content = content.replace(/\$\{'([\s\S]*?)'\}/g, "$1");

fs.writeFileSync(mailServicePath, content);
console.log("Email templates fixed");
