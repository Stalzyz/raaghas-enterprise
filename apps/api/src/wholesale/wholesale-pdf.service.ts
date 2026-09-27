import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class WholesalePdfService {
  private readonly logger = new Logger(WholesalePdfService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Generates a premium styled PDF using the same payload structure as the frontend Invoice View
   */
  async generateStyledWholesalePDF(invoice: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Proforma Invoice - ${invoice.invoiceNumber}`,
          Author: 'Raaghas',
        }
      });
      
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const wineColor = '#701A31';
      const charcoalColor = '#333333';
      const grayColor = '#999999';

      // ─── Header ───
      doc.fillColor(wineColor)
         .font('Times-Roman')
         .fontSize(24)
         .text(invoice.seller.name.toUpperCase(), { characterSpacing: 2 });
      
      doc.moveDown(0.2);
      doc.fillColor(grayColor)
         .font('Helvetica')
         .fontSize(8)
         .text(invoice.seller.address, { width: 250, lineGap: 2 })
         .text(invoice.seller.state)
         .fillColor(charcoalColor)
         .font('Helvetica-Bold')
         .text(`GSTIN: ${invoice.seller.gst}`)
         .font('Helvetica')
         .text(invoice.seller.email);
         
      if (invoice.seller.website) {
         doc.text(invoice.seller.website);
      }

      // ─── Invoice Metadata (Right Aligned) ───
      const rightColumnX = 400;
      const isRetail = invoice.type === 'RETAIL';
      const invoiceTitle = isRetail ? 'TAX INVOICE' : 'PRO-FORMA';
      
      doc.fillColor('#E0E0E0')
         .font('Helvetica-Bold')
         .fontSize(20)
         .text(invoiceTitle, rightColumnX, 50, { align: 'right', characterSpacing: 2 });
      
      doc.fillColor(grayColor)
         .fontSize(9)
         .text('Invoice No.', rightColumnX, 85, { width: 80, align: 'left' })
         .fillColor(charcoalColor)
         .text(invoice.invoiceNumber, rightColumnX + 80, 85, { align: 'right' });

      doc.fillColor(grayColor)
         .text('Date', rightColumnX, 100, { width: 80, align: 'left' })
         .fillColor(charcoalColor)
         .text(new Date(invoice.date).toLocaleDateString('en-GB'), rightColumnX + 80, 100, { align: 'right' });

      doc.fillColor(grayColor)
         .text('Place of Supply', rightColumnX, 115, { width: 80, align: 'left' })
         .fillColor(charcoalColor)
         .text(invoice.seller.state, rightColumnX + 80, 115, { align: 'right' });

      doc.moveTo(50, 160).lineTo(545, 160).strokeColor('#F0F0F0').stroke();

      // ─── Bill To ───
      doc.moveDown(4);
      const billToY = 180;
      doc.fillColor('#CCCCCC')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('CONSIGNEE (BILL TO)', 50, billToY, { characterSpacing: 1 });
      
      doc.moveDown(0.5);
      doc.fillColor(charcoalColor)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text(invoice.buyer.name);
      
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(grayColor)
         .text(`Attn: ${invoice.buyer.contact}`, { lineGap: 2 })
         .text(invoice.buyer.address)
         .fillColor(charcoalColor)
         .font('Helvetica-Bold')
         .text(`GSTIN: ${invoice.buyer.gst}`)
         .font('Helvetica')
         .text(invoice.buyer.phone);

      // ─── Table Header ───
      const tableTop = 280;
      doc.rect(50, tableTop, 495, 25).fill('#F9F9F9');
      
      doc.fillColor(grayColor)
         .font('Helvetica-Bold')
         .fontSize(8);
      
      doc.text('DESCRIPTION', 60, tableTop + 10);
      doc.text('HSN', 280, tableTop + 10, { width: 50, align: 'center' });
      doc.text('QTY', 330, tableTop + 10, { width: 40, align: 'center' });
      doc.text('RATE', 370, tableTop + 10, { width: 80, align: 'right' });
      doc.text('TAXABLE VAL (INR)', 450, tableTop + 10, { width: 90, align: 'right' });

      // ─── Items ───
      let y = tableTop + 35;
      doc.font('Helvetica');
      doc.fontSize(9);
      doc.fillColor(charcoalColor);

      invoice.items.forEach((item: any) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.font('Helvetica-Bold').text(item.description, 60, y);
        doc.font('Helvetica').fontSize(7).fillColor(wineColor).text(`${item.taxPercent}% GST`, 60, y + 10);
        
        doc.fontSize(9).fillColor(charcoalColor);
        doc.text(item.hsn, 280, y, { width: 50, align: 'center' });
        doc.text(item.quantity.toString(), 330, y, { width: 40, align: 'center' });
        doc.text(`Rs. ${item.unitPrice.toLocaleString('en-IN')}`, 370, y, { width: 80, align: 'right' });
        doc.font('Helvetica-Bold').text(`Rs. ${item.taxableValue.toLocaleString('en-IN')}`, 450, y, { width: 90, align: 'right' });
        
        y += 30;
        doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#F9F9F9').stroke();
      });

      // ─── Totals and Bank Details ───
      if (y > 600) {
        doc.addPage();
        y = 50;
      }

      // Bank Details Box (Only for Wholesale)
      const bankBoxY = y + 20;
      
      if (!isRetail && invoice.bankDetails) {
        doc.rect(50, bankBoxY, 200, 100).fill(charcoalColor);
        doc.fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .fontSize(7)
           .text('BANK SETTLEMENT', 60, bankBoxY + 15, { characterSpacing: 1 });
        
        doc.moveTo(60, bankBoxY + 25).lineTo(230, bankBoxY + 25).strokeColor('#444444').stroke();
        
        doc.font('Helvetica')
           .fontSize(8)
           .text(`Bank: ${invoice.bankDetails.bankName}`, 60, bankBoxY + 35, { lineGap: 3 })
           .text(`Name: ${invoice.bankDetails.accountName}`)
           .text(`A/C: ${invoice.bankDetails.accountNumber}`)
           .text(`IFSC: ${invoice.bankDetails.ifscCode}`);
      }

      // Totals
      const totalsX = 350;
      let totalsY = y + 20;

      const drawTotalLine = (label: string, value: string, isBold = false, isWine = false) => {
        doc.fillColor(isWine ? wineColor : (isBold ? charcoalColor : grayColor))
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(isBold ? 10 : 9)
           .text(label, totalsX, totalsY);
        
        doc.text(value, 450, totalsY, { width: 95, align: 'right' });
        totalsY += 20;
      };

      drawTotalLine('Taxable Subtotal', `Rs. ${invoice.summary.subtotal.toLocaleString('en-IN')}`);
      
      if (invoice.summary.discount && invoice.summary.discount > 0) {
        drawTotalLine('Discount', `- Rs. ${invoice.summary.discount.toLocaleString('en-IN')}`, false, true);
      }

      if (invoice.summary.shipping && invoice.summary.shipping > 0) {
        drawTotalLine('Shipping Charges', `Rs. ${invoice.summary.shipping.toLocaleString('en-IN')}`);
      }

      if (Array.isArray(invoice.summary.taxes)) {
        invoice.summary.taxes.forEach((tax: any) => {
          if (tax.amount > 0) {
            drawTotalLine(tax.name, `Rs. ${tax.amount.toLocaleString('en-IN')}`);
          }
        });
      }

      doc.moveTo(totalsX, totalsY).lineTo(545, totalsY).strokeColor('#EEEEEE').stroke();
      totalsY += 10;
      drawTotalLine('NET PAYABLE', `Rs. ${invoice.summary.grandTotal.toLocaleString('en-IN')}`, true, true);

      // Advance Box (Only for Wholesale)
      if (!isRetail) {
        totalsY += 10;
        doc.rect(totalsX, totalsY, 195, 45).fill('#FFF5F7');
        doc.fillColor(wineColor)
           .font('Helvetica-Bold')
           .fontSize(7)
           .text('ADVANCE COMMITMENT', totalsX + 10, totalsY + 10, { characterSpacing: 1 });
        doc.fontSize(10)
           .text(`Rs. ${(invoice.summary.grandTotal / 2).toLocaleString('en-IN')}`, totalsX + 10, totalsY + 22);
        doc.fontSize(6)
           .font('Helvetica')
           .text('50% REQUIRED TO INITIATE PRODUCTION', totalsX + 10, totalsY + 35);
      } else {
        // Retail "PAID" Stamp
        totalsY += 10;
        doc.rect(totalsX, totalsY, 195, 30).fill('#E8F5E9');
        doc.fillColor('#2E7D32')
           .font('Helvetica-Bold')
           .fontSize(12)
           .text('PAID IN FULL', totalsX, totalsY + 10, { width: 195, align: 'center', characterSpacing: 1 });
      }

      // ─── Footer ───
      doc.fillColor(grayColor)
         .font('Helvetica')
         .fontSize(8)
         .text('Thank you for choosing Raaghas', 50, 780, { align: 'center', characterSpacing: 1 })
         .text(`This is a computer generated ${isRetail ? 'invoice' : 'pro-forma'} and does not require a physical signature.`, { align: 'center' });

      doc.end();
    });
  }

  // Legacy methods kept for backward compatibility if needed, but updated to use the new logic internally if possible
  async generateProformaPDF(orderId: string): Promise<Buffer> {
    // This now ideally would call WholesaleService to get the payload, 
    // but to avoid circular dependency, we might need a different approach 
    // or just keep it simple for now.
    // For now, let's keep the existing logic but we should move callers to the new method.
    return this.generateStyledWholesalePDF(await this.legacyFetchPayload(orderId));
  }

  private async legacyFetchPayload(orderId: string): Promise<any> {
    // Minimal mock payload fetch for backward compatibility
    const order = await (this.prisma as any).wholesaleOrder.findUnique({
      where: { id: orderId },
      include: { retailer: true, items: { include: { variant: { include: { product: true } } } } }
    });
    
    const storeSettings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });
    
    // This is a simplified version of generateGSTInvoice from WholesaleService
    // In a real refactor, we'd move the payload generation to a shared utility
    return {
      invoiceNumber: order.formattedOrderNumber || order.orderNumber ? `PRO-${order.orderNumber}` : `PRO-${order.id.slice(0,8).toUpperCase()}`,
      date: new Date().toISOString(),
      seller: { 
        name: storeSettings?.storeName || 'Raaghas', 
        address: storeSettings?.businessAddress || 'Salem, India', 
        state: storeSettings?.businessState || 'Tamil Nadu', 
        gst: storeSettings?.gstNumber || '33AABCU9603R1ZX', 
        email: storeSettings?.supportEmail || 'wholesale@raaghas.com',
        website: 'www.raaghas.in'
      },
      buyer: { name: order.retailer.businessName, contact: order.retailer.contactName, address: order.retailer.address, gst: order.retailer.gstNumber, phone: order.retailer.phone },
      items: order.items.map((it: any) => ({
        description: it.variant.product.title,
        hsn: it.hsnCode || it.variant.product.hsnCode || 'TEXTILE-00',
        taxPercent: it.variant.product.taxRate || 5,
        quantity: it.quantity,
        unitPrice: Number(it.unitWholesalePrice),
        taxableValue: Number(it.totalPrice)
      })),
      summary: { subtotal: Number(order.totalAmount), taxes: [], grandTotal: Number(order.totalAmount), totalGst: 0 },
      bankDetails: { bankName: 'HDFC Bank', accountName: 'Raaghas', accountNumber: '50200012345678', ifscCode: 'HDFC0001234' }
    };
  }

  async generateInvoicePDF(invoice: any): Promise<Buffer> {
    // Map tax invoice to styled proforma for now as they share the same aesthetic
    return this.generateStyledWholesalePDF(invoice);
  }
}

