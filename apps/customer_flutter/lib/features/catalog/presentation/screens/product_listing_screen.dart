import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../../core/widgets/product_card.dart';
import '../controllers/catalog_providers.dart';

const String _recentSearchesKey = 'kgs_recent_searches_list';

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
  Timer? _debounce;
  String _searchQuery = '';
  bool _onlyInStock = false;
  String _sort = 'newest';
  List<String> _recentSearches = [];

  @override
  void initState() {
    super.initState();
    _loadRecentSearches();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRecentSearches() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        _recentSearches = prefs.getStringList(_recentSearchesKey) ?? [];
      });
    } catch (_) {}
  }

  Future<void> _saveSearch(String query) async {
    if (query.trim().isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final updated = [
        query.trim(),
        ..._recentSearches.where((s) => s.toLowerCase() != query.trim().toLowerCase()),
      ].take(6).toList();
      await prefs.setStringList(_recentSearchesKey, updated);
      setState(() {
        _recentSearches = updated;
      });
    } catch (_) {}
  }

  Future<void> _clearRecentSearches() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_recentSearchesKey);
      setState(() {
        _recentSearches = [];
      });
    } catch (_) {}
  }

  void _onSearchChanged(String val) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      setState(() {
        _searchQuery = val.trim();
      });
      if (val.trim().isNotEmpty) {
        _saveSearch(val.trim());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final filter = ProductFilter(
      categoryId: widget.categoryId,
      search: _searchQuery.isEmpty ? null : _searchQuery,
      inStock: _onlyInStock ? true : null,
      sort: _sort,
    );
    final productsAsync = ref.watch(productsProvider(filter));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.categoryName ?? 'Store Catalog'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sort items',
            onSelected: (val) {
              setState(() {
                _sort = val;
              });
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'newest', child: Text('Newest First')),
              const PopupMenuItem(value: 'price_asc', child: Text('Price: Low to High')),
              const PopupMenuItem(value: 'price_desc', child: Text('Price: High to Low')),
              const PopupMenuItem(value: 'name_asc', child: Text('Name: A to Z')),
            ],
          ),
        ],
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
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
              onChanged: _onSearchChanged,
            ),
          ),

          // Filter quick chips (In Stock only & Active Sort)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimensions.lg),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  FilterChip(
                    label: const Text('In Stock Only'),
                    selected: _onlyInStock,
                    onSelected: (val) => setState(() => _onlyInStock = val),
                    selectedColor: AppColors.primaryContainer,
                    checkmarkColor: AppColors.primary,
                  ),
                  const SizedBox(width: 8),
                  if (_sort != 'newest') ...[
                    Chip(
                      label: Text(
                        _sort == 'price_asc'
                            ? 'Price: Low-High'
                            : _sort == 'price_desc'
                                ? 'Price: High-Low'
                                : 'Name: A-Z',
                      ),
                      onDeleted: () => setState(() => _sort = 'newest'),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (_searchQuery.isNotEmpty || _onlyInStock || _sort != 'newest')
                    ActionChip(
                      label: const Text('Clear Filters', style: TextStyle(color: AppColors.error)),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                          _onlyInStock = false;
                          _sort = 'newest';
                        });
                      },
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),

          // Recent search keywords (if empty search)
          if (_searchQuery.isEmpty && _recentSearches.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: AppDimensions.lg, vertical: 4),
              child: Row(
                children: [
                  const Icon(Icons.history, size: 14, color: AppColors.textTertiary),
                  const SizedBox(width: 6),
                  const Text('Recent:', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _recentSearches.map((term) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ActionChip(
                              label: Text(term, style: const TextStyle(fontSize: 10)),
                              padding: EdgeInsets.zero,
                              onPressed: () {
                                _searchController.text = term;
                                setState(() => _searchQuery = term);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 14, color: AppColors.textTertiary),
                    onPressed: _clearRecentSearches,
                    tooltip: 'Clear history',
                  ),
                ],
              ),
            ),

          // Product Grid
          Expanded(
            child: productsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return EmptyView(
                    title: 'No Items Found',
                    description: 'No groceries matched your search or filters.',
                    actionLabel: 'Reset Filters',
                    onAction: () {
                      _searchController.clear();
                      setState(() {
                        _searchQuery = '';
                        _onlyInStock = false;
                        _sort = 'newest';
                      });
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
