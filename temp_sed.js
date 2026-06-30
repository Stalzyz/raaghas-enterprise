const fs = require('fs');
const file = '/Users/stalinkumar/Documents/Raaghas_website/apps/api/src/mail/mail.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /async sendAbandonedCartEmail[\s\S]*?\}\n\}/,
  \`async sendAbandonedCartEmail(to: string, buyerName: string, orderId: string, checkoutUrl: string) {
    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'CART_ABANDONED_REMINDER' } });
    
    let subject = \\\`You left something behind in your atelier... | Raaghas\\\`;
    let html = \\\`
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Pending Curation</p>
            <h1 style="font-size: 32px; margin: 0 0 40px 0;">Complete Your Acquisition</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear \${buyerName},<br/><br/>We noticed you left some exquisite pieces behind in your cart. Your selections have been reserved, but demand is high.</p>
            
            <a href="\${checkoutUrl}" class="button-premium">Return to Checkout</a>
          </div>
    \\\`;

    if (dbTemplate?.isActive) {
      const vars = { customerName: buyerName, checkoutUrl };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
    }

    html = this.wrapEmailHtml(html);
    return this.sendCustomEmail(to, subject, html);
  }
}\`
);
fs.writeFileSync(file, content);
