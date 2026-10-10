import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../controllers/auth_controller.dart';

class GoogleSignInScreen extends ConsumerWidget {
  const GoogleSignInScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sign In'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(AppDimensions.lg),
                decoration: const BoxDecoration(
                  color: AppColors.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_person_outlined,
                  size: 52,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: AppDimensions.xl),
              const Text(
                'Welcome to Kanhaiya Store',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppDimensions.sm),
              const Text(
                'Sign in with Google to sync your grocery orders, save delivery addresses, and track real-time deliveries.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const Spacer(),

              // Status Note
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Text(
                  'Phase 2 Authentication: Integrates with backend POST /api/v1/auth/google. Use the quick credentials below to verify customer or store administrator routing in offline dev mode.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    height: 1.3,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // Customer Sign In Button
              ElevatedButton.icon(
                onPressed: authState.isLoading
                    ? null
                    : () async {
                        await ref.read(authProvider.notifier).signInWithGoogleDemo(simulateAsAdmin: false);
                        if (context.mounted) {
                          context.go('/profile');
                        }
                      },
                icon: const Icon(Icons.account_circle_outlined),
                label: authState.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Continue as Customer'),
              ),
              const SizedBox(height: AppDimensions.md),

              // Admin Sign In Button
              OutlinedButton.icon(
                onPressed: authState.isLoading
                    ? null
                    : () async {
                        await ref.read(authProvider.notifier).signInWithGoogleDemo(simulateAsAdmin: true);
                        if (context.mounted) {
                          context.go('/admin');
                        }
                      },
                icon: const Icon(Icons.admin_panel_settings_outlined),
                label: const Text('Sign In as Store Admin'),
              ),
              const SizedBox(height: AppDimensions.md),
            ],
          ),
        ),
      ),
    );
  }
}
