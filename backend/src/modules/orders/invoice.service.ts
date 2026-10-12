import PDFDocument from 'pdfkit';
import { IOrder } from '../../models/order.model';
import { SettingsService } from '../settings/settings.service';

export class InvoiceService {
  /**
   * Generates or assigns a unique invoice number for an order (INV-YYYYMM-XXXX)
   */
  static getOrCreateInvoiceNumber(order: IOrder): string {
    if (order.invoiceNumber) {
      return order.invoiceNumber;
    }
    const orderNumPart = order.orderNumber.replace(/^KGS-/, '');
    return `INV-${orderNumPart}`;
  }

  /**
   * Generates a professional PDF invoice buffer for the given order
   */
  static async generateInvoicePdf(order: IOrder): Promise<Buffer> {
    const settings = await SettingsService.getSettings();
    const invoiceNumber = this.getOrCreateInvoiceNumber(order);

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Invoice ${invoiceNumber}`,
            Author: settings.storeName || 'Kanhaiya General Store',
            Subject: `Invoice for Order #${order.orderNumber}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryColor = '#174D3A';
        const charcoalColor = '#262B29';
        const grayMuted = '#64748B';
        const lightBg = '#F8F6F0';

        // 1. Header Banner
        doc.rect(40, 40, 515, 65).fill(primaryColor);
        doc
          .fillColor('#FFFFFF')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(settings.storeName || 'KANHAIYA GENERAL STORE', 55, 55);

        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#E2E8F0')
          .text(
            `${settings.storeAddress} | Phone: ${settings.storePhone} | Email: ${settings.supportEmail || 'kanhaiyaastore@gmail.com'}`,
            55,
            78
          );

        doc.moveDown(2);

        // 2. Invoice Meta Header
        const metaTop = 120;
        doc
          .fillColor(primaryColor)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('RETAIL ORDER INVOICE', 40, metaTop);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(charcoalColor);

        doc.text(`Invoice No: ${invoiceNumber}`, 40, metaTop + 20);
        doc.text(`Order No: ${order.orderNumber}`, 40, metaTop + 33);
        doc.text(
          `Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          40,
          metaTop + 46
        );

        // Customer & Fulfillment Block (Right Column)
        doc.font('Helvetica-Bold').text('Billed & Delivered To:', 320, metaTop + 20);
        doc.font('Helvetica').text(`Customer: ${order.customerName}`, 320, metaTop + 33);
        doc.text(`Mobile: +91 ${order.customerPhone}`, 320, metaTop + 46);
        if (order.fulfillmentMethod === 'DELIVERY' && order.deliveryAddress) {
          const addr = order.deliveryAddress;
          doc.text(
            `Address: ${addr.houseNumber}, ${addr.street}, ${addr.city} - ${addr.pincode}`,
            320,
            metaTop + 59,
            { width: 230 }
          );
        } else {
          doc.text('Fulfillment: In-Store Counter Pickup', 320, metaTop + 59);
        }

        // 3. Payment Status Badge
        const badgeY = metaTop + 85;
        const isPaid = order.paymentStatus === 'PAID';
        const badgeBg = isPaid ? '#DCFCE7' : '#FEF3C7';
        const badgeText = isPaid ? '#166534' : '#92400E';
        const badgeLabel = isPaid
          ? `PAID (${order.paymentMethod})`
          : `PAYMENT PENDING (${order.paymentMethod})`;

        doc.rect(40, badgeY, 200, 22).fill(badgeBg);
        doc
          .fillColor(badgeText)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(badgeLabel, 50, badgeY + 6);

        // 4. Items Table Header
        const tableTop = badgeY + 35;
        doc.rect(40, tableTop, 515, 20).fill('#E2E8F0');
        doc
          .fillColor(charcoalColor)
          .font('Helvetica-Bold')
          .fontSize(9);

        doc.text('Item Description', 50, tableTop + 5);
        doc.text('Unit / Pack', 260, tableTop + 5);
        doc.text('Qty', 350, tableTop + 5);
        doc.text('Rate (INR)', 400, tableTop + 5);
        doc.text('Subtotal (INR)', 470, tableTop + 5);

        // 5. Items Rows
        let currentY = tableTop + 24;
        doc.font('Helvetica').fontSize(8.5);

        for (const item of order.items) {
          // Check for page break if items list is very long
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          doc.fillColor(charcoalColor);
          doc.text(item.name, 50, currentY, { width: 200 });
          doc.text(item.packSize || item.unit, 260, currentY);
          doc.text(String(item.quantity), 350, currentY);
          doc.text(`Rs. ${item.sellingPrice.toFixed(2)}`, 400, currentY);
          doc.text(`Rs. ${item.lineSubtotal.toFixed(2)}`, 470, currentY);

          currentY += 18;
          doc
            .strokeColor('#E2E8F0')
            .lineWidth(0.5)
            .moveTo(40, currentY)
            .lineTo(555, currentY)
            .stroke();
          currentY += 4;
        }

        // 6. Summary Block
        currentY += 10;
        doc.rect(320, currentY, 235, 75).fill(lightBg);

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(charcoalColor);

        doc.text('Items Subtotal:', 335, currentY + 10);
        doc.text(`Rs. ${order.subtotal.toFixed(2)}`, 480, currentY + 10);

        doc.text('Delivery Fee:', 335, currentY + 25);
        doc.text(
          order.deliveryFee === 0 ? 'FREE' : `Rs. ${order.deliveryFee.toFixed(2)}`,
          480,
          currentY + 25
        );

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(primaryColor);

        doc.text('Total Amount Payable:', 335, currentY + 45);
        doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, 480, currentY + 45);

        // 7. Footer & Store Policy
        const footerY = currentY + 95;
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(grayMuted)
          .text(
            'Store Policy: Daily Groceries & Essentials verified against authoritative store records. Orders handled directly by Kanhaiya General Store.',
            40,
            footerY,
            { align: 'center', width: 515 }
          );

        doc.text(
          `For assistance, contact WhatsApp/Phone: ${settings.storeWhatsapp} | Email: ${settings.supportEmail || 'kanhaiyaastore@gmail.com'}`,
          40,
          footerY + 12,
          { align: 'center', width: 515 }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
