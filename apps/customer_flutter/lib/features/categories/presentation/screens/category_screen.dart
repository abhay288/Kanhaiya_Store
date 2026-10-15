import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../../core/localization/app_language_provider.dart';
import '../../../../core/localization/app_strings.dart';
import 'package:customer_flutter/features/catalog/presentation/controllers/catalog_providers.dart';

class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(appLanguageProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('All Categories'.tr(lang)),
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
                  cat.name.tr(lang),
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Text(
                  '${cat.itemCount} ${'items available'.tr(lang)}',
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
        loading: () => LoadingView(message: 'Loading categories...'.tr(lang)),
        error: (err, _) => ErrorView(
          message: 'Error loading categories: $err',
          onRetry: () => ref.invalidate(categoriesProvider),
        ),
      ),
    );
  }
}
