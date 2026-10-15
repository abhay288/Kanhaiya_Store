import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/widgets/feedback_views.dart';
import 'package:customer_flutter/features/catalog/presentation/controllers/catalog_providers.dart';

class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('All Categories'),
      ),
      body: categoriesAsync.when(
        data: (categories) => ListView.separated(
          padding: const EdgeInsets.all(AppDimensions.lg),
          itemCount: categories.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final cat = categories[index];
            return Card(
              child: ListTile(
                leading: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                    border: Border.all(color: AppColors.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.network(
                    cat.realImageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Center(
                      child: Icon(cat.iconData, color: AppColors.primary, size: 24),
                    ),
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Center(
                        child: Icon(cat.iconData, color: AppColors.primary, size: 22),
                      );
                    },
                  ),
                ),
                title: Text(
                  cat.name,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Text(
                  '${cat.itemCount} items available',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textTertiary),
                onTap: () {
                  context.push(
                    '/products?categoryId=${cat.id}&categoryName=${Uri.encodeComponent(cat.name)}',
                  );
                },
              ),
            );
          },
        ),
        loading: () => const LoadingView(message: 'Loading categories...'),
        error: (err, _) => ErrorView(
          message: 'Error loading categories: $err',
          onRetry: () => ref.invalidate(categoriesProvider),
        ),
      ),
    );
  }
}
