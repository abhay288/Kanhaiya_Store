import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../checkout/domain/models/order_model.dart';
import '../screens/paper_invoice_screen.dart';
import '../services/invoice_pdf_generator.dart';

String generateInvoiceShareText(CustomerOrderModel order) {
  final itemsList = order.items.map((item) {
    final pack = item.packSize != null && item.packSize!.isNotEmpty ? ' (${item.packSize})' : '';
    return '• ${item.name}$pack x ${item.quantity} = ${CurrencyFormatter.format(item.lineSubtotal)}';
  }).join('\n');

  final fulfillmentText = order.fulfillmentMethod == 'DELIVERY' && order.deliveryAddress != null
      ? 'Home Delivery: ${order.deliveryAddress!.houseNumber}, ${order.deliveryAddress!.street}, ${order.deliveryAddress!.city} - ${order.deliveryAddress!.pincode}'
      : 'In-Store Pickup Counter: Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, UP';

  final invoiceNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';

  return '''
🧾 *KANHAIYA GENERAL STORE - RETAIL ORDER INVOICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Invoice No:* $invoiceNum
*Order No:* ${order.orderNumber}
*Date:* ${order.createdAt.toLocal().toString().split('.').first}
*Status:* ${order.orderStatus.replaceAll('_', ' ')}
*Payment:* ${order.paymentMethod} (${order.paymentStatus})

👤 *Billed To:*
*Customer:* ${order.customerName}
*Contact:* +91 ${order.customerPhone}
*Fulfillment:* $fulfillmentText

🛒 *Items Purchased:*
$itemsList

━━━━━━━━━━━━━━━━━━━━━━━━━━
*Subtotal:* ${CurrencyFormatter.format(order.subtotal)}
*Delivery Fee:* ${order.deliveryFee == 0 ? 'FREE' : CurrencyFormatter.format(order.deliveryFee)}
*Total Amount Payable:* ${CurrencyFormatter.format(order.totalAmount)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Authorised Signatory:* Kanhaiya Chaurasiya
* Digital Computer Generated Signature
━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Store:* Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh (Code: 09)
📞 *Helpline / WhatsApp:* +91 9936269347
GSTIN: 09ANBPL4077E1Z1 | FSSAI: 12722046000057 | PAN: ANBPL4077E
''';
}

/// Directly downloads and saves the full A4 Paper Invoice PDF
Future<void> downloadInvoicePdf(BuildContext context, CustomerOrderModel order) async {
  final scaffold = ScaffoldMessenger.of(context);
  final invoiceNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';

  scaffold.showSnackBar(
    SnackBar(
      content: Text('Saving Full Paper Invoice #$invoiceNum...'),
      duration: const Duration(seconds: 1),
      backgroundColor: AppColors.primary,
    ),
  );

  try {
    final pdfBytes = await InvoicePdfGenerator.generate(order);
    final dir = await getApplicationDocumentsDirectory();
    final filePath = '${dir.path}/$invoiceNum.pdf';
    final file = File(filePath);
    await file.writeAsBytes(pdfBytes);

    scaffold.showSnackBar(
      SnackBar(
        content: Text('✅ Full Paper Invoice #$invoiceNum saved successfully.'),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: () {
            showOrderInvoiceDialog(context, order);
          },
        ),
      ),
    );
  } catch (e) {
    scaffold.showSnackBar(
      SnackBar(
        content: Text('Failed to save invoice: $e'),
        backgroundColor: AppColors.error,
      ),
    );
  }
}

/// Shares the full A4 Paper Invoice PDF via WhatsApp, Email, etc.
Future<void> shareInvoice(BuildContext context, CustomerOrderModel order) async {
  final invoiceNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';
  try {
    final pdfBytes = await InvoicePdfGenerator.generate(order);
    await Printing.sharePdf(
      bytes: pdfBytes,
      filename: '$invoiceNum.pdf',
    );
  } catch (_) {
    // Fallback to text + file sharing
    final shareText = generateInvoiceShareText(order);
    try {
      final tempDir = await getTemporaryDirectory();
      final pdfPath = '${tempDir.path}/$invoiceNum.pdf';
      final file = File(pdfPath);
      final pdfBytes = await InvoicePdfGenerator.generate(order);
      await file.writeAsBytes(pdfBytes);

      final xFile = XFile(
        file.path,
        mimeType: 'application/pdf',
        name: '$invoiceNum.pdf',
      );
      await SharePlus.instance.share(
        ShareParams(
          files: [xFile],
          text: shareText,
          subject: 'Retail Invoice - Kanhaiya General Store #$invoiceNum',
        ),
      );
    } catch (_) {
      await SharePlus.instance.share(
        ShareParams(
          text: shareText,
          subject: 'Retail Invoice - Kanhaiya General Store #$invoiceNum',
        ),
      );
    }
  }
}

/// Opens the authentic full A4 Paper Invoice screen
Future<dynamic> showOrderInvoiceDialog(BuildContext context, CustomerOrderModel order) {
  return Navigator.push(
    context,
    MaterialPageRoute(
      builder: (ctx) => PaperInvoiceScreen(order: order),
    ),
  );
}
