import 'package:flutter_test/flutter_test.dart';
import 'package:customer_flutter/features/admin/domain/models/analytics_models.dart';

void main() {
  group('Phase 8: Analytics, Reports & Settings Domain Models Suite', () {
    test('AnalyticsOverviewModel correctly parses overview payload', () {
      final json = {
        'totalOrders': 45,
        'ordersToday': 12,
        'awaitingConfirmation': 4,
        'completedOrders': 38,
        'cancelledOrders': 3,
        'grossOrderValue': 14850.50,
        'verifiedPayments': 12400.00,
        'pendingPayments': 2450.50,
        'lowStockCount': 6,
        'outOfStockCount': 2,
        'totalActiveProducts': 85,
        'totalCustomers': 32,
        'dateRange': {'label': 'Last 30 Days'},
      };

      final model = AnalyticsOverviewModel.fromJson(json);

      expect(model.totalOrders, equals(45));
      expect(model.ordersToday, equals(12));
      expect(model.grossOrderValue, equals(14850.50));
      expect(model.verifiedPayments, equals(12400.00));
      expect(model.pendingPayments, equals(2450.50));
      expect(model.lowStockCount, equals(6));
      expect(model.outOfStockCount, equals(2));
      expect(model.totalActiveProducts, equals(85));
      expect(model.totalCustomers, equals(32));
      expect(model.dateRangeLabel, equals('Last 30 Days'));
    });

    test('SalesAnalyticsModel correctly parses sales breakdowns & timeline', () {
      final json = {
        'grossOrderValue': 24500.0,
        'verifiedPayments': 20000.0,
        'pendingPayments': 4500.0,
        'refundTotal': 0.0,
        'averageOrderValue': 490.0,
        'eligibleOrdersCount': 50,
        'paymentMethods': {
          'COD': {'count': 30, 'amount': 15000.0},
          'WHATSAPP_QR': {'count': 20, 'amount': 9500.0},
        },
        'fulfillmentMethods': {
          'DELIVERY': {'count': 40, 'amount': 20000.0},
          'PICKUP': {'count': 10, 'amount': 4500.0},
        },
        'statusCounts': {
          'COMPLETED': 45,
          'CANCELLED': 2,
        },
        'timeline': [
          {
            'date': '2026-10-10',
            'orderCount': 10,
            'grossValue': 5000.0,
            'verifiedPayments': 4000.0,
            'pendingPayments': 1000.0,
          }
        ],
      };

      final model = SalesAnalyticsModel.fromJson(json);

      expect(model.grossOrderValue, equals(24500.0));
      expect(model.averageOrderValue, equals(490.0));
      expect(model.timeline.length, equals(1));
      expect(model.timeline.first.date, equals('2026-10-10'));
      expect(model.paymentMethods['COD']['count'], equals(30));
    });

    test('CustomerSummaryModel parses registered and guest customer data', () {
      final jsonRegistered = {
        'id': 'user-101',
        'name': 'Pooja Verma',
        'email': 'pooja@example.com',
        'phone': '9876543210',
        'isRegistered': true,
        'registeredAt': '2026-08-15T00:00:00.000Z',
        'orderCount': 8,
        'totalSpend': 4320.0,
        'lastOrderDate': '2026-10-10T12:00:00.000Z',
      };

      final reg = CustomerSummaryModel.fromJson(jsonRegistered);
      expect(reg.isRegistered, isTrue);
      expect(reg.name, equals('Pooja Verma'));
      expect(reg.totalSpend, equals(4320.0));

      final jsonGuest = {
        'id': 'guest_9811223344',
        'name': 'Guest (3344)',
        'email': '',
        'phone': '9811223344',
        'isRegistered': false,
        'orderCount': 1,
        'totalSpend': 350.0,
      };

      final guest = CustomerSummaryModel.fromJson(jsonGuest);
      expect(guest.isRegistered, isFalse);
      expect(guest.phone, equals('9811223344'));
      expect(guest.totalSpend, equals(350.0));
    });

    test('AdminStoreSettingsModel parses and serializes store settings', () {
      final json = {
        'storeName': 'Kanhaiya General Store',
        'storePhone': '9876543210',
        'storeWhatsapp': '9876543210',
        'storeUpiId': 'kanhaiyastore@upi',
        'storeAddress': 'Shop 4, Main Market, New Delhi',
        'isPickupEnabled': true,
        'pickupInstructions': 'Collect at billing desk',
        'isDeliveryEnabled': true,
        'serviceablePincodes': ['110001', '110002'],
        'minOrderValue': 150.0,
        'standardDeliveryFee': 30.0,
        'freeDeliveryThreshold': 500.0,
        'estimatedDeliveryWindow': 'Same-day 2-4 hours',
        'isCodEnabled': true,
        'isWhatsappQrEnabled': true,
        'adminOrderAlertsEnabled': true,
        'lowStockAlertsEnabled': true,
        'customerStatusNotificationsEnabled': true,
        'invoicePrefix': 'INV',
        'gstin': '07AAAAA0000A1Z5',
      };

      final model = AdminStoreSettingsModel.fromJson(json);

      expect(model.storeName, equals('Kanhaiya General Store'));
      expect(model.minOrderValue, equals(150.0));
      expect(model.serviceablePincodes.length, equals(2));
      expect(model.gstin, equals('07AAAAA0000A1Z5'));

      final outJson = model.toJson();
      expect(outJson['storeName'], equals('Kanhaiya General Store'));
      expect(outJson['invoicePrefix'], equals('INV'));
      expect(outJson['serviceablePincodes'], equals(['110001', '110002']));
    });
  });
}
