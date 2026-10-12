import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../catalog/domain/models/category_model.dart';
import '../../../catalog/domain/models/product_model.dart';
import '../../data/admin_catalog_repository.dart';
import 'admin_product_edit_screen.dart';

class AdminProductsScreen extends StatefulWidget {
  const AdminProductsScreen({super.key});

  @override
  State<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends State<AdminProductsScreen> {
  final AdminCatalogRepository _repo = adminCatalogRepository;
  final TextEditingController _searchController = TextEditingController();

  List<ProductModel> _products = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;

  // Filter & Pagination state
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalCount = 0;
  final int _limit = 15;

  String? _selectedCategoryId;
  String _activeFilterChip = 'all'; // 'all', 'published', 'draft', 'low_stock', 'out_of_stock'
  String _selectedSort = 'newest';

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final list = await _repo.getCategories(includeInactive: false);
      setState(() => _categories = list);
    } catch (_) {}
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      String? isPublishedParam;
      if (_activeFilterChip == 'published') isPublishedParam = 'true';
      if (_activeFilterChip == 'draft') isPublishedParam = 'false';

      String? inStockParam;
      if (_activeFilterChip == 'low_stock' || _activeFilterChip == 'out_of_stock') {
        // Will handle or filter
      }

      final res = await _repo.getProducts(
        page: _currentPage,
        limit: _limit,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        categoryId: _selectedCategoryId,
        isPublished: isPublishedParam,
        inStock: inStockParam,
        sort: _selectedSort,
      );

      var items = res['items'] as List<ProductModel>;
      if (_activeFilterChip == 'low_stock') {
        items = items.where((p) => p.isLowStock).toList();
      } else if (_activeFilterChip == 'out_of_stock') {
        items = items.where((p) => !p.inStock).toList();
      }

      setState(() {
        _products = items;
        _totalCount = res['total'] as int;
        _totalPages = res['totalPages'] as int;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load products: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _togglePublish(ProductModel product, bool newStatus) async {
    try {
      await _repo.togglePublish(product.id, newStatus);
      setState(() {
        final idx = _products.indexWhere((p) => p.id == product.id);
        if (idx != -1) {
          final cur = _products[idx];
          _products[idx] = ProductModel(
            id: cur.id,
            name: cur.name,
            slug: cur.slug,
            categoryId: cur.categoryId,
            categoryName: cur.categoryName,
            subcategoryId: cur.subcategoryId,
            subcategoryName: cur.subcategoryName,
            brand: cur.brand,
            sku: cur.sku,
            barcode: cur.barcode,
            unit: cur.unit,
            packSize: cur.packSize,
            mrp: cur.mrp,
            sellingPrice: cur.sellingPrice,
            discountPercentage: cur.discountPercentage,
            stockQuantity: cur.stockQuantity,
            lowStockThreshold: cur.lowStockThreshold,
            isAvailable: cur.isAvailable,
            isPublished: newStatus,
            isFeatured: cur.isFeatured,
            isNewArrival: cur.isNewArrival,
            isBestseller: cur.isBestseller,
            imageUrl: cur.imageUrl,
            images: cur.images,
            tags: cur.tags,
            description: cur.description,
          );
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${product.name} is now ${newStatus ? 'published' : 'unpublished'}'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _deleteProduct(ProductModel product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete "${product.name}"?'),
        content: const Text(
          'This will permanently remove the product and clean up its Cloudinary assets. This action cannot be undone.',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _repo.deleteProduct(product.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product deleted successfully'), backgroundColor: AppColors.primary),
        );
        _loadProducts();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Store Inventory & Products'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Product'),
        onPressed: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => const AdminProductEditScreen()),
          );
          if (changed == true) _loadProducts();
        },
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(AppDimensions.md),
            child: Column(
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by title, brand, SKU or barcode...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _loadProducts();
                            },
                          )
                        : null,
                  ),
                  onSubmitted: (_) {
                    _currentPage = 1;
                    _loadProducts();
                  },
                ),
                const SizedBox(height: AppDimensions.sm),

                // Category & Sort row
                Row(
                  children: [
                    // Category dropdown
                    Expanded(
                      child: DropdownButtonFormField<String?>(
                        initialValue: _selectedCategoryId,
                        isDense: true,
                        decoration: const InputDecoration(
                          labelText: 'Category',
                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        items: [
                          const DropdownMenuItem<String?>(
                            value: null,
                            child: Text('All Categories', style: TextStyle(fontSize: 12)),
                          ),
                          ..._categories.map((c) => DropdownMenuItem<String?>(
                                value: c.id,
                                child: Text(c.name, style: const TextStyle(fontSize: 12)),
                              )),
                        ],
                        onChanged: (val) {
                          setState(() {
                            _selectedCategoryId = val;
                            _currentPage = 1;
                          });
                          _loadProducts();
                        },
                      ),
                    ),
                    const SizedBox(width: AppDimensions.sm),

                    // Sort dropdown
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedSort,
                        isDense: true,
                        decoration: const InputDecoration(
                          labelText: 'Sort By',
                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'newest', child: Text('Newest First', style: TextStyle(fontSize: 12))),
                          DropdownMenuItem(value: 'price_asc', child: Text('Price: Low to High', style: TextStyle(fontSize: 12))),
                          DropdownMenuItem(value: 'price_desc', child: Text('Price: High to Low', style: TextStyle(fontSize: 12))),
                          DropdownMenuItem(value: 'stock_asc', child: Text('Stock: Lowest First', style: TextStyle(fontSize: 12))),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedSort = val);
                            _loadProducts();
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppDimensions.xs),

                // Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All Items', 'all'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Published', 'published'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Drafts', 'draft'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Low Stock', 'low_stock'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Out of Stock', 'out_of_stock'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Count info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Showing ${_products.length} of $_totalCount products',
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                ),
                if (_totalPages > 1)
                  Text(
                    'Page $_currentPage / $_totalPages',
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
              ],
            ),
          ),

          // Product List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_errorMessage!, style: const TextStyle(color: AppColors.error)),
                            const SizedBox(height: 8),
                            ElevatedButton(onPressed: _loadProducts, child: const Text('Retry')),
                          ],
                        ),
                      )
                    : _products.isEmpty
                        ? const Center(child: Text('No products match your criteria.'))
                        : RefreshIndicator(
                            onRefresh: _loadProducts,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(AppDimensions.md),
                              itemCount: _products.length,
                              separatorBuilder: (context, index) => const SizedBox(height: AppDimensions.sm),
                              itemBuilder: (context, index) {
                                final product = _products[index];
                                return _buildProductAdminCard(product);
                              },
                            ),
                          ),
          ),

          // Pagination Controls Footer
          if (_totalPages > 1)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton.icon(
                    onPressed: _currentPage > 1
                        ? () {
                            setState(() => _currentPage--);
                            _loadProducts();
                          }
                        : null,
                    icon: const Icon(Icons.chevron_left, size: 18),
                    label: const Text('Previous'),
                  ),
                  Text('Page $_currentPage of $_totalPages', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  OutlinedButton.icon(
                    onPressed: _currentPage < _totalPages
                        ? () {
                            setState(() => _currentPage++);
                            _loadProducts();
                          }
                        : null,
                    icon: const Icon(Icons.chevron_right, size: 18),
                    label: const Text('Next'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _activeFilterChip == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500)),
      selected: isSelected,
      selectedColor: AppColors.primaryContainer,
      labelStyle: TextStyle(color: isSelected ? AppColors.onPrimaryContainer : AppColors.textPrimary),
      onSelected: (_) {
        setState(() {
          _activeFilterChip = value;
          _currentPage = 1;
        });
        _loadProducts();
      },
    );
  }

  Widget _buildProductAdminCard(ProductModel product) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
              ),
              clipBehavior: Clip.antiAlias,
              child: product.imageUrl.isNotEmpty
                  ? Image.network(
                      product.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.shopping_bag_outlined, color: AppColors.textTertiary),
                    )
                  : const Icon(Icons.shopping_bag_outlined, color: AppColors.textTertiary),
            ),
            const SizedBox(width: AppDimensions.md),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badges row
                  Row(
                    children: [
                      if (product.brand.isNotEmpty) ...[
                        Text(
                          product.brand.toUpperCase(),
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.accent),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: product.isPublished ? AppColors.primaryContainer : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          product.isPublished ? 'Published' : 'Draft',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: product.isPublished ? AppColors.onPrimaryContainer : AppColors.textSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      if (product.isLowStock)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.errorContainer,
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: const Text(
                            'Low Stock',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.error),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),

                  // Name
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                  const SizedBox(height: 2),

                  // Unit & SKU
                  Text(
                    '${product.categoryName} • ${product.packSize.isNotEmpty ? product.packSize : product.unit}${product.sku.isNotEmpty ? ' • SKU: ${product.sku}' : ''}',
                    style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 4),

                  // Pricing & Stock
                  Row(
                    children: [
                      Text(
                        CurrencyFormatter.format(product.sellingPrice),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.primary),
                      ),
                      if (product.mrp > product.sellingPrice) ...[
                        const SizedBox(width: 4),
                        Text(
                          CurrencyFormatter.format(product.mrp),
                          style: const TextStyle(fontSize: 10, decoration: TextDecoration.lineThrough, color: AppColors.textTertiary),
                        ),
                      ],
                      const Spacer(),
                      Text(
                        'Stock: ${product.stockQuantity}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: product.inStock ? AppColors.textPrimary : AppColors.error,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Actions Column
            Column(
              children: [
                Switch(
                  value: product.isPublished,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => _togglePublish(product, val),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      tooltip: 'Edit',
                      onPressed: () async {
                        final changed = await Navigator.of(context).push<bool>(
                          MaterialPageRoute(
                            builder: (_) => AdminProductEditScreen(productId: product.id),
                          ),
                        );
                        if (changed == true) _loadProducts();
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                      tooltip: 'Delete',
                      onPressed: () => _deleteProduct(product),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
