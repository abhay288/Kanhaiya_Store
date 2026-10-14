import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../data/admin_analytics_repository.dart';

class AdminStoreSettingsScreen extends ConsumerStatefulWidget {
  const AdminStoreSettingsScreen({super.key});

  @override
  ConsumerState<AdminStoreSettingsScreen> createState() => _AdminStoreSettingsScreenState();
}

class _AdminStoreSettingsScreenState extends ConsumerState<AdminStoreSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;

  // Controllers
  final _storeNameCtrl = TextEditingController();
  final _storePhoneCtrl = TextEditingController();
  final _storeWhatsappCtrl = TextEditingController();
  final _storeAddressCtrl = TextEditingController();
  final _supportEmailCtrl = TextEditingController();
  final _supportHoursCtrl = TextEditingController();
  final _operatingHoursCtrl = TextEditingController();
  final _pickupInstructionsCtrl = TextEditingController();

  final _storeUpiIdCtrl = TextEditingController();
  final _paymentInstructionsCtrl = TextEditingController();
  final _orderPoliciesCtrl = TextEditingController();
  final _invoicePrefixCtrl = TextEditingController();
  final _gstinCtrl = TextEditingController();

  bool _isPickupEnabled = true;
  bool _isWhatsappQrEnabled = true;
  bool _adminOrderAlerts = true;
  bool _lowStockAlerts = true;
  bool _customerStatusNotifications = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _storeNameCtrl.dispose();
    _storePhoneCtrl.dispose();
    _storeWhatsappCtrl.dispose();
    _storeAddressCtrl.dispose();
    _supportEmailCtrl.dispose();
    _supportHoursCtrl.dispose();
    _operatingHoursCtrl.dispose();
    _pickupInstructionsCtrl.dispose();
    _storeUpiIdCtrl.dispose();
    _paymentInstructionsCtrl.dispose();
    _orderPoliciesCtrl.dispose();
    _invoicePrefixCtrl.dispose();
    _gstinCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final s = await repo.getStoreSettings();

      if (mounted) {
        setState(() {
          _storeNameCtrl.text = s.storeName;
          _storePhoneCtrl.text = s.storePhone;
          _storeWhatsappCtrl.text = s.storeWhatsapp;
          _storeAddressCtrl.text = s.storeAddress;
          _supportEmailCtrl.text = s.supportEmail ?? '';
          _supportHoursCtrl.text = s.supportHours ?? '';
          _operatingHoursCtrl.text = s.operatingHours ?? '';

          _isPickupEnabled = s.isPickupEnabled;
          _pickupInstructionsCtrl.text = s.pickupInstructions;

          _isWhatsappQrEnabled = s.isWhatsappQrEnabled;
          _storeUpiIdCtrl.text = s.storeUpiId;
          _paymentInstructionsCtrl.text = s.paymentInstructions ?? '';
          _orderPoliciesCtrl.text = s.orderPolicies ?? '';

          _adminOrderAlerts = s.adminOrderAlertsEnabled;
          _lowStockAlerts = s.lowStockAlertsEnabled;
          _customerStatusNotifications = s.customerStatusNotificationsEnabled;
          _invoicePrefixCtrl.text = s.invoicePrefix;
          _gstinCtrl.text = s.gstin ?? '';

          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = ApiErrorHandler.getMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final payload = {
        'storeName': _storeNameCtrl.text.trim(),
        'storePhone': _storePhoneCtrl.text.trim(),
        'storeWhatsapp': _storeWhatsappCtrl.text.trim(),
        'storeAddress': _storeAddressCtrl.text.trim(),
        'supportEmail': _supportEmailCtrl.text.trim(),
        'supportHours': _supportHoursCtrl.text.trim(),
        'operatingHours': _operatingHoursCtrl.text.trim(),
        'isPickupEnabled': _isPickupEnabled,
        'isDeliveryEnabled': false, // In-store pickup only kirana business
        'pickupInstructions': _pickupInstructionsCtrl.text.trim(),
        'isCodEnabled': true,
        'isWhatsappQrEnabled': _isWhatsappQrEnabled,
        'storeUpiId': _storeUpiIdCtrl.text.trim(),
        'paymentInstructions': _paymentInstructionsCtrl.text.trim(),
        'orderPolicies': _orderPoliciesCtrl.text.trim(),
        'adminOrderAlertsEnabled': _adminOrderAlerts,
        'lowStockAlertsEnabled': _lowStockAlerts,
        'customerStatusNotificationsEnabled': _customerStatusNotifications,
        'invoicePrefix': _invoicePrefixCtrl.text.trim(),
        'gstin': _gstinCtrl.text.trim(),
      };

      final repo = ref.read(adminAnalyticsRepositoryProvider);
      await repo.updateStoreSettings(payload);

      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Store settings updated and persisted successfully.'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ApiErrorHandler.getMessage(e)),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Store Operating Settings'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload settings',
            onPressed: _isLoading ? null : _loadSettings,
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppDimensions.md),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: (_isLoading || _isSaving) ? null : _saveSettings,
            icon: _isSaving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.save, color: Colors.white),
            label: Text(
              _isSaving ? 'Saving Settings...' : 'Save Store Settings',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 12),
            Text('Loading store operating settings...', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              const Text(
                'Unable to Load Settings',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadSettings,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Model Notice
            Container(
              padding: const EdgeInsets.all(AppDimensions.md),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.storefront_outlined, color: AppColors.primary, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'KGS Operating Mode: Physical Kirana & In-Store Counter Pickup only.',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),

            // 1. Business Profile & Contact
            _buildSectionCard('1. Business Profile & Store Identity', [
              _buildTextField(_storeNameCtrl, 'Store Display Name *', required: true),
              _buildTextField(_storePhoneCtrl, 'Primary Contact Phone *', required: true),
              _buildTextField(_storeWhatsappCtrl, 'WhatsApp Business Number'),
              _buildTextField(_storeAddressCtrl, 'Physical Store Counter Address', maxLines: 2),
            ]),
            const SizedBox(height: 12),

            // 2. Counter Operations & Hours
            _buildSectionCard('2. Counter Hours & Customer Support', [
              _buildTextField(_operatingHoursCtrl, 'Counter Operating Hours (e.g. 8:00 AM - 9:30 PM)'),
              _buildTextField(_supportEmailCtrl, 'Customer Support Email'),
              _buildTextField(_supportHoursCtrl, 'Support Helpline Window'),
            ]),
            const SizedBox(height: 12),

            // 3. Counter Pickup Instructions & Policy
            _buildSectionCard('3. In-Store Pickup Policies', [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Store Counter Pickup Available', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                subtitle: const Text('Allow customers to submit in-store pickup orders', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                value: _isPickupEnabled,
                activeThumbColor: AppColors.primary,
                onChanged: (val) => setState(() => _isPickupEnabled = val),
              ),
              const Divider(),
              _buildTextField(_pickupInstructionsCtrl, 'Pickup Counter Instructions for Customers', maxLines: 3),
              _buildTextField(_orderPoliciesCtrl, 'Counter Return & Inspection Policy', maxLines: 2),
            ]),
            const SizedBox(height: 12),

            // 4. Notifications & Operational Alerts
            _buildSectionCard('4. Operational Alerts & Notifications', [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('New Order Sound & In-App Alerts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                subtitle: const Text('Notify store manager immediately when orders are placed', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                value: _adminOrderAlerts,
                activeThumbColor: AppColors.primary,
                onChanged: (val) => setState(() => _adminOrderAlerts = val),
              ),
              const Divider(),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Low-Stock & Out-of-Stock Alerts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                subtitle: const Text('Flag inventory items nearing replenishment threshold', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                value: _lowStockAlerts,
                activeThumbColor: AppColors.primary,
                onChanged: (val) => setState(() => _lowStockAlerts = val),
              ),
              const Divider(),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Customer Status Updates', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                subtitle: const Text('Notify customer when order is marked Ready for Pickup', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                value: _customerStatusNotifications,
                activeThumbColor: AppColors.primary,
                onChanged: (val) => setState(() => _customerStatusNotifications = val),
              ),
            ]),
            const SizedBox(height: 12),

            // 5. Billing, Tax & Counter Payments
            _buildSectionCard('5. Billing, Taxes & Counter Payment', [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Enable Manual WhatsApp QR / UPI Collection', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                subtitle: const Text('Permit manual UPI QR code verification via store WhatsApp', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                value: _isWhatsappQrEnabled,
                activeThumbColor: AppColors.primary,
                onChanged: (val) => setState(() => _isWhatsappQrEnabled = val),
              ),
              const Divider(),
              _buildTextField(_storeUpiIdCtrl, 'Store Counter UPI ID (e.g. kanhaiyastore@upi)'),
              _buildTextField(_paymentInstructionsCtrl, 'Payment Instructions for Customer'),
              _buildTextField(_invoicePrefixCtrl, 'Invoice Number Prefix (e.g. INV)'),
              _buildTextField(_gstinCtrl, 'GSTIN (Goods and Services Tax ID, if registered)'),
            ]),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.primary),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label, {
    int maxLines = 1,
    bool required = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        maxLines: maxLines,
        validator: required
            ? (val) => (val == null || val.trim().isEmpty) ? '$label is required' : null
            : null,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          isDense: true,
          filled: true,
          fillColor: const Color(0xFFFBFBFB),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
        ),
        style: const TextStyle(fontSize: 13),
      ),
    );
  }
}
