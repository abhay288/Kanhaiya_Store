import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../../../core/config/env_config.dart';
import '../../../checkout/domain/models/order_model.dart';

class InvoicePdfGenerator {
  /// Converts an integer amount into Indian English words
  static String numberToWordsIndian(int number) {
    if (number == 0) return 'Zero Rupees Only';

    final units = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    final tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    String convertBelowThousand(int n) {
      String str = '';
      if (n >= 100) {
        str += '${units[n ~/ 100]} Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += '${tens[n ~/ 10]} ';
        n %= 10;
      }
      if (n > 0) {
        str += '${units[n]} ';
      }
      return str.trim();
    }

    String result = '';
    int crore = number ~/ 10000000;
    number %= 10000000;
    int lakh = number ~/ 100000;
    number %= 100000;
    int thousand = number ~/ 1000;
    number %= 1000;
    int remainder = number;

    if (crore > 0) {
      result += '${convertBelowThousand(crore)} Crore ';
    }
    if (lakh > 0) {
      result += '${convertBelowThousand(lakh)} Lakh ';
    }
    if (thousand > 0) {
      result += '${convertBelowThousand(thousand)} Thousand ';
    }
    if (remainder > 0) {
      result += convertBelowThousand(remainder);
    }

    return 'INR ${result.trim()} Only';
  }

  /// Generates the full A4 Paper Tax Invoice PDF bytes
  static Future<Uint8List> generate(CustomerOrderModel order) async {
    final pdf = pw.Document();

    pw.MemoryImage? logoImage;
    try {
      final logoBytes = await rootBundle.load('assets/images/kgs_logo.png');
      logoImage = pw.MemoryImage(logoBytes.buffer.asUint8List());
    } catch (_) {
      try {
        final logoBytes = await rootBundle.load('assets/images/kgs_logo_full.png');
        logoImage = pw.MemoryImage(logoBytes.buffer.asUint8List());
      } catch (_) {}
    }

    final invoiceNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';
    final dateFormat = DateFormat('dd MMM yyyy, hh:mm a');
    final formattedDate = dateFormat.format(order.createdAt.toLocal());

    final primaryColor = PdfColor.fromHex('174D3A'); // Store Emerald
    final lightGrayBg = PdfColor.fromHex('F8FAFC');
    final borderColor = PdfColor.fromHex('CBD5E1');

    final amountInWords = numberToWordsIndian(order.totalAmount.round());

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // 1. Header Banner
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: primaryColor,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                ),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Container(
                      width: 50,
                      height: 50,
                      decoration: const pw.BoxDecoration(
                        color: PdfColors.white,
                        borderRadius: pw.BorderRadius.all(pw.Radius.circular(6)),
                      ),
                      padding: const pw.EdgeInsets.all(3),
                      child: logoImage != null
                          ? pw.Image(logoImage, fit: pw.BoxFit.contain)
                          : pw.Center(
                              child: pw.Text(
                                'KGS',
                                style: pw.TextStyle(
                                  color: primaryColor,
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                    ),
                    pw.SizedBox(width: 14),
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            EnvConfig.appName.toUpperCase(),
                            style: pw.TextStyle(
                              color: PdfColors.white,
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 16,
                              letterSpacing: 0.5,
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'Daily Groceries, Spices, Dairy & Household Essentials',
                            style: const pw.TextStyle(
                              color: PdfColors.white,
                              fontSize: 8.5,
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh (State Code: 09)',
                            style: const pw.TextStyle(
                              color: PdfColors.white,
                              fontSize: 8,
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'FSSAI No: ${EnvConfig.fssaiNo}  |  GSTIN: ${EnvConfig.gstin}  |  PAN: ${EnvConfig.panNo}',
                            style: pw.TextStyle(
                              color: PdfColors.white,
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 8,
                            ),
                          ),
                          pw.Text(
                            'Helpline & WhatsApp: +91 ${EnvConfig.storeWhatsApp}  |  Email: ${EnvConfig.supportEmail}',
                            style: const pw.TextStyle(
                              color: PdfColors.white,
                              fontSize: 8,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 10),

              // 2. Tax Invoice Title Strip
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                decoration: pw.BoxDecoration(
                  color: lightGrayBg,
                  border: pw.Border.all(color: borderColor, width: 0.8),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'TAX INVOICE / CASH MEMO',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 11,
                        color: primaryColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                    pw.Text(
                      'ORIGINAL FOR RECIPIENT',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 8.5,
                        color: PdfColors.grey700,
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 8),

              // 3. Invoice Meta + Customer Details (Two Boxes)
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Invoice Details (Left)
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: borderColor, width: 0.8),
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _buildPdfKeyValue('Invoice No:', invoiceNum, isBold: true),
                          _buildPdfKeyValue('Order No:', order.orderNumber),
                          _buildPdfKeyValue('Invoice Date:', formattedDate),
                          _buildPdfKeyValue('Place of Supply:', 'Uttar Pradesh (09)'),
                          _buildPdfKeyValue(
                            'Payment Mode:',
                            '${order.paymentMethod} (${order.paymentStatus})',
                            valueColor: order.paymentStatus.toUpperCase() == 'PAID'
                                ? PdfColors.green800
                                : PdfColors.amber800,
                          ),
                          _buildPdfKeyValue('Order Status:', order.orderStatus.replaceAll('_', ' ')),
                        ],
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 8),

                  // Customer / Billed To Details (Right)
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: borderColor, width: 0.8),
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'BILLED & DELIVERED TO:',
                            style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 9,
                              color: primaryColor,
                            ),
                          ),
                          pw.SizedBox(height: 3),
                          pw.Text(
                            order.customerName.isNotEmpty ? order.customerName : 'Valued Customer',
                            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
                          ),
                          pw.Text('Mobile: +91 ${order.customerPhone}', style: const pw.TextStyle(fontSize: 8.5)),
                          pw.SizedBox(height: 2),
                          if (order.fulfillmentMethod == 'DELIVERY' && order.deliveryAddress != null)
                            pw.Text(
                              'Delivery Address: ${order.deliveryAddress!.houseNumber}, ${order.deliveryAddress!.street}, ${order.deliveryAddress!.city} - ${order.deliveryAddress!.pincode}',
                              style: const pw.TextStyle(fontSize: 8),
                            )
                          else
                            pw.Text(
                              'Fulfillment: In-Store Counter Pickup\n(Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, UP)',
                              style: const pw.TextStyle(fontSize: 8),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 10),

              // 4. Items Table
              pw.Table(
                border: pw.TableBorder.all(color: borderColor, width: 0.6),
                columnWidths: const {
                  0: pw.FlexColumnWidth(0.8), // S.No
                  1: pw.FlexColumnWidth(5.0), // Item Description
                  2: pw.FlexColumnWidth(1.8), // Pack Size
                  3: pw.FlexColumnWidth(1.2), // Qty
                  4: pw.FlexColumnWidth(2.0), // Rate
                  5: pw.FlexColumnWidth(2.2), // Total
                },
                children: [
                  // Table Header
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: primaryColor),
                    children: [
                      _buildTableHeaderCell('#', align: pw.TextAlign.center),
                      _buildTableHeaderCell('Description of Goods'),
                      _buildTableHeaderCell('Pack Size', align: pw.TextAlign.center),
                      _buildTableHeaderCell('Qty', align: pw.TextAlign.center),
                      _buildTableHeaderCell('Rate (INR)', align: pw.TextAlign.right),
                      _buildTableHeaderCell('Amount (INR)', align: pw.TextAlign.right),
                    ],
                  ),

                  // Items Rows
                  ...List.generate(order.items.length, (index) {
                    final item = order.items[index];
                    final isEven = index % 2 == 0;
                    return pw.TableRow(
                      decoration: pw.BoxDecoration(
                        color: isEven ? PdfColors.white : lightGrayBg,
                      ),
                      children: [
                        _buildTableCell('${index + 1}', align: pw.TextAlign.center),
                        _buildTableCell(item.name, isBold: true),
                        _buildTableCell(item.packSize ?? item.unit, align: pw.TextAlign.center),
                        _buildTableCell('${item.quantity}', align: pw.TextAlign.center),
                        _buildTableCell('Rs. ${item.sellingPrice.toStringAsFixed(2)}', align: pw.TextAlign.right),
                        _buildTableCell('Rs. ${item.lineSubtotal.toStringAsFixed(2)}', align: pw.TextAlign.right, isBold: true),
                      ],
                    );
                  }),
                ],
              ),

              pw.SizedBox(height: 8),

              // 5. Total & Words Section
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Left: Amount in Words & Terms
                  pw.Expanded(
                    flex: 6,
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.all(6),
                          decoration: pw.BoxDecoration(
                            color: lightGrayBg,
                            border: pw.Border.all(color: borderColor, width: 0.6),
                            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                          ),
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text(
                                'Amount Chargeable (in words):',
                                style: pw.TextStyle(
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 8,
                                  color: PdfColors.grey800,
                                ),
                              ),
                              pw.SizedBox(height: 2),
                              pw.Text(
                                amountInWords,
                                style: pw.TextStyle(
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 9,
                                  color: primaryColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        pw.SizedBox(height: 6),
                        pw.Text(
                          'Terms & Conditions:',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8),
                        ),
                        pw.Text(
                          '1. Goods once sold can be returned/exchanged within 24 hours in original condition with this invoice.\n'
                          '2. All disputes are subject to Kanpur Dehat jurisdiction.\n'
                          '3. * Digital Computer Generated Signature - Valid without physical signature.',
                          style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey700),
                        ),
                      ],
                    ),
                  ),

                  pw.SizedBox(width: 12),

                  // Right: Financial Summary Table
                  pw.Expanded(
                    flex: 5,
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: borderColor, width: 0.8),
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                      ),
                      child: pw.Column(
                        children: [
                          _buildSummaryRow('Items Subtotal:', 'Rs. ${order.subtotal.toStringAsFixed(2)}'),
                          _buildSummaryRow(
                            'Delivery / Pickup Fee:',
                            order.deliveryFee == 0 ? 'FREE' : 'Rs. ${order.deliveryFee.toStringAsFixed(2)}',
                          ),
                          _buildSummaryRow('Tax Included (GST):', 'Inclusive'),
                          pw.Divider(color: borderColor, thickness: 0.8),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text(
                                'Total Payable:',
                                style: pw.TextStyle(
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 11,
                                  color: primaryColor,
                                ),
                              ),
                              pw.Text(
                                'Rs. ${order.totalAmount.toStringAsFixed(2)}',
                                style: pw.TextStyle(
                                  fontWeight: pw.FontWeight.bold,
                                  fontSize: 13,
                                  color: primaryColor,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.Spacer(),

              // 6. Signatory & Seal Footer
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Thank you for shopping with us!',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 9,
                          color: primaryColor,
                        ),
                      ),
                      pw.Text(
                        'Kanhaiya General Store • Pure Quality, Honest Prices',
                        style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey600),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                      pw.Text(
                        'For KANHAIYA GENERAL STORE',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8),
                      ),
                      pw.SizedBox(height: 12),
                      pw.Text(
                        'Kanhaiya Chaurasiya',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 8.5,
                          color: PdfColors.black,
                        ),
                      ),
                      pw.SizedBox(height: 3),
                      pw.Container(
                        width: 145,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(top: pw.BorderSide(color: PdfColors.grey500, width: 0.6)),
                        ),
                        padding: const pw.EdgeInsets.only(top: 2),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          children: [
                            pw.Text(
                              'Authorised Signatory',
                              style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800),
                            ),
                            pw.SizedBox(height: 2),
                            pw.Text(
                              '* Digital Computer Generated Signature',
                              style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  static pw.Widget _buildPdfKeyValue(String key, String value, {bool isBold = false, PdfColor? valueColor}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1.5),
      child: pw.Row(
        children: [
          pw.SizedBox(
            width: 75,
            child: pw.Text(
              key,
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
            ),
          ),
          pw.Expanded(
            child: pw.Text(
              value,
              style: pw.TextStyle(
                fontSize: 8.5,
                fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
                color: valueColor ?? PdfColors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildTableHeaderCell(String text, {pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 4, vertical: 5),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          color: PdfColors.white,
          fontWeight: pw.FontWeight.bold,
          fontSize: 8.5,
        ),
      ),
    );
  }

  static pw.Widget _buildTableCell(String text, {pw.TextAlign align = pw.TextAlign.left, bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          fontSize: 8,
          fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
          color: PdfColors.black,
        ),
      ),
    );
  }

  static pw.Widget _buildSummaryRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.grey700)),
          pw.Text(value, style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
        ],
      ),
    );
  }
}
