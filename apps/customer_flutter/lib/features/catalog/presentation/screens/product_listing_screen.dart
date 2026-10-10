import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../../core/widgets/product_card.dart';
import '../controllers/catalog_providers.dart';

class ProductListingScreen extends ConsumerStatefulWidget {
  final String? categoryId;
  final String? categoryName;

  const ProductListingScreen({
    super.key,
    this.categoryId,
    this.categoryName,
  });

  @override
  ConsumerState<ProductListingScreen> createState() => _ProductListingScreenState();
}

class _ProductListingScreenState extends ConsumerState<ProductListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filter = ProductFilter(
      categoryId: widget.categoryId,
      search: _searchQuery.isEmpty ? null : _searchQuery,
    );
    final productsAsync = ref.watch(productsProvider(filter));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.categoryName ?? 'Store Catalog'),
      ),
      body: Column(
        children: [
          // Filter search bar
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimensions.lg,
              vertical: AppDimensions.sm,
            ),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search items in catalog...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val.trim());
              },
            ),
          ),

          // Product Grid
          Expanded(
            child: productsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return EmptyView(
                    title: 'No Items Found',
                    description: 'No groceries matched your search query in this category.',
                    actionLabel: _searchQuery.isNotEmpty ? 'Clear Search' : null,
                    onAction: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                  );
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(AppDimensions.lg),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.65,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return ProductCard(
                      product: product,
                      onTap: () => context.push('/product-detail/${product.id}'),
                    );
                  },
                );
              },
              loading: () => const LoadingView(message: 'Updating products...'),
              error: (err, _) => ErrorView(
                message: 'Error: $err',
                onRetry: () => ref.invalidate(productsProvider(filter)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
