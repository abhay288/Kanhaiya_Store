import 'package:flutter_riverpod/flutter_riverpod.dart';

enum UserRole {
  customer,
  admin,
}

class UserModel {
  final String id;
  final String email;
  final String displayName;
  final UserRole role;

  const UserModel({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
  });

  bool get isAdmin => role == UserRole.admin;
}

class AuthState {
  final UserModel? user;
  final bool isLoading;

  const AuthState({this.user, this.isLoading = false});

  bool get isAuthenticated => user != null;
  bool get isAdmin => user?.isAdmin ?? false;
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> signInWithGoogle({bool simulateAsAdmin = false}) async {
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
      );
    } else {
      state = const AuthState(
        user: UserModel(
          id: 'cust-001',
          email: 'abhay.customer@example.com',
          displayName: 'Abhay Kushwaha',
          role: UserRole.customer,
        ),
      );
    }
  }

  void signOut() {
    state = const AuthState();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
