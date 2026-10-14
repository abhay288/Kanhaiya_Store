import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../../catalog/domain/models/category_model.dart';
import '../../data/admin_catalog_repository.dart';

class AdminCategoriesScreen extends StatefulWidget {
  const AdminCategoriesScreen({super.key});

  @override
  State<AdminCategoriesScreen> createState() => _AdminCategoriesScreenState();
}

class _AdminCategoriesScreenState extends State<AdminCategoriesScreen> {
  final AdminCatalogRepository _repo = adminCatalogRepository;
  final TextEditingController _searchController = TextEditingController();

  List<CategoryModel> _categories = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = await _repo.getCategories(
        includeInactive: true,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
      );
      setState(() {
        _categories = items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = ApiErrorHandler.getMessage(e);
        _isLoading = false;
      });
    }
  }

  Future<void> _showCategoryDialog({CategoryModel? existing}) async {
    final isEditing = existing != null;
    final nameController = TextEditingController(text: existing?.name ?? '');
    final slugController = TextEditingController(text: existing?.slug ?? '');
    final descController = TextEditingController(text: existing?.description ?? '');
    final orderController = TextEditingController(text: (existing?.displayOrder ?? 0).toString());

    bool isActive = existing?.isActive ?? true;
    String? selectedParentId = existing?.parentId;
    String imageUrl = existing?.imageUrl ?? '';
    String imagePublicId = existing?.imagePublicId ?? '';
    bool isUploadingImage = false;
    bool isSubmitting = false;

    // Filter available parents to top-level categories that aren't the current category itself
    final potentialParents = _categories.where((c) => c.parentId == null && c.id != existing?.id).toList();

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> pickAndUploadImage() async {
              try {
                final picker = ImagePicker();
                final picked = await picker.pickImage(
                  source: ImageSource.gallery,
                  maxWidth: 1200,
                  maxHeight: 1200,
                  imageQuality: 85,
                );

                if (picked == null) return;

                setDialogState(() {
                  isUploadingImage = true;
                });

                final bytes = await picked.readAsBytes();
                final uploaded = await _repo.uploadImageBytes(
                  bytes,
                  picked.name,
                  folder: 'kanhaiya_store/categories',
                );

                setDialogState(() {
                  imageUrl = uploaded['url'] as String? ?? '';
                  imagePublicId = uploaded['publicId'] as String? ?? '';
                  isUploadingImage = false;
                });
              } catch (err) {
                setDialogState(() {
                  isUploadingImage = false;
                });
                if (dialogCtx.mounted) {
                  ScaffoldMessenger.of(dialogCtx).showSnackBar(
                    SnackBar(
                      content: Text('Image upload failed: $err'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            }

            return AlertDialog(
              backgroundColor: Colors.white,
              title: Text(
                isEditing ? 'Edit Category' : 'Create Category',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
              ),
              content: SizedBox(
                width: 480,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category Image Preview & Upload
                      Center(
                        child: Column(
                          children: [
                            Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                color: AppColors.surfaceVariant,
                                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                                border: Border.all(color: AppColors.border),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: isUploadingImage
                                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                                  : imageUrl.isNotEmpty
                                      ? Image.network(
                                          imageUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) => const Icon(
                                            Icons.broken_image,
                                            color: AppColors.textTertiary,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.add_photo_alternate_outlined,
                                          size: 40,
                                          color: AppColors.textTertiary,
                                        ),
                            ),
                            const SizedBox(height: 6),
                            TextButton.icon(
                              onPressed: isUploadingImage ? null : pickAndUploadImage,
                              icon: const Icon(Icons.cloud_upload_outlined, size: 16),
                              label: Text(
                                imageUrl.isNotEmpty ? 'Change Image' : 'Upload Image',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppDimensions.md),

                      // Name
                      TextField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Category Name *',
                          hintText: 'e.g. Atta, Rice & Dal',
                        ),
                      ),
                      const SizedBox(height: AppDimensions.sm),

                      // Slug (optional override)
                      TextField(
                        controller: slugController,
                        decoration: const InputDecoration(
                          labelText: 'Slug (optional)',
                          hintText: 'Auto-generated if empty',
                        ),
                      ),
                      const SizedBox(height: AppDimensions.sm),

                      // Parent Category (for subcategories)
                      DropdownButtonFormField<String?>(
                        initialValue: selectedParentId,
                        decoration: const InputDecoration(
                          labelText: 'Parent Category (optional)',
                        ),
                        items: [
                          const DropdownMenuItem<String?>(
                            value: null,
                            child: Text('None (Top-Level Category)'),
                          ),
                          ...potentialParents.map((parent) => DropdownMenuItem<String?>(
                                value: parent.id,
                                child: Text(parent.name),
                              )),
                        ],
                        onChanged: (val) {
                          setDialogState(() {
                            selectedParentId = val;
                          });
                        },
                      ),
                      const SizedBox(height: AppDimensions.sm),

                      // Description
                      TextField(
                        controller: descController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          hintText: 'Short notes about items in this kirana section',
                        ),
                      ),
                      const SizedBox(height: AppDimensions.sm),

                      // Display Order
                      TextField(
                        controller: orderController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Display Order',
                          hintText: 'Priority number (lower appears first)',
                        ),
                      ),
                      const SizedBox(height: AppDimensions.sm),

                      // Active toggle
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Active Category', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        subtitle: const Text('Visible to customers in the catalog', style: TextStyle(fontSize: 11)),
                        value: isActive,
                        activeThumbColor: AppColors.primary,
                        onChanged: (val) {
                          setDialogState(() {
                            isActive = val;
                          });
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final name = nameController.text.trim();
                          if (name.isEmpty) {
                            ScaffoldMessenger.of(dialogCtx).showSnackBar(
                              const SnackBar(content: Text('Please enter category name')),
                            );
                            return;
                          }

                          setDialogState(() => isSubmitting = true);

                          final payload = <String, dynamic>{
                            'name': name,
                            if (slugController.text.trim().isNotEmpty) 'slug': slugController.text.trim(),
                            'description': descController.text.trim(),
                            'displayOrder': int.tryParse(orderController.text.trim()) ?? 0,
                            'isActive': isActive,
                            'parentId': selectedParentId,
                            if (imageUrl.isNotEmpty) 'imageUrl': imageUrl,
                            if (imagePublicId.isNotEmpty) 'imagePublicId': imagePublicId,
                          };

                          try {
                            if (isEditing) {
                              await _repo.updateCategory(existing.id, payload);
                            } else {
                              await _repo.createCategory(payload);
                            }

                            if (dialogCtx.mounted) {
                              Navigator.of(dialogCtx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    isEditing ? 'Category updated successfully' : 'Category created successfully',
                                  ),
                                  backgroundColor: AppColors.primary,
                                ),
                              );
                              _loadCategories();
                            }
                          } catch (err) {
                            setDialogState(() => isSubmitting = false);
                            if (dialogCtx.mounted) {
                              ScaffoldMessenger.of(dialogCtx).showSnackBar(
                                SnackBar(
                                  content: Text('Error: $err'),
                                  backgroundColor: AppColors.error,
                                ),
                              );
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(isEditing ? 'Save Changes' : 'Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _confirmDeleteCategory(CategoryModel category) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete "${category.name}"?'),
        content: Text(
          'Are you sure you want to delete this category? If any products or subcategories depend on it, deletion will be safely rejected.',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _repo.deleteCategory(category.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Category deleted successfully'),
            backgroundColor: AppColors.primary,
          ),
        );
        _loadCategories();
      }
    } catch (e) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Cannot Delete Category', style: TextStyle(color: AppColors.error)),
            content: Text(ApiErrorHandler.getMessage(e)),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Manage Categories'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Category'),
        onPressed: () => _showCategoryDialog(),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(AppDimensions.md),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search categories...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _loadCategories();
                        },
                      )
                    : null,
              ),
              onSubmitted: (_) => _loadCategories(),
            ),
          ),

          // Categories List
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
                            ElevatedButton(
                              onPressed: _loadCategories,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _categories.isEmpty
                        ? const Center(child: Text('No categories found. Click + to create one.'))
                        : RefreshIndicator(
                            onRefresh: _loadCategories,
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppDimensions.md,
                                vertical: AppDimensions.sm,
                              ),
                              itemCount: _categories.length,
                              separatorBuilder: (context, index) => const SizedBox(height: AppDimensions.sm),
                              itemBuilder: (context, index) {
                                final cat = _categories[index];
                                final isSubcategory = cat.parentId != null;

                                return Card(
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                                    side: const BorderSide(color: AppColors.border),
                                  ),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: AppDimensions.md,
                                      vertical: 6,
                                    ),
                                    leading: Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: AppColors.surfaceVariant,
                                        borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                                      ),
                                      clipBehavior: Clip.antiAlias,
                                      child: cat.imageUrl.isNotEmpty
                                          ? Image.network(
                                              cat.imageUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) => Icon(
                                                cat.iconData,
                                                color: AppColors.primary,
                                              ),
                                            )
                                          : Icon(
                                              cat.iconData,
                                              color: AppColors.primary,
                                            ),
                                    ),
                                    title: Row(
                                      children: [
                                        if (isSubcategory) ...[
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                            margin: const EdgeInsets.only(right: 6),
                                            decoration: BoxDecoration(
                                              color: AppColors.accentContainer,
                                              borderRadius: BorderRadius.circular(3),
                                            ),
                                            child: const Text(
                                              'Sub',
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.onAccentContainer,
                                              ),
                                            ),
                                          ),
                                        ],
                                        Expanded(
                                          child: Text(
                                            cat.name,
                                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                          ),
                                        ),
                                      ],
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 2),
                                        Text(
                                          'slug: ${cat.slug} • Order: ${cat.displayOrder}',
                                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                              decoration: BoxDecoration(
                                                color: cat.isActive
                                                    ? AppColors.primaryContainer
                                                    : const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                cat.isActive ? 'Active' : 'Inactive',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w600,
                                                  color: cat.isActive
                                                      ? AppColors.onPrimaryContainer
                                                      : AppColors.textSecondary,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '${cat.itemCount} items',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.edit_outlined, size: 20),
                                          onPressed: () => _showCategoryDialog(existing: cat),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.error),
                                          onPressed: () => _confirmDeleteCategory(cat),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
