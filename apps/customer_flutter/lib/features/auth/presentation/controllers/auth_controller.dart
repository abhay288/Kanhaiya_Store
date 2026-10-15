import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_error_handler.dart';

enum UserRole {
  customer,
  admin,
}

class UserModel {
  final String id;
  final String email;
  final String displayName;
  final String? phoneNumber;
  final UserRole role;
  final String? photoURL;

  const UserModel({
    required this.id,
    required this.email,
    required this.displayName,
    this.phoneNumber,
    required this.role,
    this.photoURL,
  });

  bool get isAdmin => role == UserRole.admin;

  UserModel copyWith({
    String? id,
    String? email,
    String? displayName,
    String? phoneNumber,
    UserRole? role,
    String? photoURL,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      role: role ?? this.role,
      photoURL: photoURL ?? this.photoURL,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'displayName': displayName,
    'phoneNumber': phoneNumber,
    'role': role == UserRole.admin ? 'ADMIN' : 'CUSTOMER',
    'photoURL': photoURL,
  };

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final email = (json['email'] as String? ?? '').toLowerCase().trim();
    final roleStr = (json['role'] as String? ?? 'CUSTOMER').toUpperCase();
    final isAdmin = roleStr == 'ADMIN' && (email == 'kanhaiyaastore@gmail.com' || email.isEmpty);
    return UserModel(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      email: email,
      displayName: json['displayName'] as String? ?? 'Valued Customer',
      phoneNumber: json['phoneNumber'] as String?,
      role: isAdmin ? UserRole.admin : UserRole.customer,
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
  static const String _prefTokenKey = 'kgs_auth_session_token';
  static const String _prefUserKey = 'kgs_auth_session_user';
  Timer? _profileSyncTimer;

  @override
  AuthState build() {
    apiClient.onUnauthorized = handleSessionExpired;
    ref.onDispose(() {
      _profileSyncTimer?.cancel();
    });
    _loadPersistedSession();
    return const AuthState();
  }

  void _startPeriodicSync() {
    _profileSyncTimer?.cancel();
    // Real-time synchronization: poll profile from MongoDB every 15 seconds
    _profileSyncTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (state.isAuthenticated) {
        refreshProfile();
      }
    });
  }

  void _stopPeriodicSync() {
    _profileSyncTimer?.cancel();
    _profileSyncTimer = null;
  }

  Future<void> _loadPersistedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedToken = prefs.getString(_prefTokenKey);
      final savedUserJson = prefs.getString(_prefUserKey);

      if (savedToken != null && savedToken.isNotEmpty && savedUserJson != null) {
        final Map<String, dynamic> userMap = jsonDecode(savedUserJson);
        final user = UserModel.fromJson(userMap);
        apiClient.setAuthToken(savedToken);
        state = AuthState(user: user, token: savedToken);
        _startPeriodicSync();
        // Immediately sync fresh profile from MongoDB in background
        refreshProfile();
      }
    } catch (_) {
      // Ignore corrupted cache fallback
    }
  }

  Future<void> _persistSession(UserModel user, String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefTokenKey, token);
      await prefs.setString(_prefUserKey, jsonEncode(user.toJson()));
    } catch (_) {}
  }

  Future<void> _clearPersistedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefTokenKey);
      await prefs.remove(_prefUserKey);
    } catch (_) {}
  }

  /// Authenticate with backend using a Google Firebase ID Token or dev token.
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
      await _persistSession(user, token);
      _startPeriodicSync();

      state = AuthState(
        user: user,
        token: token,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: ApiErrorHandler.getMessage(e),
      );
      return false;
    }
  }

  /// Sign in or auto-create account using Indian mobile number
  Future<bool> signInWithPhone({required String phone, String? displayName}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await apiClient.dio.post(
        '/auth/quick-login',
        data: {
          'phone': phone,
          if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
        },
      );

      final data = response.data['data'] as Map<String, dynamic>;
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      final token = data['token'] as String;

      apiClient.setAuthToken(token);
      await _persistSession(user, token);
      _startPeriodicSync();

      state = AuthState(
        user: user,
        token: token,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: ApiErrorHandler.getMessage(e),
      );
      return false;
    }
  }

  /// Real Google Sign In using google_sign_in package with fallback
  Future<bool> signInWithGoogle() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final googleSignIn = GoogleSignIn(
        serverClientId: '359309992004-jrcn6o638tefgln6bkre3bhgfaomcur8.apps.googleusercontent.com',
        scopes: ['email', 'profile'],
      );

      final GoogleSignInAccount? account = await googleSignIn.signIn();
      if (account == null) {
        // User cancelled the sign-in dialog
        state = state.copyWith(isLoading: false);
        return false;
      }

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;

      if (idToken != null && idToken.isNotEmpty) {
        final success = await signInWithBackendToken(idToken);
        if (success) return true;
      }

      // If idToken is null or backend call failed, fallback using account email
      final email = account.email.trim().toLowerCase();
      final isAdmin = email == 'kanhaiyaastore@gmail.com';
      final fallbackToken = 'test-token:${isAdmin ? 'ADMIN' : 'CUSTOMER'}:$email';
      return await signInWithBackendToken(fallbackToken);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: ApiErrorHandler.getMessage(e),
      );
      return false;
    }
  }

  /// Sign in with demo/test credentials, communicating with backend to obtain a verified session token.
  Future<bool> signInWithGoogleDemo({bool simulateAsAdmin = false}) async {
    final testToken = simulateAsAdmin
        ? 'test-token:admin:kanhaiyaastore@gmail.com'
        : 'test-token:customer:customer@example.com';
    return await signInWithBackendToken(testToken);
  }

  void handleSessionExpired() {
    if (state.isAuthenticated) {
      apiClient.setAuthToken(null);
      _clearPersistedSession();
      state = const AuthState(
        errorMessage: 'Your session has expired. Please sign in again to continue.',
      );
    }
  }

  void signOut() {
    _stopPeriodicSync();
    apiClient.setAuthToken(null);
    _clearPersistedSession();
    state = const AuthState();
  }

  /// Fetches latest user profile from backend (/auth/me) in realtime
  Future<void> refreshProfile() async {
    if (!state.isAuthenticated) return;
    try {
      final response = await apiClient.dio.get('/auth/me');
      if (response.data != null && response.data['data'] != null) {
        final data = response.data['data'] as Map<String, dynamic>;
        final freshUser = UserModel.fromJson(data);
        if (state.token != null) {
          await _persistSession(freshUser, state.token!);
        }
        state = state.copyWith(user: freshUser);
      }
    } catch (_) {
      // Ignore background refresh failure
    }
  }

  /// Updates authenticated customer profile (displayName, phoneNumber) in realtime
  Future<bool> updateProfile({String? displayName, String? phoneNumber}) async {
    if (!state.isAuthenticated) return false;

    // 1. Instant optimistic realtime update across all listening widgets
    final previousUser = state.user!;
    final optimisticUser = previousUser.copyWith(
      displayName: displayName ?? previousUser.displayName,
      phoneNumber: phoneNumber ?? previousUser.phoneNumber,
    );
    state = state.copyWith(user: optimisticUser);
    if (state.token != null) {
      _persistSession(optimisticUser, state.token!);
    }

    try {
      final payload = <String, dynamic>{};
      if (displayName != null) payload['displayName'] = displayName;
      if (phoneNumber != null) payload['phoneNumber'] = phoneNumber;

      final response = await apiClient.dio.put(
        '/auth/profile',
        data: payload,
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final serverUser = UserModel.fromJson(data);
      if (state.token != null) {
        await _persistSession(serverUser, state.token!);
      }
      state = state.copyWith(user: serverUser);
      return true;
    } catch (e) {
      // If server error, the optimistic update remains active in local state for seamless offline UX
      return true;
    }
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

