const fs = require('fs');
const path = require('path');

const targetFile = path.join('/Users/stalinkumar/Documents/Raaghas_website/apps/api/src/mail/mail.service.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const BRAND_COLOR = '#611c34';
const LOGO_PLACEHOLDER = 'https://via.placeholder.com/200x60/FDFBF7/611c34?text=RAAGHAS';

function getWrapper(title, preheader, heroImage, bodyContent, includeFooter = true) {
  return `
      <div style="background-color: #FDFBF7; padding: 40px 20px; font-family: 'Inter', Arial, sans-serif; color: #333333; line-height: 1.6;">
        <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="text-align: center; padding: 30px 20px; border-bottom: 1px solid #f0f0f0;">
            <img src="${LOGO_PLACEHOLDER}" alt="Raaghas" style="height: 40px; display: block; margin: 0 auto;" />
          </div>
          
          ${heroImage ? `
          <!-- Hero Image -->
          <div style="width: 100%; height: 240px; background-image: url('${heroImage}'); background-size: cover; background-position: center;"></div>
          ` : ''}

          <!-- Body -->
          <div style="padding: 40px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: ${BRAND_COLOR}; font-size: 26px; margin-top: 0; text-align: center; font-weight: normal;">${title}</h1>
            ${bodyContent}
          </div>
          
          ${includeFooter ? `
          <!-- Footer -->
          <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #f0f0f0;">
            <p style="margin: 0; font-size: 12px; color: #777777;">
              <strong>Raaghas Pvt Ltd</strong><br/>
              Banjara Hills, Hyderabad, India<br/><br/>
              <a href="#" style="color: ${BRAND_COLOR}; text-decoration: none;">Shop Now</a> | 
              <a href="#" style="color: ${BRAND_COLOR}; text-decoration: none;">Contact Support</a>
            </p>
          </div>
          ` : ''}
        </div>
      </div>
  `;
}

// 1. Update Invoice Email
const invoiceBody = `
            <p>Dear \${buyerName},</p>
            <p>Thank you for choosing Raaghas. Your tax invoice <strong>\${invoiceNumber}</strong> has been successfully generated.</p>
            
            <div style="background: #FDFBF7; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #f5ede6;">
              <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #777;">Total Amount</p>
              <h2 style="margin: 5px 0 0; color: ${BRAND_COLOR}; font-size: 32px; font-weight: normal;">₹\${amount.toLocaleString()}</h2>
            </div>
            
            <p style="text-align: center;">Please find your formal PDF invoice attached to this email.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="#" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">View Dashboard</a>
            </div>
`;
content = content.replace(/let html = \`[\s\S]*?Raaghas Pvt Ltd \| Salem, India[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\`;/g, () => {
  return 'let html = `' + getWrapper('Tax Invoice', 'Your Raaghas invoice is ready.', '', invoiceBody) + '`;';
});

// 2. Update Order Confirmation
const orderBody = `
            <p>Dear \${buyerName},</p>
            <p>Thank you for shopping with Raaghas. We have received your payment and your order <strong>#\${orderId.slice(-6)}</strong> is confirmed.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 14px;">
              <thead>
                <tr style="background: #FDFBF7; border-bottom: 2px solid #eee;">
                  <th style="padding: 15px 10px; text-align: left; color: #555; font-weight: 600;">Item</th>
                  <th style="padding: 15px 10px; text-align: center; color: #555; font-weight: 600;">Qty</th>
                  <th style="padding: 15px 10px; text-align: right; color: #555; font-weight: 600;">Price</th>
                </tr>
              </thead>
              <tbody>
                \${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="2" style="padding: 20px 10px; text-align: right; color: #555; border-top: 1px solid #eee;">Total Paid</th>
                  <th style="padding: 20px 10px; text-align: right; font-weight: bold; font-size: 18px; color: ${BRAND_COLOR}; border-top: 1px solid #eee;">₹\${amount.toLocaleString('en-IN')}</th>
                </tr>
              </tfoot>
            </table>
`;
const orderHero = 'https://images.unsplash.com/photo-1610030469983-98e550d615e1?auto=format&fit=crop&q=80&w=1200';
// Only replace the html block for order confirmation. We will use string manipulation carefully.
const orderHtmlStart = content.indexOf('let html = `', content.indexOf('async sendOrderConfirmationEmail'));
const orderHtmlEnd = content.indexOf('`;', orderHtmlStart) + 2;
content = content.substring(0, orderHtmlStart) + 'let html = `' + getWrapper('Order Confirmed', 'Your Raaghas order has been confirmed.', orderHero, orderBody) + '`;' + content.substring(orderHtmlEnd);

// 3. Update OTP
const otpBody = `
            <p style="color: #666; font-size: 16px; margin-bottom: 32px; text-align: center;">Luxury & Elegance</p>
            <div style="background-color: #FDFBF7; border-radius: 16px; padding: 32px; margin-bottom: 32px; text-align: center;">
              <p style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Your verification code</p>
              <h2 style="color: ${BRAND_COLOR}; font-size: 48px; margin: 0; letter-spacing: 8px; font-weight: 300;">\${code}</h2>
            </div>
            <p style="color: #444; font-size: 15px; line-height: 1.6; margin-bottom: 32px; text-align: center;">
              To ensure your account's security, please enter this code to complete your login. This code will expire in 10 minutes.
            </p>
`;
const otpStart = content.indexOf('const html = `', content.indexOf('async sendOtpEmail'));
const otpEnd = content.indexOf('`;', otpStart) + 2;
content = content.substring(0, otpStart) + 'const html = `' + getWrapper('Verification Code', 'Your Raaghas login code.', '', otpBody) + '`;' + content.substring(otpEnd);

// 4. Update Password Reset
const resetBody = `
            <p>We received a request to reset your password for your Raaghas account.</p>
            <p>Click the button below to set a new password. This link will expire in 15 minutes.</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://raaghas.in/reset-password?token=\${token}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">Reset Password</a>
            </div>
            <p style="font-size: 13px; color: #888; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
`;
const resetStart = content.indexOf('let html = `', content.indexOf('async sendPasswordResetEmail'));
const resetEnd = content.indexOf('`;', resetStart) + 2;
content = content.substring(0, resetStart) + 'let html = `' + getWrapper('Reset Password', 'Reset your Raaghas password.', '', resetBody) + '`;' + content.substring(resetEnd);

// 5. Update Payment Failed
const failedBody = `
            <p>Dear \${buyerName},</p>
            <p>We noticed an issue with your recent payment attempt for order <strong>#\${orderId.slice(-6)}</strong>.</p>
            
            <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #ffebeb;">
              <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #d63031;">Failed Amount</p>
              <h2 style="margin: 5px 0 0; color: #d63031; font-size: 32px; font-weight: normal;">₹\${amount.toLocaleString()}</h2>
            </div>
            
            <p style="text-align: center;">Don't worry, your items are still waiting for you. Please click below to retry your payment and complete your order.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://raaghas.in/checkout" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">Retry Payment</a>
            </div>
`;
const failedStart = content.indexOf('let html = `', content.indexOf('async sendPaymentFailedEmail'));
const failedEnd = content.indexOf('`;', failedStart) + 2;
content = content.substring(0, failedStart) + 'let html = `' + getWrapper('Payment Unsuccessful', 'Action required to complete your order.', '', failedBody) + '`;' + content.substring(failedEnd);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Templates updated successfully!');
