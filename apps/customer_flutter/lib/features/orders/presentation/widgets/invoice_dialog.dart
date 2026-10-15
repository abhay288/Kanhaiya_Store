import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/config/env_config.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../checkout/domain/models/order_model.dart';

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
📍 *Store:* Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh (Code: 09)
📞 *Helpline / WhatsApp:* +91 9936269347
GSTIN: 09ANBPL4077E1Z1 | FSSAI: 12722046000057 | PAN: ANBPL4077E
''';
}

Future<void> downloadInvoicePdf(BuildContext context, CustomerOrderModel order) async {
  final scaffold = ScaffoldMessenger.of(context);
  final invoiceNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';

  scaffold.showSnackBar(
    SnackBar(
      content: Text('Downloading Invoice #$invoiceNum...'),
      duration: const Duration(seconds: 2),
      backgroundColor: AppColors.primary,
    ),
  );

  final downloadUrl = '${EnvConfig.apiBaseUrl}/orders/${order.id}/invoice';

  try {
    final dir = await getApplicationDocumentsDirectory();
    final filePath = '${dir.path}/$invoiceNum.pdf';
    final file = File(filePath);

    final response = await apiClient.dio.get<List<int>>(
      '/orders/${order.id}/invoice',
      options: Options(responseType: ResponseType.bytes),
    );

    if (response.data != null && response.data!.isNotEmpty) {
      await file.writeAsBytes(response.data!);
      scaffold.showSnackBar(
        SnackBar(
          content: Text('✅ Invoice #$invoiceNum saved successfully.'),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Share',
            textColor: Colors.white,
            onPressed: () {
              shareInvoice(context, order);
            },
          ),
        ),
      );
      return;
    }
  } catch (_) {
    // Fallback to browser download if direct file saving is restricted
  }

  try {
    final uri = Uri.parse(downloadUrl);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (e) {
    scaffold.showSnackBar(
      SnackBar(
        content: Text('Failed to download invoice: $e'),
        backgroundColor: AppColors.error,
      ),
    );
  }
}

Future<void> shareInvoice(BuildContext context, CustomerOrderModel order) async {
  final shareText = generateInvoiceShareText(order);
  final invoiceNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';

  try {
    final tempDir = await getTemporaryDirectory();
    final pdfPath = '${tempDir.path}/$invoiceNum.pdf';
    final file = File(pdfPath);

    if (!await file.exists()) {
      final response = await apiClient.dio.get<List<int>>(
        '/orders/${order.id}/invoice',
        options: Options(responseType: ResponseType.bytes),
      );
      if (response.data != null && response.data!.isNotEmpty) {
        await file.writeAsBytes(response.data!);
      }
    }

    if (await file.exists()) {
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
      return;
    }
  } catch (_) {
    // Fallback to text sharing if PDF streaming is offline
  }

  await SharePlus.instance.share(
    ShareParams(
      text: shareText,
      subject: 'Retail Invoice - Kanhaiya General Store #$invoiceNum',
    ),
  );
}

void showOrderInvoiceDialog(BuildContext context, CustomerOrderModel order) {
  showDialog(
    context: context,
    builder: (ctx) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 680),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Store Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(
                      child: Text(
                        'KGS',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'KANHAIYA GENERAL STORE',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary,
                            letterSpacing: 0.5,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Fatehpur Roshnai, Ground Floor, Sarvankhera',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Kanpur Dehat, Uttar Pradesh (Code: 09)',
                          style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
                        ),
                        Text(
                          'FSSAI No. 12722046000057 • GSTIN: 09ANBPL4077E1Z1',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                        Text(
                          'PAN: ANBPL4077E • Phone: +91 9936269347',
                          style: TextStyle(fontSize: 9, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const Divider(height: 20, thickness: 1),

              // Invoice Metadata
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Invoice #${order.invoiceNumber ?? order.orderNumber}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.green.shade200),
                                  ),
                                  child: Text(
                                    order.orderStatus.replaceAll('_', ' '),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.green.shade800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Date: ${order.createdAt.toIso8601String().split('T').first}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                Text('Payment: ${order.paymentMethod} (${order.paymentStatus})', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Customer & Delivery Info
                      const Text('Billed To / Customer Details', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.primary)),
                      const SizedBox(height: 4),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.customerName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            Text('Contact: +91 ${order.customerPhone}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                            if (order.fulfillmentMethod == 'DELIVERY' && order.deliveryAddress != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Address: ${order.deliveryAddress!.houseNumber}, ${order.deliveryAddress!.street}, ${order.deliveryAddress!.city} - ${order.deliveryAddress!.pincode}',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              )
                            else
                              const Padding(
                                padding: EdgeInsets.only(top: 4),
                                child: Text(
                                  'Fulfillment: In-Store Pickup Counter (Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, UP)',
                                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Items Table
                      const Text('Items Purchased', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.primary)),
                      const SizedBox(height: 6),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade200),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              color: const Color(0xFFF1F5F9),
                              child: const Row(
                                children: [
                                  Expanded(flex: 5, child: Text('Item', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11))),
                                  Expanded(flex: 2, child: Text('Qty', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11))),
                                  Expanded(flex: 3, child: Text('Total', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11))),
                                ],
                              ),
                            ),
                            ...order.items.map((item) => Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: 5,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                                        if (item.packSize != null)
                                          Text(item.packSize!, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: Text('${item.quantity}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
                                  ),
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      CurrencyFormatter.format(item.lineSubtotal),
                                      textAlign: TextAlign.right,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            )),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Totals
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotal', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Text(CurrencyFormatter.format(order.subtotal), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Pickup Charge', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          const Text('FREE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Delivery Fee', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Text(order.deliveryFee == 0 ? 'FREE' : CurrencyFormatter.format(order.deliveryFee), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                          Text(
                            CurrencyFormatter.format(order.totalAmount),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Thank you for shopping at Kanhaiya General Store!',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Action Buttons: Close, Download PDF, Share
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    child: const Text('Close'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => downloadInvoicePdf(context, order),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: AppColors.primary),
                        foregroundColor: AppColors.primary,
                      ),
                      icon: const Icon(Icons.download, size: 16),
                      label: const Text('Download PDF', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => shareInvoice(context, order),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.share, size: 16),
                      label: const Text('Share (All Apps)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
