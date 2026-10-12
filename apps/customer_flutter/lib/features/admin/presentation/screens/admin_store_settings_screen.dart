import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../data/admin_analytics_repository.dart';

class AdminStoreSettingsScreen extends ConsumerStatefulWidget {
  const AdminStoreSettingsScreen({super.key});

  @override
  ConsumerState<AdminStoreSettingsScreen> createState() => _AdminStoreSettingsScreenState();
}

class _AdminStoreSettingsScreenState extends ConsumerState<AdminStoreSettingsScreen> {
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

  final _pincodesCtrl = TextEditingController();
  final _deliveryFeeCtrl = TextEditingController();
  final _freeDeliveryThresholdCtrl = TextEditingController();
  final _minOrderValueCtrl = TextEditingController();
  final _pickupInstructionsCtrl = TextEditingController();

  final _storeUpiIdCtrl = TextEditingController();
  final _paymentInstructionsCtrl = TextEditingController();
  final _orderPoliciesCtrl = TextEditingController();
  final _invoicePrefixCtrl = TextEditingController();
  final _gstinCtrl = TextEditingController();

  bool _isDeliveryEnabled = true;
  bool _isPickupEnabled = true;
  bool _isCodEnabled = true;
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
    _pincodesCtrl.dispose();
    _deliveryFeeCtrl.dispose();
    _freeDeliveryThresholdCtrl.dispose();
    _minOrderValueCtrl.dispose();
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

          _isDeliveryEnabled = s.isDeliveryEnabled;
          _isPickupEnabled = s.isPickupEnabled;
          _pincodesCtrl.text = s.serviceablePincodes.join(', ');
          _deliveryFeeCtrl.text = s.standardDeliveryFee.toString();
          _freeDeliveryThresholdCtrl.text = s.freeDeliveryThreshold.toString();
          _minOrderValueCtrl.text = s.minOrderValue.toString();
          _pickupInstructionsCtrl.text = s.pickupInstructions;

          _isCodEnabled = s.isCodEnabled;
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
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);

    try {
      final rawPins = _pincodesCtrl.text
          .split(',')
          .map((p) => p.trim())
          .where((p) => p.isNotEmpty)
          .toList();

      final payload = {
        'storeName': _storeNameCtrl.text.trim(),
        'storePhone': _storePhoneCtrl.text.trim(),
        'storeWhatsapp': _storeWhatsappCtrl.text.trim(),
        'storeAddress': _storeAddressCtrl.text.trim(),
        'supportEmail': _supportEmailCtrl.text.trim(),
        'supportHours': _supportHoursCtrl.text.trim(),
        'operatingHours': _operatingHoursCtrl.text.trim(),
        'isDeliveryEnabled': _isDeliveryEnabled,
        'isPickupEnabled': _isPickupEnabled,
        'serviceablePincodes': rawPins,
        'standardDeliveryFee': double.tryParse(_deliveryFeeCtrl.text.trim()) ?? 30.0,
        'freeDeliveryThreshold': double.tryParse(_freeDeliveryThresholdCtrl.text.trim()) ?? 500.0,
        'minOrderValue': double.tryParse(_minOrderValueCtrl.text.trim()) ?? 100.0,
        'pickupInstructions': _pickupInstructionsCtrl.text.trim(),
        'isCodEnabled': _isCodEnabled,
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
          const SnackBar(content: Text('Store settings saved successfully.'), backgroundColor: AppColors.primary),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save settings: $e'), backgroundColor: AppColors.error),
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
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadSettings),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(AppDimensions.md),
        color: Colors.white,
        child: SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: (_isLoading || _isSaving) ? null : _saveSettings,
            icon: _isSaving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.save, color: Colors.white),
            label: Text(_isSaving ? 'Saving...' : 'Save Settings', style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: const TextStyle(color: AppColors.error)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Business Profile
                      _buildSectionCard('Business Profile & Contact', [
                        _buildTextField(_storeNameCtrl, 'Store Display Name'),
                        _buildTextField(_storePhoneCtrl, 'Primary Store Phone'),
                        _buildTextField(_storeWhatsappCtrl, 'WhatsApp Business Number'),
                        _buildTextField(_storeAddressCtrl, 'Physical Store Address', maxLines: 2),
                        _buildTextField(_supportEmailCtrl, 'Customer Support Email'),
                        _buildTextField(_supportHoursCtrl, 'Support Operating Hours'),
                        _buildTextField(_operatingHoursCtrl, 'Store Hours (Counter)'),
                      ]),
                      const SizedBox(height: 12),

                      // 2. Fulfillment Configuration
                      _buildSectionCard('Fulfillment & Delivery Rules', [
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Local Home Delivery Available', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _isDeliveryEnabled,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _isDeliveryEnabled = val),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Store Counter Pickup Available', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _isPickupEnabled,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _isPickupEnabled = val),
                        ),
                        const Divider(),
                        _buildTextField(_pincodesCtrl, 'Serviceable PIN Codes (Comma-separated)', hint: '110001, 110002, 110084'),
                        _buildTextField(_deliveryFeeCtrl, 'Standard Delivery Fee (INR)', keyboardType: TextInputType.number),
                        _buildTextField(_freeDeliveryThresholdCtrl, 'Free Delivery Order Threshold (INR)', keyboardType: TextInputType.number),
                        _buildTextField(_minOrderValueCtrl, 'Minimum Order Value (INR)', keyboardType: TextInputType.number),
                        _buildTextField(_pickupInstructionsCtrl, 'Store Counter Pickup Instructions', maxLines: 2),
                      ]),
                      const SizedBox(height: 12),

                      // 3. Checkout & Payment Settings
                      _buildSectionCard('Checkout & Payments', [
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Cash on Delivery (COD) Allowed', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _isCodEnabled,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _isCodEnabled = val),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Manual WhatsApp QR Payment Allowed', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _isWhatsappQrEnabled,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _isWhatsappQrEnabled = val),
                        ),
                        const Divider(),
                        _buildTextField(_storeUpiIdCtrl, 'Store UPI ID for QR Billing'),
                        _buildTextField(_paymentInstructionsCtrl, 'Customer Payment Instructions', maxLines: 2),
                        _buildTextField(_orderPoliciesCtrl, 'Customer-facing Store Policies', maxLines: 2),
                      ]),
                      const SizedBox(height: 12),

                      // 4. Notifications & Invoices
                      _buildSectionCard('Notifications & Invoice Settings', [
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Admin Order Alerts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _adminOrderAlerts,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _adminOrderAlerts = val),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Low Stock Alerts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _lowStockAlerts,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _lowStockAlerts = val),
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Customer Status Push Notifications', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          value: _customerStatusNotifications,
                          activeThumbColor: AppColors.primary,
                          onChanged: (val) => setState(() => _customerStatusNotifications = val),
                        ),
                        const Divider(),
                        _buildTextField(_invoicePrefixCtrl, 'Invoice Number Prefix (e.g. INV)'),
                        _buildTextField(_gstinCtrl, 'Store GSTIN (Leave empty if unverified)'),
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
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const Divider(height: 18),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController ctrl, String label, {int maxLines = 1, TextInputType? keyboardType, String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: ctrl,
        maxLines: maxLines,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: const OutlineInputBorder(),
          isDense: true,
        ),
      ),
    );
  }
}
