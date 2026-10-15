import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../../data/repositories/checkout_repository.dart';
import '../../domain/models/store_settings_model.dart';
import 'order_confirmation_screen.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  // Fulfillment & Payment (Local Delivery disabled; Store Pickup only)
  String _fulfillmentMethod = 'PICKUP';
  String _selectedPayment = 'COD';
  bool _isSubmitting = false;

  // Form Fields
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  final _houseController = TextEditingController(text: 'Ground Floor');
  final _streetController = TextEditingController(text: 'Fatehpur Roshnai, Sarvankhera');
  final _landmarkController = TextEditingController(text: 'Near Kanhaiya Store');
  final _cityController = TextEditingController(text: 'Kanpur Dehat');
  final _stateController = TextEditingController(text: 'Uttar Pradesh');
  final _pinController = TextEditingController(text: '209304');
  final _instructionsController = TextEditingController();

  // Settings & Serviceability
  StoreSettingsModel _settings = StoreSettingsModel.defaultSettings;
  ServiceabilityResultModel? _serviceability;
  bool _isCheckingPin = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final authUser = ref.read(authProvider).user;
    
    String initialPhone = '';
    if (authUser?.phoneNumber != null && authUser!.phoneNumber!.isNotEmpty) {
      final digits = authUser.phoneNumber!.replaceAll(RegExp(r'\D'), '');
      initialPhone = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
    }

    String initialName = '';
    if (authUser != null && authUser.displayName.isNotEmpty && authUser.displayName != 'Valued Customer') {
      initialName = authUser.displayName;
    }

    _nameController = TextEditingController(text: initialName);
    _phoneController = TextEditingController(text: initialPhone);

    _loadSettingsAndCheckPin();
    _loadSavedCheckoutPhone();
  }

  Future<void> _loadSavedCheckoutPhone() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedPhone = prefs.getString('saved_checkout_phone');
      final savedName = prefs.getString('saved_checkout_name');

      if (mounted) {
        if (_phoneController.text.trim().isEmpty && savedPhone != null && savedPhone.isNotEmpty) {
          setState(() {
            _phoneController.text = savedPhone;
          });
        }
        if (_nameController.text.trim().isEmpty && savedName != null && savedName.isNotEmpty) {
          setState(() {
            _nameController.text = savedName;
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _loadSettingsAndCheckPin() async {
    final repo = ref.read(checkoutRepositoryProvider);
    final settings = await repo.getStoreSettings();
    if (mounted) {
      setState(() {
        _settings = settings;
        _fulfillmentMethod = 'PICKUP';
        _selectedPayment = 'COD';
      });
      _validatePincode(_pinController.text);
    }
  }

  Future<void> _validatePincode(String pin) async {
    final cleanPin = pin.trim();
    if (cleanPin.length != 6) {
      setState(() => _serviceability = null);
      return;
    }

    setState(() => _isCheckingPin = true);
    final subtotal = ref.read(cartSubtotalProvider);
    final repo = ref.read(checkoutRepositoryProvider);
    final result = await repo.checkServiceability(cleanPin, subtotal: subtotal);

    if (mounted) {
      setState(() {
        _serviceability = result;
        _isCheckingPin = false;
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _houseController.dispose();
    _streetController.dispose();
    _landmarkController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pinController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<bool> _showLoginDialog(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);
    bool isLoading = false;
    String? localError;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 28,
            left: 20,
            right: 20,
            top: 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.lock_outline_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Sign in with Google',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Sign in to continue to checkout and track order',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (localError != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          localError!,
                          style: TextStyle(color: Colors.red.shade700, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 22),

              // Google Sign-In Button
              OutlinedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        setModalState(() {
                          isLoading = true;
                          localError = null;
                        });
                        try {
                          final success = await ref.read(authProvider.notifier).signInWithGoogle();
                          if (success) {
                            if (ctx.mounted) {
                              Navigator.of(ctx).pop(true);
                            }
                            if (mounted) {
                              final authUser = ref.read(authProvider).user;
                              final name = authUser?.displayName ?? 'Valued Customer';
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text('Welcome, $name! Returning to cart.'),
                                  backgroundColor: AppColors.primary,
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                              // After login, come back to cart page as requested
                              router.go('/cart');
                            }
                          } else {
                            if (ctx.mounted) {
                              final authErr = ref.read(authProvider).errorMessage;
                              setModalState(() {
                                isLoading = false;
                                localError = authErr ?? 'Google sign-in was cancelled or failed. Please try again.';
                              });
                            }
                          }
                        } catch (e) {
                          if (ctx.mounted) {
                            setModalState(() {
                              isLoading = false;
                              localError = 'Sign-in error: $e';
                            });
                          }
                        }
                      },
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF3C4043),
                  side: const BorderSide(color: Color(0xFFDADCE0), width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0.5,
                ),
                child: isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'G',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                                color: Color(0xFF4285F4),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Sign in with Google',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF3C4043),
                            ),
                          ),
                        ],
                      ),
              ),

              // Fallback for tests/emulators if Google Play Services fails
              if (localError != null) ...[
                const SizedBox(height: 10),
                TextButton.icon(
                  onPressed: isLoading
                      ? null
                      : () async {
                          setModalState(() {
                            isLoading = true;
                            localError = null;
                          });
                          final success = await ref.read(authProvider.notifier).signInWithGoogleDemo();
                          if (success) {
                            if (ctx.mounted) Navigator.of(ctx).pop(true);
                            if (mounted) {
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('Signed in with Demo account! Returning to cart.'),
                                  backgroundColor: AppColors.primary,
                                ),
                              );
                              router.go('/cart');
                            }
                          } else {
                            if (ctx.mounted) {
                              setModalState(() {
                                isLoading = false;
                                localError = 'Demo sign-in failed.';
                              });
                            }
                          }
                        },
                  icon: const Icon(Icons.flash_on, size: 16, color: AppColors.primary),
                  label: const Text(
                    'Try Quick Demo Sign-In',
                    style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
              const SizedBox(height: 8),

              TextButton(
                onPressed: isLoading ? null : () => Navigator.of(ctx).pop(false),
                child: const Text(
                  'Cancel',
                  style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    return result == true;
  }

  Future<void> _handlePlaceOrder() async {
    setState(() => _errorMessage = null);

    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) {
      await _showLoginDialog(context);
      return;
    }

    final phone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(phone)) {
      setState(() => _errorMessage = 'Please enter a valid 10-digit Indian mobile number before placing order.');
      return;
    }

    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_fulfillmentMethod == 'DELIVERY') {
      if (_serviceability != null && !_serviceability!.serviceable) {
        setState(() {
          _errorMessage =
              _serviceability!.message.isNotEmpty ? _serviceability!.message : 'Delivery is not available in PIN ${_pinController.text}. Choose Store Pickup.';
        });
        return;
      }
    }

    final cartItems = ref.read(cartProvider);
    if (cartItems.isEmpty) {
      setState(() => _errorMessage = 'Cart is empty. Please add products first.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final repo = ref.read(checkoutRepositoryProvider);
      final idempotencyKey = 'flutter-idem-${DateTime.now().millisecondsSinceEpoch}';

      final payload = {
        'items': cartItems.map((i) {
          const legacyMap = {
            'prod-1': '65f1a0000000000000000001',
            'prod-2': '65f1a0000000000000000002',
            'prod-3': '65f1a0000000000000000003',
            'prod-4': '65f1a0000000000000000004',
            'prod-5': '65f1a0000000000000000005',
            'prod-6': '65f1a0000000000000000006',
            'prod-7': '65f1a0000000000000000007',
            'prod-8': '65f1a0000000000000000008',
          };
          final pId = legacyMap[i.product.id] ?? i.product.id;
          return {
            'productId': pId,
            'quantity': i.quantity,
          };
        }).toList(),
        'fulfillmentMethod': _fulfillmentMethod,
        'customerName': _nameController.text.trim(),
        'customerPhone': _phoneController.text.trim(),
        if (_fulfillmentMethod == 'DELIVERY')
          'deliveryAddress': {
            'houseNumber': _houseController.text.trim(),
            'street': _streetController.text.trim(),
            if (_landmarkController.text.trim().isNotEmpty)
              'landmark': _landmarkController.text.trim(),
            'city': _cityController.text.trim(),
            'state': _stateController.text.trim(),
            'pincode': _pinController.text.trim(),
            if (_instructionsController.text.trim().isNotEmpty)
              'deliveryInstructions': _instructionsController.text.trim(),
          },
        'paymentMethod': _selectedPayment,
        if (_instructionsController.text.trim().isNotEmpty)
          'customerNotes': _instructionsController.text.trim(),
        'idempotencyKey': idempotencyKey,
      };

      final createdOrder = await repo.placeOrder(payload);

      // Save to SharedPreferences so 2nd time checkout automatically pre-fills this number
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('saved_checkout_phone', phone);
        if (_nameController.text.trim().isNotEmpty) {
          await prefs.setString('saved_checkout_name', _nameController.text.trim());
        }
      } catch (_) {}

      // Realtime profile synchronization: update customer name and phone in profile
      if (authState.isAuthenticated) {
        ref.read(authProvider.notifier).updateProfile(
          displayName: _nameController.text.trim(),
          phoneNumber: phone,
        );
      }

      // Clear cart on successful order creation
      ref.read(cartProvider.notifier).clearCart();

      if (!mounted) return;

      // Navigate to order confirmation screen
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => OrderConfirmationScreen(order: createdOrder),
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      final user = next.user;
      if (user != null) {
        if (user.displayName.isNotEmpty && user.displayName != 'Valued Customer') {
          _nameController.text = user.displayName;
        }
        if (user.phoneNumber != null && user.phoneNumber!.isNotEmpty) {
          final digits = user.phoneNumber!.replaceAll(RegExp(r'\D'), '');
          final cleanPhone = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
          if (cleanPhone.isNotEmpty) {
            _phoneController.text = cleanPhone;
          }
        }
      }
    });

    final subtotal = ref.watch(cartSubtotalProvider);
    final deliveryFee = _fulfillmentMethod == 'PICKUP'
        ? 0.0
        : subtotal >= _settings.freeDeliveryThreshold
            ? 0.0
            : _settings.standardDeliveryFee;
    final totalPayable = subtotal + deliveryFee;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout & Order Placement')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  margin: const EdgeInsets.only(bottom: AppDimensions.lg),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    border: Border.all(color: const Color(0xFFFECACA)),
                    borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFB91C1C), size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),

              // 1. Fulfillment Method Selector (Local Delivery Disabled)
              const Text('1. Fulfillment Method', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppDimensions.sm),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.local_shipping_outlined, color: Colors.grey.shade400, size: 24),
                          const SizedBox(height: 6),
                          Text(
                            'Local Delivery',
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.grey.shade500),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Currently unavailable',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: AppDimensions.md),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _fulfillmentMethod = 'PICKUP'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          border: Border.all(
                            color: AppColors.primary,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                        ),
                        child: const Column(
                          children: [
                            Icon(Icons.storefront_outlined, color: AppColors.primary, size: 24),
                            SizedBox(height: 6),
                            Text('Store Pickup', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            SizedBox(height: 2),
                            Text('Counter pickup • ₹0', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppDimensions.lg),

              // 2. Customer Contact Details
              const Text('2. Customer Contact Details', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppDimensions.sm),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Full Name *', isDense: true),
                        validator: (v) => (v == null || v.trim().length < 2) ? 'Enter customer full name' : null,
                      ),
                      const SizedBox(height: AppDimensions.sm),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        maxLength: 10,
                        decoration: const InputDecoration(
                          labelText: 'Mobile Number (10 Digits) *',
                          prefixText: '+91 ',
                          counterText: '',
                          isDense: true,
                        ),
                        validator: (v) {
                          if (v == null || !RegExp(r'^[6-9]\d{9}$').hasMatch(v.trim())) {
                            return 'Valid 10-digit Indian number starting with 6-9 required';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // 3. Address or Store Pickup Notice
              if (_fulfillmentMethod == 'DELIVERY') ...[
                const Text('3. Delivery Address', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: AppDimensions.sm),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _houseController,
                                decoration: const InputDecoration(labelText: 'House / Flat *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                            const SizedBox(width: AppDimensions.sm),
                            Expanded(
                              child: TextFormField(
                                controller: _streetController,
                                decoration: const InputDecoration(labelText: 'Street / Area *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _landmarkController,
                                decoration: const InputDecoration(labelText: 'Landmark (Optional)', isDense: true),
                              ),
                            ),
                            const SizedBox(width: AppDimensions.sm),
                            Expanded(
                              child: TextFormField(
                                controller: _pinController,
                                keyboardType: TextInputType.number,
                                maxLength: 6,
                                decoration: InputDecoration(
                                  labelText: 'PIN Code *',
                                  counterText: '',
                                  isDense: true,
                                  suffixIcon: _isCheckingPin
                                      ? const Padding(
                                          padding: EdgeInsets.all(10),
                                          child: SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          ),
                                        )
                                      : null,
                                ),
                                onChanged: _validatePincode,
                                validator: (v) {
                                  if (v == null || !RegExp(r'^\d{6}$').hasMatch(v.trim())) {
                                    return '6 digits';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _cityController,
                                decoration: const InputDecoration(labelText: 'City *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                            const SizedBox(width: AppDimensions.sm),
                            Expanded(
                              child: TextFormField(
                                controller: _stateController,
                                decoration: const InputDecoration(labelText: 'State *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                          ],
                        ),
                        if (_serviceability != null) ...[
                          const SizedBox(height: AppDimensions.sm),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _serviceability!.serviceable
                                  ? const Color(0xFFECFDF5)
                                  : const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _serviceability!.serviceable ? Icons.check_circle : Icons.cancel,
                                  color: _serviceability!.serviceable
                                      ? const Color(0xFF065F46)
                                      : const Color(0xFFB91C1C),
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _serviceability!.serviceable
                                        ? 'Serviceable! Estimated: ${_serviceability!.estimatedDeliveryWindow}'
                                        : 'Not serviceable for PIN ${_pinController.text}. Please choose Store Pickup.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: _serviceability!.serviceable
                                          ? const Color(0xFF065F46)
                                          : const Color(0xFFB91C1C),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ] else ...[
                const Text('3. Store Pickup Counter', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: AppDimensions.sm),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _settings.storeName.isNotEmpty ? _settings.storeName : 'Kanhaiya General Store',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          (_settings.storeAddress.isNotEmpty &&
                                  !_settings.storeAddress.contains('New Delhi') &&
                                  !_settings.storeAddress.contains('Kanpur D.'))
                              ? _settings.storeAddress
                              : 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Pickup Policy: ${_settings.pickupInstructions}',
                          style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: AppDimensions.lg),

              // 4. Payment Method (Pay at Store enabled, WhatsApp Manual Pay disabled)
              const Text('4. Payment Method', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppDimensions.sm),

              // COD / Pay at Store
              Card(
                shape: RoundedRectangleBorder(
                  side: const BorderSide(
                    color: AppColors.primary,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                ),
                child: InkWell(
                  onTap: () => setState(() => _selectedPayment = 'COD'),
                  child: const Padding(
                    padding: EdgeInsets.all(AppDimensions.md),
                    child: Row(
                      children: [
                        Icon(
                          Icons.radio_button_checked,
                          color: AppColors.primary,
                        ),
                        SizedBox(width: AppDimensions.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Pay at Store / Pay on Pickup', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              SizedBox(height: 2),
                              Text(
                                'Pay cash or UPI at the store pickup counter when you collect your items. Payment status: PENDING.',
                                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.payments_outlined, color: AppColors.primary),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // 5. Special Instructions
              TextFormField(
                controller: _instructionsController,
                decoration: const InputDecoration(
                  labelText: 'Pickup Notes / Instructions (Optional)',
                  hintText: 'e.g. Will pick up around 5 PM',
                  isDense: true,
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // 6. Price Breakdown Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Items Subtotal:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Text(CurrencyFormatter.format(subtotal), style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Delivery Fee:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Text(
                            deliveryFee == 0 ? 'FREE' : CurrencyFormatter.format(deliveryFee),
                            style: TextStyle(
                              fontSize: 12,
                              color: deliveryFee == 0 ? Colors.green[700] : AppColors.textPrimary,
                              fontWeight: deliveryFee == 0 ? FontWeight.w700 : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Payable:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.primary)),
                          Text(
                            CurrencyFormatter.format(totalPayable),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.xl),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(AppDimensions.md),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: ElevatedButton(
            onPressed: _isSubmitting ? null : _handlePlaceOrder,
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text('Place Order • ${CurrencyFormatter.format(totalPayable)}'),
                  ),
          ),
        ),
      ),
    );
  }
}
