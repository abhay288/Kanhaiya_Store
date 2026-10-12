import 'package:flutter_test/flutter_test.dart';
import 'package:customer_flutter/features/checkout/domain/models/store_settings_model.dart';
import 'package:customer_flutter/features/checkout/domain/models/address_model.dart';
import 'package:customer_flutter/features/checkout/domain/models/order_model.dart';

void main() {
  group('Phase 6: Checkout & Order Placement Domain Models Suite', () {
    test('StoreSettingsModel parses public store settings and checks delivery thresholds', () {
      final json = {
        'storeName': 'Kanhaiya General Store',
        'phone': '+919876543210',
        'whatsappNumber': '+919876543210',
        'storeAddress': 'House 42, Main Bazar, New Delhi',
        'pickupInstructions': 'Collect at counter',
        'isDeliveryEnabled': true,
        'serviceablePincodes': ['110001', '110002'],
        'minOrderValue': 100,
        'standardDeliveryFee': 30,
        'freeDeliveryThreshold': 500,
        'estimatedDeliveryWindow': 'Same-day within 2-4 hours',
        'isWhatsappQrEnabled': true,
      };

      final settings = StoreSettingsModel.fromJson(json);
      expect(settings.storeName, 'Kanhaiya General Store');
      expect(settings.isDeliveryEnabled, true);
      expect(settings.freeDeliveryThreshold, 500.0);
      expect(settings.standardDeliveryFee, 30.0);
      expect(settings.serviceablePincodes, contains('110001'));
    });

    test('ServiceabilityResultModel correctly parses serviceability responses', () {
      final serviceableJson = {
        'serviceable': true,
        'pincode': '110001',
        'isDeliveryEnabled': true,
        'estimatedDeliveryWindow': '2-4 hours',
        'deliveryFee': 0,
        'freeDeliveryThreshold': 500,
        'minOrderValue': 100,
        'message': 'Delivery is available in your area.',
      };

      final res = ServiceabilityResultModel.fromJson(serviceableJson);
      expect(res.serviceable, true);
      expect(res.deliveryFee, 0.0);
      expect(res.pincode, '110001');

      final unserviceableJson = {
        'serviceable': false,
        'pincode': '999999',
        'isDeliveryEnabled': true,
        'estimatedDeliveryWindow': '',
        'deliveryFee': 30,
        'freeDeliveryThreshold': 500,
        'minOrderValue': 100,
        'message': 'Delivery is not available in PIN 999999.',
      };

      final unserviceableRes = ServiceabilityResultModel.fromJson(unserviceableJson);
      expect(unserviceableRes.serviceable, false);
      expect(unserviceableRes.pincode, '999999');
    });

    test('AddressModel converts between JSON and object with all required fields', () {
      final addr = AddressModel(
        id: 'addr-123',
        name: 'Abhay Kushwaha',
        phone: '9876543210',
        houseNumber: '42',
        street: 'Main Bazar',
        landmark: 'Near Post Office',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        deliveryInstructions: 'Ring bell twice',
        isDefault: true,
      );

      final json = addr.toJson();
      expect(json['name'], 'Abhay Kushwaha');
      expect(json['phone'], '9876543210');
      expect(json['pincode'], '110001');
      expect(json['isDefault'], true);

      final fromJson = AddressModel.fromJson({'_id': 'addr-123', ...json});
      expect(fromJson.id, 'addr-123');
      expect(fromJson.street, 'Main Bazar');
      expect(fromJson.city, 'New Delhi');
    });

    test('CustomerOrderModel parses full order snapshot with PENDING payment status', () {
      final orderJson = {
        '_id': 'order-mongoid-1',
        'orderNumber': 'KGS-202610-1234',
        'customerName': 'Abhay Kushwaha',
        'customerPhone': '9876543210',
        'fulfillmentMethod': 'DELIVERY',
        'deliveryAddress': {
          'name': 'Abhay Kushwaha',
          'phone': '9876543210',
          'houseNumber': '42',
          'street': 'Main Bazar',
          'city': 'New Delhi',
          'state': 'Delhi',
          'pincode': '110001',
        },
        'items': [
          {
            'productId': 'prod-1',
            'name': 'Aashirvaad Shudh Chakki Atta',
            'unit': 'kg',
            'packSize': '5 kg',
            'sellingPrice': 265,
            'mrp': 295,
            'quantity': 2,
            'lineSubtotal': 530,
          }
        ],
        'subtotal': 530,
        'deliveryFee': 0,
        'totalAmount': 530,
        'paymentMethod': 'COD',
        'paymentStatus': 'PENDING',
        'orderStatus': 'PLACED',
        'createdAt': '2026-10-12T10:00:00.000Z',
      };

      final order = CustomerOrderModel.fromJson(orderJson);
      expect(order.orderNumber, 'KGS-202610-1234');
      expect(order.fulfillmentMethod, 'DELIVERY');
      expect(order.paymentMethod, 'COD');
      expect(order.paymentStatus, 'PENDING');
      expect(order.orderStatus, 'PLACED');
      expect(order.subtotal, 530.0);
      expect(order.deliveryFee, 0.0);
      expect(order.totalAmount, 530.0);
      expect(order.items.length, 1);
      expect(order.items.first.lineSubtotal, 530.0);
      expect(order.deliveryAddress?.pincode, '110001');
    });

    test('CustomerOrderModel parses Store Pickup and WhatsApp QR order', () {
      final orderJson = {
        '_id': 'order-mongoid-2',
        'orderNumber': 'KGS-202610-5678',
        'customerName': 'Abhay Kushwaha',
        'customerPhone': '9876543210',
        'fulfillmentMethod': 'PICKUP',
        'pickupDetails': {
          'storeName': 'Kanhaiya General Store',
          'storeAddress': 'House 42, Main Bazar, New Delhi - 110001',
          'storePhone': '+919876543210',
          'pickupInstructions': 'Collect at store counter with Order #',
        },
        'items': [
          {
            'productId': 'prod-2',
            'name': 'Amul Pure Cow Ghee 1L',
            'unit': 'bottle',
            'sellingPrice': 615,
            'mrp': 650,
            'quantity': 1,
            'lineSubtotal': 615,
          }
        ],
        'subtotal': 615,
        'deliveryFee': 0,
        'totalAmount': 615,
        'paymentMethod': 'WHATSAPP_QR',
        'paymentStatus': 'PENDING',
        'orderStatus': 'PLACED',
        'whatsappPaymentUrl': 'https://wa.me/919876543210?text=Order%23KGS-202610-5678',
        'createdAt': '2026-10-12T11:00:00.000Z',
      };

      final order = CustomerOrderModel.fromJson(orderJson);
      expect(order.orderNumber, 'KGS-202610-5678');
      expect(order.fulfillmentMethod, 'PICKUP');
      expect(order.deliveryAddress, isNull);
      expect(order.pickupDetails?.storeName, 'Kanhaiya General Store');
      expect(order.paymentMethod, 'WHATSAPP_QR');
      expect(order.paymentStatus, 'PENDING');
      expect(order.whatsappPaymentUrl, contains('https://wa.me/919876543210'));
    });
  });
}
