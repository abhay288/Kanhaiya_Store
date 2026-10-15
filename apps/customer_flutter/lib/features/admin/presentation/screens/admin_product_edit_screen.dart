import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../catalog/domain/models/category_model.dart';
import '../../../catalog/domain/models/product_model.dart';
import '../../../catalog/presentation/screens/product_detail_screen.dart';
import '../../data/admin_catalog_repository.dart';

class AdminProductEditScreen extends StatefulWidget {
  final String? productId;

  const AdminProductEditScreen({super.key, this.productId});

  @override
  State<AdminProductEditScreen> createState() => _AdminProductEditScreenState();
}

class _AdminProductEditScreenState extends State<AdminProductEditScreen> {
  final AdminCatalogRepository _repo = adminCatalogRepository;
  final _formKey = GlobalKey<FormState>();

  // Text Controllers
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _skuController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _packSizeController = TextEditingController();
  final _mrpController = TextEditingController();
  final _sellingPriceController = TextEditingController();
  final _stockController = TextEditingController(text: '0');
  final _lowStockThresholdController = TextEditingController(text: '5');
  final _descriptionController = TextEditingController();
  final _tagsController = TextEditingController();

  // State Variables
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingImage = false;

  List<CategoryModel> _allCategories = [];
  String? _selectedCategoryId;
  String? _selectedSubcategoryId;

  String _selectedUnit = 'piece';
  final List<String> _retailUnits = [
    'piece',
    'packet',
    'box',
    'bottle',
    'kg',
    'g',
    'l',
    'ml',
  ];

  bool _isAvailable = true;
  bool _isPublished = true;
  bool _isFeatured = false;
  bool _isNewArrival = false;
  bool _isBestseller = false;

  // Gallery of uploaded images
  List<ProductImageModel> _gallery = [];

  bool get _isEditing => widget.productId != null;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _skuController.dispose();
    _barcodeController.dispose();
    _packSizeController.dispose();
    _mrpController.dispose();
    _sellingPriceController.dispose();
    _stockController.dispose();
    _lowStockThresholdController.dispose();
    _descriptionController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    try {
      final categories = await _repo.getCategories(includeInactive: true);
      _allCategories = categories;

      if (_isEditing) {
        final product = await _repo.getProductById(widget.productId!);
        _nameController.text = product.name;
        _brandController.text = product.brand;
        _skuController.text = product.sku;
        _barcodeController.text = product.barcode;
        _packSizeController.text = product.packSize;
        _mrpController.text = product.mrp > 0 ? product.mrp.toString() : '';
        _sellingPriceController.text = product.sellingPrice.toString();
        _stockController.text = product.stockQuantity.toString();
        _lowStockThresholdController.text = product.lowStockThreshold.toString();
        _descriptionController.text = product.description;
        _tagsController.text = product.tags.join(', ');

        _selectedCategoryId = product.categoryId.isNotEmpty ? product.categoryId : null;
        _selectedSubcategoryId = product.subcategoryId;
        if (_retailUnits.contains(product.unit)) {
          _selectedUnit = product.unit;
        }

        _isAvailable = product.isAvailable;
        _isPublished = product.isPublished;
        _isFeatured = product.isFeatured;
        _isNewArrival = product.isNewArrival;
        _isBestseller = product.isBestseller;

        _gallery = List.from(product.images);
      } else if (_allCategories.isNotEmpty) {
        _selectedCategoryId = _allCategories.first.id;
      }

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load initial data: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  List<CategoryModel> get _subcategories =>
      _allCategories.where((c) => c.parentId != null && c.parentId == _selectedCategoryId).toList();

  static const int maxProductPhotos = 3;

  Future<void> _showAddPhotoOptions() async {
    if (_gallery.length >= maxProductPhotos) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Maximum 3 product photos allowed. Delete an existing photo to upload a new one.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        final remaining = maxProductPhotos - _gallery.length;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Add Product Photo',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_gallery.length}/$maxProductPhotos Uploaded',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Upload up to $remaining more photo${remaining > 1 ? 's' : ''} for customer product listing.',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.primaryContainer,
                    child: Icon(Icons.photo_library_outlined, color: AppColors.primary),
                  ),
                  title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: Text('Select up to $remaining photo${remaining > 1 ? 's' : ''} from device storage', style: const TextStyle(fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickFromGallery(remaining);
                  },
                ),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.primaryContainer,
                    child: Icon(Icons.camera_alt_outlined, color: AppColors.primary),
                  ),
                  title: const Text('Take Photo with Camera', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: const Text('Capture direct photo of Kirana grocery item', style: TextStyle(fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickFromCamera();
                  },
                ),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.surfaceVariant,
                    child: Icon(Icons.link_outlined, color: AppColors.textPrimary),
                  ),
                  title: const Text('Enter Image URL', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: const Text('Paste direct image link from Cloudinary or web', style: TextStyle(fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _enterImageUrlDialog();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickFromGallery(int maxFiles) async {
    try {
      final picker = ImagePicker();
      final pickedFiles = await picker.pickMultiImage(
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (pickedFiles.isEmpty) return;

      final filesToUpload = pickedFiles.take(maxFiles).toList();
      setState(() => _isUploadingImage = true);

      for (final file in filesToUpload) {
        final bytes = await file.readAsBytes();
        final uploaded = await _repo.uploadImageBytes(
          bytes,
          file.name,
          folder: 'kanhaiya_store/products',
        );

        final newImg = ProductImageModel(
          url: uploaded['url'] as String? ?? '',
          publicId: uploaded['publicId'] as String? ?? '',
          isPrimary: _gallery.isEmpty,
          sortOrder: _gallery.length,
        );

        setState(() {
          _gallery.add(newImg);
        });
      }

      setState(() => _isUploadingImage = false);
    } catch (e) {
      setState(() => _isUploadingImage = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gallery upload failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _pickFromCamera() async {
    try {
      final picker = ImagePicker();
      final photo = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (photo == null) return;

      setState(() => _isUploadingImage = true);
      final bytes = await photo.readAsBytes();
      final uploaded = await _repo.uploadImageBytes(
        bytes,
        photo.name,
        folder: 'kanhaiya_store/products',
      );

      final newImg = ProductImageModel(
        url: uploaded['url'] as String? ?? '',
        publicId: uploaded['publicId'] as String? ?? '',
        isPrimary: _gallery.isEmpty,
        sortOrder: _gallery.length,
      );

      setState(() {
        _gallery.add(newImg);
        _isUploadingImage = false;
      });
    } catch (e) {
      setState(() => _isUploadingImage = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Camera upload failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  void _enterImageUrlDialog() {
    final urlCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Image by URL', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: TextField(
          controller: urlCtrl,
          decoration: const InputDecoration(
            labelText: 'Image HTTPS URL',
            hintText: 'https://res.cloudinary.com/...',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final raw = urlCtrl.text.trim();
              if (raw.isNotEmpty && (raw.startsWith('http://') || raw.startsWith('https://'))) {
                setState(() {
                  _gallery.add(ProductImageModel(
                    url: raw,
                    publicId: 'custom_url_${DateTime.now().millisecondsSinceEpoch}',
                    isPrimary: _gallery.isEmpty,
                    sortOrder: _gallery.length,
                  ));
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add Photo'),
          ),
        ],
      ),
    );
  }

  void _setPrimaryImage(int index) {
    setState(() {
      for (int i = 0; i < _gallery.length; i++) {
        final img = _gallery[i];
        _gallery[i] = ProductImageModel(
          url: img.url,
          publicId: img.publicId,
          isPrimary: i == index,
          sortOrder: img.sortOrder,
        );
      }
    });
  }

  void _moveImage(int from, int to) {
    if (to < 0 || to >= _gallery.length) return;
    setState(() {
      final item = _gallery.removeAt(from);
      _gallery.insert(to, item);
      // update sortOrders
      for (int i = 0; i < _gallery.length; i++) {
        final current = _gallery[i];
        _gallery[i] = ProductImageModel(
          url: current.url,
          publicId: current.publicId,
          isPrimary: current.isPrimary,
          sortOrder: i,
        );
      }
    });
  }

  void _removeImage(int index) {
    setState(() {
      final wasPrimary = _gallery[index].isPrimary;
      _gallery.removeAt(index);
      if (wasPrimary && _gallery.isNotEmpty) {
        _gallery[0] = ProductImageModel(
          url: _gallery[0].url,
          publicId: _gallery[0].publicId,
          isPrimary: true,
          sortOrder: _gallery[0].sortOrder,
        );
      }
    });
  }

  void _showProductPreviewModal() {
    final mrpVal = double.tryParse(_mrpController.text.trim()) ?? 0.0;
    final sellingPriceVal = double.tryParse(_sellingPriceController.text.trim()) ?? 0.0;
    final stockVal = int.tryParse(_stockController.text.trim()) ?? 0;
    final primaryImgUrl = _gallery.where((img) => img.isPrimary).firstOrNull?.url ??
        (_gallery.isNotEmpty ? _gallery.first.url : '');

    final categoryName = _allCategories.firstWhere(
      (c) => c.id == _selectedCategoryId,
      orElse: () => const CategoryModel(id: '', name: 'Grocery', slug: '', icon: '', itemCount: 0),
    ).name;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.all(AppDimensions.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppDimensions.md),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.visibility_outlined, color: AppColors.primary, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Live Customer Preview',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                ],
              ),
              const Divider(height: 24),

              // Preview Card
              Center(
                child: Container(
                  width: 320,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    border: Border.all(color: AppColors.border),
                    boxShadow: const [
                      BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Image
                      Container(
                        height: 180,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusMd)),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: primaryImgUrl.isNotEmpty
                            ? Image.network(primaryImgUrl, fit: BoxFit.cover)
                            : const Center(
                                child: Icon(Icons.shopping_bag_outlined, color: AppColors.textTertiary, size: 60),
                              ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(AppDimensions.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_brandController.text.trim().isNotEmpty) ...[
                              Text(
                                _brandController.text.trim().toUpperCase(),
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.accent),
                              ),
                              const SizedBox(height: 2),
                            ],
                            Text(
                              _nameController.text.trim().isEmpty ? 'Product Title Preview' : _nameController.text.trim(),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Category: $categoryName • Unit: ${_packSizeController.text.trim().isNotEmpty ? _packSizeController.text.trim() : _selectedUnit}',
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Text(
                                  CurrencyFormatter.format(sellingPriceVal),
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary),
                                ),
                                if (mrpVal > sellingPriceVal) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    CurrencyFormatter.format(mrpVal),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      decoration: TextDecoration.lineThrough,
                                      color: AppColors.textTertiary,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.accentContainer,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '${(((mrpVal - sellingPriceVal) / mrpVal) * 100).round()}% OFF',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.onAccentContainer,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              stockVal > 0 ? 'In Stock ($stockVal units available)' : 'Out of Stock',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: stockVal > 0 ? AppColors.primary : AppColors.error,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.lg),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Back to Editing'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedCategoryId == null || _selectedCategoryId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a category')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final tags = _tagsController.text
          .split(',')
          .map((t) => t.trim())
          .where((t) => t.isNotEmpty)
          .toList();

      final mrp = double.tryParse(_mrpController.text.trim()) ?? 0.0;
      final sellingPrice = double.parse(_sellingPriceController.text.trim());
      final stockQuantity = int.parse(_stockController.text.trim());
      final lowStockThreshold = int.tryParse(_lowStockThresholdController.text.trim()) ?? 5;

      final payload = <String, dynamic>{
        'name': _nameController.text.trim(),
        'brand': _brandController.text.trim(),
        if (_skuController.text.trim().isNotEmpty) 'sku': _skuController.text.trim(),
        'barcode': _barcodeController.text.trim(),
        'categoryId': _selectedCategoryId,
        'subcategoryId': _selectedSubcategoryId,
        'unit': _selectedUnit,
        'packSize': _packSizeController.text.trim(),
        'mrp': mrp,
        'sellingPrice': sellingPrice,
        'stockQuantity': stockQuantity,
        'lowStockThreshold': lowStockThreshold,
        'isAvailable': _isAvailable,
        'isPublished': _isPublished,
        'isFeatured': _isFeatured,
        'isNewArrival': _isNewArrival,
        'isBestseller': _isBestseller,
        'description': _descriptionController.text.trim(),
        'tags': tags,
        'images': _gallery.map((img) => img.toJson()).toList(),
      };

      ProductModel savedProduct;
      if (_isEditing) {
        savedProduct = await _repo.updateProduct(widget.productId!, payload);
      } else {
        savedProduct = await _repo.createProduct(payload);
      }

      if (mounted) {
        setState(() => _isSaving = false);
        if (_isEditing) {
          final targetId = savedProduct.id;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Product updated successfully & refreshed across store!'),
              backgroundColor: AppColors.primary,
              action: SnackBarAction(
                label: 'View Page',
                textColor: Colors.white,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(productId: targetId),
                    ),
                  );
                },
              ),
            ),
          );
          Navigator.of(context).pop(true);
        } else {
          await _showProductCreatedSuccessModal(savedProduct);
          if (mounted) {
            Navigator.of(context).pop(true);
          }
        }
      }
    } catch (e) {
      setState(() => _isSaving = false);
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Save Failed', style: TextStyle(color: AppColors.error)),
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

  Future<void> _showProductCreatedSuccessModal(ProductModel product) async {
    final liveUrl = 'https://kanhaiyastore.com/product/${product.id}';
    final primaryImg = product.imageUrl;

    await showModalBottomSheet<void>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Celebration Icon & Title
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.check_circle_rounded,
                        color: AppColors.primary,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Live Product Page Created!',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Immediately live across customer catalog & search.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Product Preview Mini-Card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: primaryImg.isNotEmpty
                            ? Image.network(
                                primaryImg,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => const Icon(
                                  Icons.shopping_bag_outlined,
                                  color: AppColors.textTertiary,
                                ),
                              )
                            : const Icon(
                                Icons.shopping_bag_outlined,
                                color: AppColors.textTertiary,
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${product.categoryName} • ${product.packSize.isNotEmpty ? product.packSize : product.unit}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${CurrencyFormatter.format(product.sellingPrice)} • Stock: ${product.stockQuantity}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Shareable Link Row
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.link, size: 18, color: AppColors.textSecondary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          liveUrl,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.copy, size: 18, color: AppColors.primary),
                        tooltip: 'Copy Link',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () async {
                          await Clipboard.setData(ClipboardData(text: liveUrl));
                          if (ctx.mounted) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(
                                content: Text('Product link copied to clipboard!'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Primary Action: View Live Product Page
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    ),
                  ),
                  icon: const Icon(Icons.remove_red_eye_outlined, size: 20),
                  label: const Text(
                    'View Live Product Page',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ProductDetailScreen(productId: product.id),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // Secondary Action: Share Link
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    ),
                  ),
                  icon: const Icon(Icons.share_outlined, size: 18),
                  label: const Text('Copy & Share Product Link'),
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: liveUrl));
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(
                          content: Text('Product link copied to clipboard!'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                ),
                const SizedBox(height: 10),

                // Close / Done
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Done (Back to Inventory)'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Product' : 'Add New Product'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.remove_red_eye_outlined),
            tooltip: 'Live Preview',
            onPressed: _showProductPreviewModal,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section 1: Product Gallery
                    _buildSectionHeader('Product Photography (Cloudinary)', Icons.photo_library_outlined),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppDimensions.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Upload high-quality kirana product images. Click the star to select primary image. Use arrows to reorder.',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            if (_gallery.isNotEmpty) ...[
                              SizedBox(
                                height: 120,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _gallery.length,
                                  separatorBuilder: (context, index) => const SizedBox(width: 10),
                                  itemBuilder: (context, index) {
                                    final img = _gallery[index];
                                    return Stack(
                                      children: [
                                        Container(
                                          width: 110,
                                          height: 110,
                                          decoration: BoxDecoration(
                                            color: AppColors.surfaceVariant,
                                            borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                                            border: Border.all(
                                              color: img.isPrimary ? AppColors.primary : AppColors.border,
                                              width: img.isPrimary ? 2 : 1,
                                            ),
                                          ),
                                          clipBehavior: Clip.antiAlias,
                                          child: Image.network(
                                            img.url,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image),
                                          ),
                                        ),
                                        // Primary Star Icon
                                        Positioned(
                                          top: 4,
                                          left: 4,
                                          child: GestureDetector(
                                            onTap: () => _setPrimaryImage(index),
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: BoxDecoration(
                                                color: img.isPrimary ? AppColors.accent : Colors.black45,
                                                shape: BoxShape.circle,
                                              ),
                                              child: Icon(
                                                img.isPrimary ? Icons.star : Icons.star_border,
                                                size: 14,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                        // Delete Icon
                                        Positioned(
                                          top: 4,
                                          right: 4,
                                          child: GestureDetector(
                                            onTap: () => _removeImage(index),
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: const BoxDecoration(
                                                color: AppColors.error,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(
                                                Icons.close,
                                                size: 12,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                        // Move controls
                                        Positioned(
                                          bottom: 4,
                                          left: 4,
                                          right: 4,
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              if (index > 0)
                                                GestureDetector(
                                                  onTap: () => _moveImage(index, index - 1),
                                                  child: Container(
                                                    padding: const EdgeInsets.all(2),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black54,
                                                      borderRadius: BorderRadius.circular(3),
                                                    ),
                                                    child: const Icon(Icons.arrow_back, size: 14, color: Colors.white),
                                                  ),
                                                )
                                              else
                                                const SizedBox(width: 18),
                                              if (index < _gallery.length - 1)
                                                GestureDetector(
                                                  onTap: () => _moveImage(index, index + 1),
                                                  child: Container(
                                                    padding: const EdgeInsets.all(2),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black54,
                                                      borderRadius: BorderRadius.circular(3),
                                                    ),
                                                    child: const Icon(Icons.arrow_forward, size: 14, color: Colors.white),
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: AppDimensions.sm),
                            ],

                            // Add image button with 3-photo status
                            OutlinedButton.icon(
                              onPressed: _isUploadingImage || _gallery.length >= maxProductPhotos
                                  ? null
                                  : _showAddPhotoOptions,
                              icon: _isUploadingImage
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.add_photo_alternate_outlined, size: 18),
                              label: Text(
                                _isUploadingImage
                                    ? 'Uploading to Cloudinary...'
                                    : _gallery.length >= maxProductPhotos
                                        ? 'Maximum 3 Photos Added'
                                        : 'Add Photo (${_gallery.length}/3)',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppDimensions.lg),

                    // Section 2: Basic Information
                    _buildSectionHeader('Basic Details', Icons.info_outline),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppDimensions.md),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: 'Product Name *',
                                hintText: 'e.g. Aashirvaad Shudh Chakki Atta',
                              ),
                              validator: (val) =>
                                  val == null || val.trim().isEmpty ? 'Product name is required' : null,
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _brandController,
                                    decoration: const InputDecoration(
                                      labelText: 'Brand',
                                      hintText: 'e.g. Aashirvaad, Tata, Fortune',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: AppDimensions.sm),
                                Expanded(
                                  child: TextFormField(
                                    controller: _skuController,
                                    decoration: const InputDecoration(
                                      labelText: 'SKU (Optional)',
                                      hintText: 'Unique SKU code',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            Row(
                              children: [
                                // Category
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    initialValue: _allCategories.any((c) => c.id == _selectedCategoryId)
                                        ? _selectedCategoryId
                                        : (_allCategories.isNotEmpty ? _allCategories.first.id : null),
                                    decoration: const InputDecoration(labelText: 'Category *'),
                                    items: _allCategories.map((c) {
                                      final parent = c.parentId != null
                                          ? _allCategories.where((p) => p.id == c.parentId).firstOrNull
                                          : null;
                                      final displayName = parent != null ? '${c.name} (${parent.name})' : c.name;
                                      return DropdownMenuItem<String>(
                                        value: c.id,
                                        child: Text(displayName, overflow: TextOverflow.ellipsis),
                                      );
                                    }).toList(),
                                    onChanged: (val) {
                                      setState(() {
                                        _selectedCategoryId = val;
                                        _selectedSubcategoryId = null; // reset subcategory
                                      });
                                    },
                                    validator: (val) => val == null ? 'Please select a category' : null,
                                  ),
                                ),
                                const SizedBox(width: AppDimensions.sm),

                                // Subcategory (cascading)
                                Expanded(
                                  child: DropdownButtonFormField<String?>(
                                    initialValue: _selectedSubcategoryId,
                                    decoration: const InputDecoration(labelText: 'Subcategory (Optional)'),
                                    items: [
                                      const DropdownMenuItem<String?>(
                                        value: null,
                                        child: Text('None'),
                                      ),
                                      ..._subcategories.map((sub) {
                                        return DropdownMenuItem<String?>(
                                          value: sub.id,
                                          child: Text(sub.name, overflow: TextOverflow.ellipsis),
                                        );
                                      }),
                                    ],
                                    onChanged: (val) {
                                      setState(() {
                                        _selectedSubcategoryId = val;
                                      });
                                    },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            TextFormField(
                              controller: _descriptionController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Description',
                                hintText: 'Ingredient notes, packaging highlights, origin...',
                              ),
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            TextFormField(
                              controller: _tagsController,
                              decoration: const InputDecoration(
                                labelText: 'Search Tags',
                                hintText: 'Comma separated e.g. atta, flour, chakki, wheat',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppDimensions.lg),

                    // Section 3: Retail Pricing & Inventory
                    _buildSectionHeader('Pricing & Retail Inventory', Icons.currency_rupee),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppDimensions.md),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                // Retail Unit Dropdown
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    initialValue: _selectedUnit,
                                    decoration: const InputDecoration(labelText: 'Retail Unit *'),
                                    items: _retailUnits.map((u) {
                                      return DropdownMenuItem<String>(
                                        value: u,
                                        child: Text(u),
                                      );
                                    }).toList(),
                                    onChanged: (val) {
                                      if (val != null) setState(() => _selectedUnit = val);
                                    },
                                  ),
                                ),
                                const SizedBox(width: AppDimensions.sm),

                                // Pack Size
                                Expanded(
                                  child: TextFormField(
                                    controller: _packSizeController,
                                    decoration: const InputDecoration(
                                      labelText: 'Pack Size',
                                      hintText: 'e.g. 5 kg, 500 g, 1 L',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            Row(
                              children: [
                                // Selling Price
                                Expanded(
                                  child: TextFormField(
                                    controller: _sellingPriceController,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    decoration: const InputDecoration(
                                      labelText: 'Selling Price (₹) *',
                                      prefixText: '₹ ',
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) return 'Selling price required';
                                      final num = double.tryParse(val.trim());
                                      if (num == null || num < 0) return 'Invalid price';
                                      return null;
                                    },
                                  ),
                                ),
                                const SizedBox(width: AppDimensions.sm),

                                // MRP
                                Expanded(
                                  child: TextFormField(
                                    controller: _mrpController,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    decoration: const InputDecoration(
                                      labelText: 'MRP (₹)',
                                      prefixText: '₹ ',
                                      hintText: 'Optional',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppDimensions.sm),

                            Row(
                              children: [
                                // Stock Quantity
                                Expanded(
                                  child: TextFormField(
                                    controller: _stockController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Stock Units *',
                                      hintText: 'Available count',
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) return 'Stock required';
                                      final num = int.tryParse(val.trim());
                                      if (num == null || num < 0) return 'Must be >= 0';
                                      return null;
                                    },
                                  ),
                                ),
                                const SizedBox(width: AppDimensions.sm),

                                // Low Stock Threshold
                                Expanded(
                                  child: TextFormField(
                                    controller: _lowStockThresholdController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Low Stock Alert',
                                      hintText: 'e.g. 5',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppDimensions.lg),

                    // Section 4: Merchandising & Visibility
                    _buildSectionHeader('Visibility & Badges', Icons.campaign_outlined),
                    Card(
                      child: Column(
                        children: [
                          SwitchListTile(
                            title: Row(
                              children: [
                                const Text('Store LIVE Status', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _isPublished ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(
                                      color: _isPublished ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1),
                                    ),
                                  ),
                                  child: Text(
                                    _isPublished ? '🟢 LIVE' : '⚪ UNLIVE',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: _isPublished ? const Color(0xFF15803D) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Text(
                              _isPublished
                                  ? 'LIVE: Visible to customers and available for purchase'
                                  : 'UNLIVE: Hidden from customer catalog and search',
                              style: const TextStyle(fontSize: 11),
                            ),
                            value: _isPublished,
                            activeThumbColor: const Color(0xFF16A34A),
                            activeTrackColor: const Color(0xFFBBF7D0),
                            onChanged: (val) => setState(() => _isPublished = val),
                          ),
                          const Divider(height: 1),
                          SwitchListTile(
                            title: const Text('Available for Purchase', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            subtitle: const Text('Can be added to customer carts', style: TextStyle(fontSize: 11)),
                            value: _isAvailable,
                            activeThumbColor: AppColors.primary,
                            onChanged: (val) => setState(() => _isAvailable = val),
                          ),
                          const Divider(height: 1),
                          SwitchListTile(
                            title: const Text('Featured Product', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            subtitle: const Text('Highlighted in home carousel', style: TextStyle(fontSize: 11)),
                            value: _isFeatured,
                            activeThumbColor: AppColors.accent,
                            onChanged: (val) => setState(() => _isFeatured = val),
                          ),
                          const Divider(height: 1),
                          SwitchListTile(
                            title: const Text('Bestseller', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            value: _isBestseller,
                            activeThumbColor: AppColors.accent,
                            onChanged: (val) => setState(() => _isBestseller = val),
                          ),
                          const Divider(height: 1),
                          SwitchListTile(
                            title: const Text('New Arrival', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            value: _isNewArrival,
                            activeThumbColor: AppColors.accent,
                            onChanged: (val) => setState(() => _isNewArrival = val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppDimensions.xl),

                    // Save Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _showProductPreviewModal,
                            icon: const Icon(Icons.remove_red_eye_outlined),
                            label: const Text('Preview'),
                          ),
                        ),
                        const SizedBox(width: AppDimensions.md),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: _isSaving ? null : _saveProduct,
                            icon: _isSaving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.save_outlined),
                            label: Text(_isSaving ? 'Saving...' : _isEditing ? 'Save Changes' : 'Create Product'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: AppDimensions.xs),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textPrimary),
          ),
        ],
      ),
    );
  }
}
