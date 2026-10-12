import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  // Fulfillment & Payment
  String _fulfillmentMethod = 'DELIVERY'; // 'DELIVERY' or 'PICKUP'
  String _selectedPayment = 'COD'; // 'COD' or 'WHATSAPP_QR'
  bool _isSubmitting = false;

  // Form Fields
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: 'Abhay Kushwaha');
  final _phoneController = TextEditingController(text: '9936269347');
  final _houseController = TextEditingController(text: 'Shop 1');
  final _streetController = TextEditingController(text: 'Fatehpur Roshnai');
  final _landmarkController = TextEditingController(text: 'Near Kanhaiya Store');
  final _cityController = TextEditingController(text: 'Kanpur');
  final _stateController = TextEditingController(text: 'Uttar Pradesh');
  final _pinController = TextEditingController(text: '209303');
  final _instructionsController = TextEditingController();

  // Settings & Serviceability
  StoreSettingsModel _settings = StoreSettingsModel.defaultSettings;
  ServiceabilityResultModel? _serviceability;
  bool _isCheckingPin = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final authState = ref.read(authProvider);
    if (authState.user != null) {
      if (authState.user!.displayName.isNotEmpty) {
        _nameController.text = authState.user!.displayName;
      }
      if (authState.user!.phoneNumber != null && authState.user!.phoneNumber!.isNotEmpty) {
        _phoneController.text = authState.user!.phoneNumber!;
      }
    }
    _loadSettingsAndCheckPin();
  }

  Future<void> _loadSettingsAndCheckPin() async {
    final repo = ref.read(checkoutRepositoryProvider);
    final settings = await repo.getStoreSettings();
    if (mounted) {
      setState(() {
        _settings = settings;
        if (!settings.isDeliveryEnabled) {
          _fulfillmentMethod = 'PICKUP';
        }
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
    final phoneCtrl = TextEditingController(text: _phoneController.text);
    final nameCtrl = TextEditingController(text: _nameController.text);
    bool isLoading = false;
    String? localError;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
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
                          'Login to Complete Order',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Instant account creation if not registered',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (localError != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(localError!, style: TextStyle(color: Colors.red.shade700, fontSize: 12)),
                ),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(
                  labelText: 'Contact Mobile Number *',
                  prefixText: '+91 ',
                  counterText: '',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: 'Your Name (Optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        final phone = phoneCtrl.text.trim().replaceAll(RegExp(r'\D'), '');
                        if (!RegExp(r'^[6-9]\d{9}$').hasMatch(phone)) {
                          setModalState(() => localError = 'Please enter a valid 10-digit Indian mobile number');
                          return;
                        }
                        setModalState(() {
                          isLoading = true;
                          localError = null;
                        });
                        final success = await ref.read(authProvider.notifier).signInWithPhone(
                              phone: phone,
                              displayName: nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : null,
                            );
                        if (success) {
                          if (mounted) {
                            _phoneController.text = phone;
                            if (nameCtrl.text.trim().isNotEmpty) {
                              _nameController.text = nameCtrl.text.trim();
                            }
                          }
                          if (ctx.mounted) {
                            Navigator.of(ctx).pop(true);
                          }
                        } else {
                          if (ctx.mounted) {
                            setModalState(() {
                              isLoading = false;
                              localError = 'Login failed. Please try again.';
                            });
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Continue to Checkout', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
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
      final loggedIn = await _showLoginDialog(context);
      if (!loggedIn || !mounted) return;
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
        'items': cartItems.map((i) => {
          'productId': i.product.id,
          'quantity': i.quantity,
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

              // 1. Fulfillment Method Selector
              const Text('1. Fulfillment Method', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppDimensions.sm),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _settings.isDeliveryEnabled
                          ? () => setState(() => _fulfillmentMethod = 'DELIVERY')
                          : null,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                        decoration: BoxDecoration(
                          color: _fulfillmentMethod == 'DELIVERY' ? AppColors.surfaceVariant : Colors.white,
                          border: Border.all(
                            color: _fulfillmentMethod == 'DELIVERY' ? AppColors.primary : AppColors.border,
                            width: _fulfillmentMethod == 'DELIVERY' ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.local_shipping_outlined, color: AppColors.primary, size: 24),
                            const SizedBox(height: 6),
                            const Text('Local Delivery', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            const SizedBox(height: 2),
                            Text(
                              subtotal >= _settings.freeDeliveryThreshold ? 'FREE delivery' : '₹30 fee',
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
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
                          color: _fulfillmentMethod == 'PICKUP' ? AppColors.surfaceVariant : Colors.white,
                          border: Border.all(
                            color: _fulfillmentMethod == 'PICKUP' ? AppColors.primary : AppColors.border,
                            width: _fulfillmentMethod == 'PICKUP' ? 2 : 1,
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
                        Text(_settings.storeName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 2),
                        Text(_settings.storeAddress, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
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

              // 4. Payment Method
              const Text('4. Payment Method', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppDimensions.sm),

              // COD
              Card(
                shape: RoundedRectangleBorder(
                  side: BorderSide(
                    color: _selectedPayment == 'COD' ? AppColors.primary : AppColors.border,
                    width: _selectedPayment == 'COD' ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                ),
                child: InkWell(
                  onTap: () => setState(() => _selectedPayment = 'COD'),
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.md),
                    child: Row(
                      children: [
                        Icon(
                          _selectedPayment == 'COD' ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: _selectedPayment == 'COD' ? AppColors.primary : AppColors.textTertiary,
                        ),
                        const SizedBox(width: AppDimensions.md),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Cash on Delivery (COD)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              SizedBox(height: 2),
                              Text(
                                'Pay cash or UPI upon delivery / store pickup counter. Payment status: PENDING.',
                                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.payments_outlined, color: AppColors.primary),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.sm),

              // Manual WhatsApp QR
              if (_settings.isWhatsappQrEnabled)
                Card(
                  shape: RoundedRectangleBorder(
                    side: BorderSide(
                      color: _selectedPayment == 'WHATSAPP_QR' ? AppColors.primary : AppColors.border,
                      width: _selectedPayment == 'WHATSAPP_QR' ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                  ),
                  child: InkWell(
                    onTap: () => setState(() => _selectedPayment = 'WHATSAPP_QR'),
                    child: Padding(
                      padding: const EdgeInsets.all(AppDimensions.md),
                      child: Row(
                        children: [
                          Icon(
                            _selectedPayment == 'WHATSAPP_QR' ? Icons.radio_button_checked : Icons.radio_button_off,
                            color: _selectedPayment == 'WHATSAPP_QR' ? AppColors.primary : AppColors.textTertiary,
                          ),
                          const SizedBox(width: AppDimensions.md),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Manual WhatsApp QR / UPI', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                SizedBox(height: 2),
                                Text(
                                  'Order placed as PENDING. Request QR on store WhatsApp and share payment screenshot.',
                                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.qr_code_scanner_outlined, color: AppColors.primary),
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
                  labelText: 'Delivery Instructions / Notes (Optional)',
                  hintText: 'e.g. Ring doorbell twice or call upon arrival',
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
                : Text('Place Order • ${CurrencyFormatter.format(totalPayable)}'),
          ),
        ),
      ),
    );
  }
}
