import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    // Double security assertion
    if (!authState.isAdmin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Access Denied')),
        body: const Center(
          child: Text('403 Forbidden: Administrator credentials required.'),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Store Admin Center'),
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Admin Identity Card
            Container(
              padding: const EdgeInsets.all(AppDimensions.md),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield, color: AppColors.secondary, size: 28),
                  const SizedBox(width: AppDimensions.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          authState.user?.displayName ?? 'Admin Operator',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                        ),
                        Text(
                          'Authenticated as: ${authState.user?.email}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // Operational Metrics Grid
            const Text(
              'Store Live Metrics',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppDimensions.sm),

            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.4,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              children: [
                _buildMetricCard('Total Orders Today', '14', AppColors.primary),
                _buildMetricCard('Pending WhatsApp QR', '3', AppColors.warning),
                _buildMetricCard('Revenue Today', CurrencyFormatter.format(8450), AppColors.secondary),
                _buildMetricCard('Low Stock Items', '2', AppColors.error),
              ],
            ),
            const SizedBox(height: AppDimensions.xl),

            // Pending Approvals Section
            const Text(
              'Pending Payment Verifications (WhatsApp QR)',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppDimensions.sm),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.md),
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(
                        backgroundColor: AppColors.secondaryContainer,
                        child: Icon(Icons.qr_code, color: AppColors.secondary),
                      ),
                      title: const Text('Order KS-202610-0094', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      subtitle: const Text('Amount: ₹382 • Ref: UPI/AXIS/928410', style: TextStyle(fontSize: 11)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.check_circle, color: AppColors.success),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Payment verified & order confirmed')),
                              );
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel, color: AppColors.error),
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.xl),

            // Inventory & Store Controls
            const Text(
              'Operational Controls',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppDimensions.sm),

            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    value: true,
                    activeThumbColor: AppColors.primary,
                    title: const Text('Store Open for Online Orders', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: const Text('Customers can place orders during store hours', style: TextStyle(fontSize: 11)),
                    onChanged: (val) {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.inventory, color: AppColors.primary),
                    title: const Text('Quick Stock Adjustment', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: const Text('Update chakki atta, oil & dal stock quantities', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color),
          ),
        ],
      ),
    );
  }
}
