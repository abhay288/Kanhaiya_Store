import 'package:flutter_test/flutter_test.dart';
import 'package:customer_flutter/features/admin/domain/models/stock_movement_model.dart';
import 'package:customer_flutter/features/admin/domain/models/inventory_alert_model.dart';
import 'package:customer_flutter/features/admin/domain/models/inventory_summary_model.dart';
import 'package:customer_flutter/features/catalog/domain/models/product_model.dart';

void main() {
  group('Phase 4: Flutter Inventory Domain Models Suite', () {
    test('StockMovementModel.fromJson accurately parses populated movement JSON', () {
      final json = {
        '_id': '60d5ec49f1b2c82d33333331',
        'productId': {
          '_id': '60d5ec49f1b2c82d22222221',
          'name': 'Aashirvaad Shudh Chakki Atta 5kg',
          'sku': 'AASH-ATTA-5KG',
          'unit': 'kg',
          'images': [
            {'url': 'https://res.cloudinary.com/demo/image/upload/atta.webp'}
          ],
        },
        'previousQuantity': 40.0,
        'changeQuantity': 20.0,
        'finalQuantity': 60.0,
        'adjustmentType': 'PURCHASE_RECEIPT',
        'reason': 'Received batch from ITC Ltd',
        'referenceNumber': 'INV-2026-9901',
        'batchNumber': 'BATCH-2026-A1',
        'performerName': 'Admin Operator',
        'performerEmail': 'admin@kanhaiyastore.com',
        'createdAt': '2026-10-11T12:00:00.000Z',
      };

      final movement = StockMovementModel.fromJson(json);

      expect(movement.id, '60d5ec49f1b2c82d33333331');
      expect(movement.productId, '60d5ec49f1b2c82d22222221');
      expect(movement.productName, 'Aashirvaad Shudh Chakki Atta 5kg');
      expect(movement.productSku, 'AASH-ATTA-5KG');
      expect(movement.productUnit, 'kg');
      expect(movement.productImage, 'https://res.cloudinary.com/demo/image/upload/atta.webp');
      expect(movement.previousQuantity, 40.0);
      expect(movement.changeQuantity, 20.0);
      expect(movement.finalQuantity, 60.0);
      expect(movement.adjustmentType, 'PURCHASE_RECEIPT');
      expect(movement.referenceNumber, 'INV-2026-9901');
      expect(movement.batchNumber, 'BATCH-2026-A1');
    });

    test('InventoryAlertModel.fromJson parses low-stock alert', () {
      final json = {
        '_id': '60d5ec49f1b2c82d44444441',
        'product': {
          '_id': '60d5ec49f1b2c82d22222221',
          'name': 'Fortune Sunlite Sunflower Oil 1L',
          'sku': 'FORT-OIL-1L',
          'unit': 'bottle',
        },
        'alertType': 'LOW_STOCK',
        'currentQuantity': 3,
        'threshold': 10,
        'status': 'ACTIVE',
        'message': 'Product low on stock (3 remaining).',
        'createdAt': '2026-10-11T12:00:00.000Z',
      };

      final alert = InventoryAlertModel.fromJson(json);

      expect(alert.id, '60d5ec49f1b2c82d44444441');
      expect(alert.alertType, 'LOW_STOCK');
      expect(alert.currentQuantity, 3.0);
      expect(alert.threshold, 10.0);
      expect(alert.status, 'ACTIVE');
      expect(alert.message, contains('3 remaining'));
    });

    test('InventorySummaryModel.fromJson parses KPI summary payload', () {
      final json = {
        'totalProducts': 120,
        'inStockCount': 105,
        'lowStockCount': 10,
        'outOfStockCount': 5,
        'expiringSoonCount': 3,
        'activeAlertsCount': 15,
        'recentMovements': [],
      };

      final summary = InventorySummaryModel.fromJson(json);

      expect(summary.totalProducts, 120);
      expect(summary.inStockCount, 105);
      expect(summary.lowStockCount, 10);
      expect(summary.outOfStockCount, 5);
      expect(summary.expiringSoonCount, 3);
      expect(summary.activeAlertsCount, 15);
    });

    test('ProductModel.fromJson parses batch number and expiry dates', () {
      final json = {
        'id': '60d5ec49f1b2c82d22222221',
        'name': 'Organic Basmati Rice 5kg',
        'slug': 'organic-basmati-rice-5kg',
        'categoryId': '60d5ec49f1b2c82d11111111',
        'sellingPrice': 499,
        'stockQuantity': 50,
        'lowStockThreshold': 8,
        'unit': 'kg',
        'batchNumber': 'BATCH-RICE-2026',
        'expiryDate': '2027-01-01T00:00:00.000Z',
      };

      final product = ProductModel.fromJson(json);

      expect(product.batchNumber, 'BATCH-RICE-2026');
      expect(product.expiryDate, isNotNull);
      expect(product.expiryDate!.year, 2027);
    });
  });
}
