import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(title: const Text('My Account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          children: [
            // User Header Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        user != null ? user.displayName[0].toUpperCase() : 'G',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: AppDimensions.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.displayName ?? 'Guest Shopper',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            user?.email ?? 'Sign in for order sync & addresses',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          if (user != null) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: user.isAdmin ? AppColors.secondaryContainer : AppColors.primaryContainer,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                user.isAdmin ? 'AUTHORIZED STORE ADMIN' : 'VERIFIED CUSTOMER',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: user.isAdmin ? AppColors.onSecondaryContainer : AppColors.onPrimaryContainer,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // If user has admin privileges, display the protected Admin Workspace button!
            if (authState.isAdmin) ...[
              Card(
                color: AppColors.secondaryContainer.withValues(alpha: 0.4),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: AppColors.secondary, width: 1.5),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                ),
                child: ListTile(
                  leading: const Icon(Icons.admin_panel_settings, color: AppColors.secondary),
                  title: const Text(
                    'Store Admin Dashboard',
                    style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.onSecondaryContainer),
                  ),
                  subtitle: const Text(
                    'Manage store orders, WhatsApp QR payments & stock',
                    style: TextStyle(fontSize: 12),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.secondary),
                  onTap: () => context.push('/admin'),
                ),
              ),
              const SizedBox(height: AppDimensions.md),
            ],

            // General menu options
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.location_on_outlined, color: AppColors.primary),
                    title: const Text('Saved Addresses', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: const Text('Home: House 42, Main Bazar', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.call_outlined, color: AppColors.primary),
                    title: const Text('Store Helpline & WhatsApp', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: const Text('+91 98765 43210', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.receipt_long_outlined, color: AppColors.primary),
                    title: const Text('My Invoices', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () => context.push('/orders'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // Sign In / Sign Out action
            if (!authState.isAuthenticated) ...[
              ElevatedButton.icon(
                onPressed: () => context.push('/signin'),
                icon: const Icon(Icons.login),
                label: const Text('Sign In with Google'),
              ),
            ] else ...[
              OutlinedButton.icon(
                onPressed: () {
                  ref.read(authProvider.notifier).signOut();
                },
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text('Sign Out', style: TextStyle(color: AppColors.error)),
              ),
            ],
            const SizedBox(height: AppDimensions.xl),

            // Store Info Footer
            const Text(
              'Kanhaiya General Store • App v1.0.0 (Phase 1)',
              style: TextStyle(fontSize: 11, color: AppColors.textTertiary),
            ),
          ],
        ),
      ),
    );
  }
}
