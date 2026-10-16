import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../checkout/data/repositories/checkout_repository.dart';
import '../../../checkout/domain/models/order_model.dart';
import '../services/invoice_pdf_generator.dart';

class PaperInvoiceScreen extends ConsumerWidget {
  final CustomerOrderModel order;

  const PaperInvoiceScreen({
    super.key,
    required this.order,
  });

  String get _invoiceNumber =>
      order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';

  Future<void> _savePdfLocally(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Saving Invoice #$_invoiceNumber to device...'),
          duration: const Duration(seconds: 1),
          backgroundColor: AppColors.primary,
        ),
      );

      final pdfBytes = await InvoicePdfGenerator.generate(order);
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_invoiceNumber.pdf');
      await file.writeAsBytes(pdfBytes);

      messenger.showSnackBar(
        SnackBar(
          content: Text('✅ Invoice #$_invoiceNumber saved successfully!'),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Share',
            textColor: Colors.white,
            onPressed: () => _sharePdf(context),
          ),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Failed to save invoice: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _sharePdf(BuildContext context) async {
    try {
      final pdfBytes = await InvoicePdfGenerator.generate(order);
      await Printing.sharePdf(
        bytes: pdfBytes,
        filename: '$_invoiceNumber.pdf',
      );
    } catch (_) {
      // Fallback to share_plus
      try {
        final tempDir = await getTemporaryDirectory();
        final file = File('${tempDir.path}/$_invoiceNumber.pdf');
        final pdfBytes = await InvoicePdfGenerator.generate(order);
        await file.writeAsBytes(pdfBytes);

        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(file.path, mimeType: 'application/pdf', name: '$_invoiceNumber.pdf')],
            text: 'Retail Tax Invoice #$_invoiceNumber from Kanhaiya General Store',
            subject: 'Invoice #$_invoiceNumber',
          ),
        );
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Unable to share: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }
  }

  Future<void> _printPdf(BuildContext context) async {
    try {
      final pdfBytes = await InvoicePdfGenerator.generate(order);
      await Printing.layoutPdf(
        name: 'Invoice-$_invoiceNumber',
        onLayout: (format) async => pdfBytes,
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Printing failed: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _confirmDeleteInvoice(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever, color: AppColors.error),
            SizedBox(width: 8),
            Text('Delete Invoice?'),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete Paper Tax Invoice #$_invoiceNumber (${order.orderNumber})?\n\nThis will remove this order invoice from your account.',
          style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.delete_outline, size: 18),
            label: const Text('Delete Invoice'),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Deleting Invoice #$_invoiceNumber...'),
          duration: const Duration(seconds: 1),
        ),
      );

      final repo = ref.read(checkoutRepositoryProvider);
      await repo.deleteOrder(order.orderNumber);

      try {
        final prefs = await SharedPreferences.getInstance();
        final deleted = prefs.getStringList('kgs_deleted_order_numbers') ?? [];
        if (!deleted.contains(order.orderNumber)) {
          deleted.add(order.orderNumber);
          await prefs.setStringList('kgs_deleted_order_numbers', deleted);
        }
      } catch (_) {}

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Invoice #$_invoiceNumber deleted successfully.'),
            backgroundColor: AppColors.primary,
          ),
        );
        Navigator.pop(context, true);
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Paper Tax Invoice',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            Text(
              '#$_invoiceNumber • ${order.orderNumber}',
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 2,
        actions: [
          IconButton(
            icon: const Icon(Icons.print_outlined),
            tooltip: 'Print Invoice',
            onPressed: () => _printPdf(context),
          ),
          IconButton(
            icon: const Icon(Icons.download_outlined),
            tooltip: 'Save to Device',
            onPressed: () => _savePdfLocally(context),
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            tooltip: 'Share Invoice',
            onPressed: () => _sharePdf(context),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.white),
            tooltip: 'Delete Invoice',
            onPressed: () => _confirmDeleteInvoice(context, ref),
          ),
        ],
      ),
      body: SafeArea(
        child: PdfPreview(
          build: (format) => InvoicePdfGenerator.generate(order),
          canChangeOrientation: false,
          canChangePageFormat: false,
          canDebug: false,
          allowPrinting: true,
          allowSharing: true,
          maxPageWidth: 700,
          pdfFileName: '$_invoiceNumber.pdf',
          loadingWidget: const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: AppColors.primary),
                SizedBox(height: 14),
                Text(
                  'Generating Official Paper Invoice...',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          onError: (context, error) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: 12),
                  const Text(
                    'Failed to generate invoice',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
