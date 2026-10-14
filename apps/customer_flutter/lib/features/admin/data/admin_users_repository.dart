import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';

class AdminUserModel {
  final String id;
  final String firebaseUid;
  final String email;
  final String displayName;
  final String phoneNumber;
  final String? photoURL;
  final String role;
  final bool isActive;
  final int orderCount;
  final double totalSpend;
  final DateTime? lastOrderDate;
  final DateTime createdAt;
  final bool isRootAdmin;

  const AdminUserModel({
    required this.id,
    required this.firebaseUid,
    required this.email,
    required this.displayName,
    required this.phoneNumber,
    this.photoURL,
    required this.role,
    required this.isActive,
    required this.orderCount,
    required this.totalSpend,
    this.lastOrderDate,
    required this.createdAt,
    required this.isRootAdmin,
  });

  factory AdminUserModel.fromJson(Map<String, dynamic> json) {
    return AdminUserModel(
      id: json['id'] ?? json['_id'] ?? '',
      firebaseUid: json['firebaseUid'] ?? '',
      email: json['email'] ?? '',
      displayName: json['displayName'] ?? 'Customer',
      phoneNumber: json['phoneNumber'] ?? '',
      photoURL: json['photoURL'],
      role: (json['role'] ?? 'CUSTOMER').toString().toUpperCase(),
      isActive: json['isActive'] != false,
      orderCount: (json['orderCount'] as num?)?.toInt() ?? 0,
      totalSpend: (json['totalSpend'] as num?)?.toDouble() ?? 0.0,
      lastOrderDate: json['lastOrderDate'] != null ? DateTime.tryParse(json['lastOrderDate']) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
      isRootAdmin: json['isRootAdmin'] == true || (json['email'] ?? '').toString().toLowerCase() == 'kanhaiyaastore@gmail.com',
    );
  }
}

class AdminUsersRepository {
  final Dio _dio;

  AdminUsersRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  /// Fetch paginated users directly from MongoDB with search, role, status filters
  Future<Map<String, dynamic>> getUsers({
    String? search,
    String? role,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (role != null && role.isNotEmpty && role != 'ALL') 'role': role,
      if (status != null && status.isNotEmpty && status != 'ALL') 'status': status,
    };

    final res = await _dio.get('/admin/users', queryParameters: params);
    final data = res.data['data'] as Map<String, dynamic>;
    final rawList = data['users'] as List<dynamic>? ?? [];
    final users = rawList.map((e) => AdminUserModel.fromJson(e as Map<String, dynamic>)).toList();

    return {
      'users': users,
      'total': (data['total'] as num?)?.toInt() ?? 0,
      'page': (data['page'] as num?)?.toInt() ?? 1,
      'totalPages': (data['totalPages'] as num?)?.toInt() ?? 1,
    };
  }

  /// Create a new user directly in MongoDB
  Future<AdminUserModel> createUser(Map<String, dynamic> payload) async {
    final res = await _dio.post('/admin/users', data: payload);
    final data = res.data['data'] as Map<String, dynamic>;
    return AdminUserModel.fromJson(data);
  }

  /// Get single user details and orders directly from MongoDB
  Future<Map<String, dynamic>> getUserDetails(String id) async {
    final res = await _dio.get('/admin/users/$id');
    return res.data['data'] as Map<String, dynamic>;
  }

  /// Update user attributes (Name, Phone, Role, Active Status) directly in MongoDB
  Future<AdminUserModel> updateUser(String id, Map<String, dynamic> payload) async {
    final res = await _dio.patch('/admin/users/$id', data: payload);
    final data = res.data['data'] as Map<String, dynamic>;
    return AdminUserModel.fromJson(data);
  }

  /// Delete user permanently from MongoDB
  Future<Map<String, dynamic>> deleteUser(String id) async {
    final res = await _dio.delete('/admin/users/$id');
    return res.data['data'] as Map<String, dynamic>;
  }
}

final adminUsersRepositoryProvider = Provider<AdminUsersRepository>((ref) {
  return AdminUsersRepository();
});
