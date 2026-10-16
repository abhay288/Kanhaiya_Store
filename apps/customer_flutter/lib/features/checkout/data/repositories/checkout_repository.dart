import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/models/address_model.dart';
import '../../domain/models/order_model.dart';
import '../../domain/models/store_settings_model.dart';

abstract class CheckoutRepository {
  Future<StoreSettingsModel> getStoreSettings();
  Future<ServiceabilityResultModel> checkServiceability(String pincode, {double subtotal = 0});
  Future<List<AddressModel>> getAddresses();
  Future<AddressModel> createAddress(AddressModel address);
  Future<bool> deleteAddress(String addressId);
  Future<CustomerOrderModel> placeOrder(Map<String, dynamic> payload);
  Future<CustomerOrderModel> getOrder(String idOrNumber);
  Future<List<CustomerOrderModel>> getMyOrders();
  Future<Map<String, dynamic>> getOrderTracking(String idOrNumber, {String? token});
  Future<bool> deleteOrder(String idOrNumber);
}

class ApiCheckoutRepository implements CheckoutRepository {
  final ApiClient _client;

  ApiCheckoutRepository(this._client);

  @override
  Future<StoreSettingsModel> getStoreSettings() async {
    try {
      final res = await _client.dio.get('/settings/public');
      if (res.data != null && res.data['data'] != null) {
        return StoreSettingsModel.fromJson(res.data['data']);
      }
    } catch (_) {
      // Fallback to default
    }
    return StoreSettingsModel.defaultSettings;
  }

  @override
  Future<ServiceabilityResultModel> checkServiceability(String pincode, {double subtotal = 0}) async {
    try {
      final res = await _client.dio.post('/settings/check-serviceability', data: {
        'pincode': pincode.trim(),
        'subtotal': subtotal,
      });
      if (res.data != null && res.data['data'] != null) {
        return ServiceabilityResultModel.fromJson(res.data['data']);
      }
    } catch (_) {
      // Fallback
    }

    final clean = pincode.trim();
    final serviceable = ['110001', '110002', '110003', '110006', '110084'].contains(clean);
    return ServiceabilityResultModel(
      serviceable: serviceable,
      pincode: clean,
      isDeliveryEnabled: true,
      estimatedDeliveryWindow: serviceable ? 'Same-day delivery within 2-4 hours' : 'Not Serviceable',
      deliveryFee: subtotal >= 500 ? 0.0 : 30.0,
      freeDeliveryThreshold: 500.0,
      minOrderValue: 100.0,
      message: serviceable
          ? 'Delivery is available in your area.'
          : 'Delivery is currently not available for PIN $clean. You can choose In-Store Pickup.',
    );
  }

  @override
  Future<List<AddressModel>> getAddresses() async {
    try {
      final res = await _client.dio.get('/addresses');
      if (res.data != null && res.data['data'] is List) {
        return (res.data['data'] as List)
            .map((e) => AddressModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Return empty if unauthenticated or error
    }
    return [];
  }

  @override
  Future<AddressModel> createAddress(AddressModel address) async {
    final res = await _client.dio.post('/addresses', data: address.toJson());
    if (res.data != null && res.data['data'] != null) {
      return AddressModel.fromJson(res.data['data']);
    }
    throw Exception('Failed to save address');
  }

  @override
  Future<bool> deleteAddress(String addressId) async {
    try {
      final res = await _client.dio.delete('/addresses/$addressId');
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<CustomerOrderModel> placeOrder(Map<String, dynamic> payload) async {
    try {
      final res = await _client.dio.post('/orders', data: payload);
      if (res.data != null && res.data['data'] != null) {
        return CustomerOrderModel.fromJson(res.data['data']);
      }
      throw Exception('Empty response received from order service');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ??
          e.response?.data?['message'] ??
          e.message ??
          'Failed to place order';
      throw Exception(msg);
    }
  }

  @override
  Future<CustomerOrderModel> getOrder(String idOrNumber) async {
    try {
      final res = await _client.dio.get('/orders/$idOrNumber');
      if (res.data != null && res.data['data'] != null) {
        return CustomerOrderModel.fromJson(res.data['data']);
      }
      throw Exception('Order not found');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ??
          e.response?.data?['message'] ??
          'Failed to fetch order';
      throw Exception(msg);
    }
  }

  @override
  Future<List<CustomerOrderModel>> getMyOrders() async {
    try {
      final res = await _client.dio.get('/orders/my');
      if (res.data != null && res.data['data'] is List) {
        return (res.data['data'] as List)
            .map((e) => CustomerOrderModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ??
          e.response?.data?['message'] ??
          'Failed to fetch orders';
      throw Exception(msg);
    }
  }

  @override
  Future<Map<String, dynamic>> getOrderTracking(String idOrNumber, {String? token}) async {
    try {
      final params = <String, dynamic>{
        if (token != null && token.isNotEmpty) 'token': token,
      };
      final res = await _client.dio.get('/orders/$idOrNumber/tracking', queryParameters: params);
      if (res.data != null && res.data['data'] != null) {
        return res.data['data'] as Map<String, dynamic>;
      }
      throw Exception('Tracking not found');
    } on DioException catch (e) {
      final msg = e.response?.data?['error']?['message'] ??
          e.response?.data?['message'] ??
          'Failed to fetch tracking';
      throw Exception(msg);
    }
  }

  @override
  Future<bool> deleteOrder(String idOrNumber) async {
    try {
      final res = await _client.dio.delete('/orders/$idOrNumber');
      return res.statusCode == 200;
    } catch (_) {
      try {
        final res = await _client.dio.delete('/orders/admin/$idOrNumber');
        return res.statusCode == 200;
      } catch (_) {
        return false;
      }
    }
  }
}

final checkoutRepositoryProvider = Provider<CheckoutRepository>((ref) {
  return ApiCheckoutRepository(apiClient);
});
