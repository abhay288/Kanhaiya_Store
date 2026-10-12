import 'package:flutter_test/flutter_test.dart';
import 'package:customer_flutter/features/checkout/domain/models/order_model.dart';

void main() {
  group('Phase 7: Order Management, Lifecycle & Tracking Models', () {
    test('CustomerOrderModel parses audit trail, invoiceNumber, and cancellation details', () {
      final json = {
        '_id': 'ord-12345',
        'orderNumber': 'KGS-202610-0999',
        'customerName': 'Abhay Kushwaha',
        'customerPhone': '9876543210',
        'customerEmail': 'abhay@example.com',
        'fulfillmentMethod': 'DELIVERY',
        'deliveryAddress': {
          'name': 'Abhay Kushwaha',
          'phone': '9876543210',
          'houseNumber': 'B-12',
          'street': 'Civil Lines',
          'city': 'Delhi',
          'state': 'Delhi',
          'pincode': '110001',
        },
        'items': [
          {
            'productId': 'prod-001',
            'name': 'Aashirvaad Shudh Chakki Atta',
            'brand': 'Aashirvaad',
            'unit': 'kg',
            'packSize': '5 kg',
            'sellingPrice': 245.0,
            'mrp': 280.0,
            'quantity': 2,
            'lineSubtotal': 490.0,
          }
        ],
        'subtotal': 490.0,
        'deliveryFee': 0.0,
        'totalAmount': 490.0,
        'paymentMethod': 'WHATSAPP_QR',
        'paymentStatus': 'PAID',
        'orderStatus': 'CONFIRMED',
        'invoiceNumber': 'INV-202610-0042',
        'cancelReason': null,
        'paymentReference': 'UPI-REF-998877',
        'guestTrackingToken': 'tok-abc-123-xyz',
        'statusHistory': [
          {
            'action': 'ORDER_PLACED',
            'fromStatus': null,
            'toStatus': 'PLACED',
            'performedBy': 'customer',
            'note': 'Order created',
            'timestamp': '2026-10-12T10:00:00.000Z',
          },
          {
            'action': 'PAYMENT_VERIFIED',
            'fromStatus': 'PENDING',
            'toStatus': 'PAID',
            'performedBy': 'admin:kanhaiyaastore@gmail.com',
            'note': 'Verified via bank reference UPI-REF-998877',
            'timestamp': '2026-10-12T10:15:00.000Z',
          },
          {
            'action': 'STATUS_CHANGE',
            'fromStatus': 'PLACED',
            'toStatus': 'CONFIRMED',
            'performedBy': 'admin:kanhaiyaastore@gmail.com',
            'note': 'Order confirmed by store manager',
            'timestamp': '2026-10-12T10:16:00.000Z',
          }
        ],
        'createdAt': '2026-10-12T10:00:00.000Z',
      };

      final order = CustomerOrderModel.fromJson(json);

      expect(order.id, equals('ord-12345'));
      expect(order.orderNumber, equals('KGS-202610-0999'));
      expect(order.orderStatus, equals('CONFIRMED'));
      expect(order.paymentStatus, equals('PAID'));
      expect(order.invoiceNumber, equals('INV-202610-0042'));
      expect(order.paymentReference, equals('UPI-REF-998877'));
      expect(order.guestTrackingToken, equals('tok-abc-123-xyz'));
      expect(order.statusHistory.length, equals(3));
      expect(order.statusHistory[1].action, equals('PAYMENT_VERIFIED'));
      expect(order.statusHistory[1].performedBy, equals('admin:kanhaiyaastore@gmail.com'));
    });

    test('CustomerOrderModel parses cancelled order with reason and pickup details', () {
      final json = {
        'id': 'ord-cancel-99',
        'orderNumber': 'KGS-202610-0100',
        'customerName': 'Ramesh Kumar',
        'customerPhone': '9811223344',
        'fulfillmentMethod': 'PICKUP',
        'pickupDetails': {
          'storeName': 'Kanhaiya General Store',
          'storeAddress': 'Shop No. 4, Main Market',
          'storePhone': '9876543210',
          'pickupInstructions': 'Show order number at billing counter',
        },
        'items': [],
        'subtotal': 150.0,
        'deliveryFee': 0.0,
        'totalAmount': 150.0,
        'paymentMethod': 'COD',
        'paymentStatus': 'PENDING',
        'orderStatus': 'CANCELLED',
        'cancelReason': 'Customer requested cancellation due to travel',
        'statusHistory': [
          {
            'action': 'ORDER_CANCELLED',
            'fromStatus': 'PLACED',
            'toStatus': 'CANCELLED',
            'performedBy': 'admin',
            'note': 'Customer requested cancellation due to travel',
            'timestamp': '2026-10-12T11:00:00.000Z',
          }
        ],
        'createdAt': '2026-10-12T10:30:00.000Z',
      };

      final order = CustomerOrderModel.fromJson(json);

      expect(order.orderStatus, equals('CANCELLED'));
      expect(order.cancelReason, contains('Customer requested'));
      expect(order.fulfillmentMethod, equals('PICKUP'));
      expect(order.pickupDetails?.storeName, equals('Kanhaiya General Store'));
      expect(order.statusHistory.first.action, equals('ORDER_CANCELLED'));
    });
  });
}
