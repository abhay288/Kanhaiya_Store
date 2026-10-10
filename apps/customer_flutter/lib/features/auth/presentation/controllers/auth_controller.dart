import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';

enum UserRole {
  customer,
  admin,
}

class UserModel {
  final String id;
  final String email;
  final String displayName;
  final UserRole role;
  final String? photoURL;

  const UserModel({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.photoURL,
  });

  bool get isAdmin => role == UserRole.admin;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final roleStr = (json['role'] as String? ?? 'CUSTOMER').toUpperCase();
    return UserModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      displayName: json['displayName'] as String? ?? 'Valued Customer',
      role: roleStr == 'ADMIN' ? UserRole.admin : UserRole.customer,
      photoURL: json['photoURL'] as String?,
    );
  }
}

class AuthState {
  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null;
  bool get isAdmin => user?.isAdmin ?? false;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  /// Authenticate with real backend using a Google Firebase ID Token.
  Future<bool> signInWithBackendToken(String idToken) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await apiClient.dio.post(
        '/auth/google',
        data: {'idToken': idToken},
      );

      final data = response.data['data'] as Map<String, dynamic>;
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      final token = data['token'] as String;

      apiClient.setAuthToken(token);

      state = AuthState(
        user: user,
        token: token,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Backend authentication failed: $e',
      );
      return false;
    }
  }

  /// Sign in with demo mode when external OAuth credentials are not yet configured.
  Future<void> signInWithGoogleDemo({bool simulateAsAdmin = false}) async {
    state = const AuthState(isLoading: true);
    await Future.delayed(const Duration(milliseconds: 600));

    if (simulateAsAdmin) {
      state = const AuthState(
        user: UserModel(
          id: 'adm-001',
          email: 'admin@kanhaiyastore.com',
          displayName: 'Store Manager (Admin)',
          role: UserRole.admin,
        ),
        token: 'mock-admin-session-token',
      );
      apiClient.setAuthToken('mock-admin-session-token');
    } else {
      state = const AuthState(
        user: UserModel(
          id: 'cust-001',
          email: 'abhay.customer@example.com',
          displayName: 'Abhay Kushwaha',
          role: UserRole.customer,
        ),
        token: 'mock-customer-session-token',
      );
      apiClient.setAuthToken('mock-customer-session-token');
    }
  }

  void signOut() {
    apiClient.setAuthToken(null);
    state = const AuthState();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
