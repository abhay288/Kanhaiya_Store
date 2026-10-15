import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_language_provider.dart';
import '../../../../core/localization/app_strings.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../catalog/presentation/controllers/catalog_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  void _showStoreLocationModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.storefront, color: AppColors.primary, size: 26),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Kanhaiya General Store',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Physical Store & Counter Pickup Desk',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.location_on, color: AppColors.primary, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 18),
                    const Row(
                      children: [
                        Icon(Icons.access_time, color: AppColors.primary, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Operating Hours: 8:00 AM - 9:30 PM (Daily)',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      children: [
                        Icon(Icons.verified_outlined, color: AppColors.primary, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'FSSAI: 12722046000057 • GSTIN: 09ANBPL4077E1Z1',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        const addressText = 'Kanhaiya General Store\nFatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh - 209304\nGoogle Maps: https://maps.app.goo.gl/29REpExE1db9jAbK9';
                        Clipboard.setData(const ClipboardData(text: addressText));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Store address copied to clipboard!'),
                            backgroundColor: AppColors.primary,
                            behavior: SnackBarBehavior.floating,
                            duration: const Duration(seconds: 4),
                            action: SnackBarAction(
                              label: 'SHARE',
                              textColor: Colors.white,
                              onPressed: () {
                                SharePlus.instance.share(
                                  ShareParams(
                                    text: addressText,
                                    subject: 'Kanhaiya General Store Location & Address',
                                  ),
                                );
                              },
                            ),
                          ),
                        );
                        _showAddressShareDialog(context, addressText);
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text('Copy Address'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    tooltip: 'Share Store Address',
                    onPressed: () {
                      const addressText = 'Kanhaiya General Store\nFatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh - 209304\nGoogle Maps: https://maps.app.goo.gl/29REpExE1db9jAbK9';
                      SharePlus.instance.share(
                        ShareParams(
                          text: addressText,
                          subject: 'Kanhaiya General Store Location & Address',
                        ),
                      );
                    },
                    icon: const Icon(Icons.share, size: 18, color: AppColors.primary),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final uri = Uri.parse('https://maps.app.goo.gl/29REpExE1db9jAbK9');
                        try {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        } catch (_) {
                          await launchUrl(uri);
                        }
                      },
                      icon: const Icon(Icons.directions, size: 16),
                      label: const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text('Open in Maps'),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAddressShareDialog(BuildContext context, String addressText) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (copyCtx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Icon(Icons.check_circle, color: AppColors.primary, size: 38),
              const SizedBox(height: 10),
              const Text(
                'Address Copied to Clipboard!',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              const Text(
                'You can paste it anywhere, or share it directly with family & friends via WhatsApp or other apps.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(copyCtx),
                      child: const Text('Done'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(copyCtx);
                        SharePlus.instance.share(
                          ShareParams(
                            text: addressText,
                            subject: 'Kanhaiya General Store Location & Address',
                          ),
                        );
                      },
                      icon: const Icon(Icons.share, size: 16),
                      label: const Text('Share Now'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _showHelplineModal(BuildContext context, WidgetRef ref, UserModel? user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.headset_mic_outlined, color: AppColors.primary, size: 26),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Store Helpline & Support',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Orders, inquiries & customer assistance',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 0,
                color: const Color(0xFFF8FAFC),
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    // Direct Call
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Color(0xFFDCFCE7),
                        child: Icon(Icons.phone, color: Color(0xFF166534), size: 20),
                      ),
                      title: const Text('Call Store Desk', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      subtitle: const Text('+91 9936269347 (8:00 AM - 9:00 PM)', style: TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                      onTap: () async {
                        final uri = Uri.parse('tel:+919936269347');
                        try {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        } catch (_) {
                          try {
                            await launchUrl(uri);
                          } catch (_) {
                            Clipboard.setData(const ClipboardData(text: '+919936269347'));
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Phone number copied: +91 9936269347')),
                              );
                            }
                          }
                        }
                      },
                    ),
                    const Divider(height: 1),
                    // WhatsApp with Custom Message
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Color(0xFFE0F2FE),
                        child: Icon(Icons.chat_outlined, color: Color(0xFF0369A1), size: 20),
                      ),
                      title: const Text('WhatsApp Helpline', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      subtitle: const Text('Quick chat, product inquiries & UPI receipts', style: TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                      onTap: () async {
                        final customerName = user?.displayName ?? 'Valued Customer';
                        final customerPhone = (user?.phoneNumber != null && user!.phoneNumber!.isNotEmpty)
                            ? ' (Phone: +91 ${user.phoneNumber})'
                            : '';
                        final message =
                            'Hello Kanhaiya General Store! I am $customerName$customerPhone. I would like to inquire about products and my orders.';
                        final encodedMsg = Uri.encodeComponent(message);

                        final nativeUri = Uri.parse('whatsapp://send?phone=919936269347&text=$encodedMsg');
                        final webUri = Uri.parse('https://wa.me/919936269347?text=$encodedMsg');

                        try {
                          final launched = await launchUrl(nativeUri, mode: LaunchMode.externalApplication);
                          if (!launched) {
                            await launchUrl(webUri, mode: LaunchMode.externalApplication);
                          }
                        } catch (_) {
                          try {
                            await launchUrl(webUri, mode: LaunchMode.externalApplication);
                          } catch (_) {
                            Clipboard.setData(const ClipboardData(text: '9936269347'));
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('WhatsApp number copied: 9936269347')),
                              );
                            }
                          }
                        }
                      },
                    ),
                    const Divider(height: 1),
                    // Email Support with Custom Message
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Color(0xFFFEF3C7),
                        child: Icon(Icons.mail_outline, color: Color(0xFFB45309), size: 20),
                      ),
                      title: const Text('Email Support', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      subtitle: const Text('kanhaiyaastore@gmail.com', style: TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                      onTap: () async {
                        final customerName = user?.displayName ?? 'Valued Customer';
                        final customerEmail = user?.email ?? 'Not provided';
                        final customerPhone = user?.phoneNumber ?? 'Not provided';
                        final subject = Uri.encodeComponent('Customer Support Request - Kanhaiya General Store');
                        final body = Uri.encodeComponent(
                          'Hello Kanhaiya General Store Support Team,\n\n'
                          'I am reaching out regarding assistance with my account and orders.\n\n'
                          'Customer Details:\n'
                          '• Name: $customerName\n'
                          '• Email: $customerEmail\n'
                          '• Phone: $customerPhone\n\n'
                          'Inquiry / Issue:\n',
                        );
                        final uri = Uri.parse('mailto:kanhaiyaastore@gmail.com?subject=$subject&body=$body');

                        try {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        } catch (_) {
                          try {
                            await launchUrl(uri);
                          } catch (_) {
                            Clipboard.setData(const ClipboardData(text: 'kanhaiyaastore@gmail.com'));
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Email copied: kanhaiyaastore@gmail.com')),
                              );
                            }
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showEditProfileModal(BuildContext context, WidgetRef ref, UserModel? user) {
    if (user == null) {
      context.push('/signin');
      return;
    }

    final nameController = TextEditingController(text: user.displayName);
    final phoneController = TextEditingController(text: user.phoneNumber ?? '');
    final formKey = GlobalKey<FormState>();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 14,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.primaryContainer,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.person_outline, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Edit Profile',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                              ),
                              Text(
                                'Update your name & contact phone number',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Full Name *',
                        prefixIcon: Icon(Icons.badge_outlined, size: 20),
                        border: OutlineInputBorder(),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Please enter a valid name (at least 2 characters)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Mobile Number (10 Digits) *',
                        prefixText: '+91 ',
                        prefixIcon: Icon(Icons.phone_android_outlined, size: 20),
                        border: OutlineInputBorder(),
                        hintText: '9876543210',
                      ),
                      validator: (val) {
                        final digits = (val ?? '').replaceAll(RegExp(r'\D'), '');
                        if (digits.isNotEmpty && !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
                          return 'Enter valid 10-digit Indian mobile number starting with 6-9';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      initialValue: user.email.isNotEmpty ? user.email : 'No email linked',
                      readOnly: true,
                      decoration: InputDecoration(
                        labelText: 'Google Account Email',
                        prefixIcon: const Icon(Icons.email_outlined, size: 20),
                        border: const OutlineInputBorder(),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        helperText: 'Verified via Google authentication',
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSaving
                            ? null
                            : () async {
                                if (!formKey.currentState!.validate()) return;
                                setModalState(() => isSaving = true);
                                final cleanPhone = phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
                                final success = await ref.read(authProvider.notifier).updateProfile(
                                  displayName: nameController.text.trim(),
                                  phoneNumber: cleanPhone.isNotEmpty ? cleanPhone : null,
                                );
                                if (ctx.mounted) {
                                  Navigator.pop(ctx);
                                }
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(success ? 'Profile updated successfully!' : 'Failed to update profile'),
                                      backgroundColor: success ? AppColors.primary : AppColors.error,
                                    ),
                                  );
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: isSaving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Save Profile Changes', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showSettingsModal(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.settings_outlined, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'App Settings & Preferences',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                            ),
                            Text(
                              'Notifications, local cache & store legal terms',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Card(
                    elevation: 0,
                    color: const Color(0xFFF8FAFC),
                    shape: RoundedRectangleBorder(
                      side: BorderSide(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      children: [
                        SwitchListTile(
                          title: const Text('Order & Pickup Alerts', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          subtitle: const Text('Receive notifications for order preparation and pickup status', style: TextStyle(fontSize: 11)),
                          value: true,
                          activeThumbColor: AppColors.primary,
                          activeTrackColor: AppColors.primaryContainer,
                          onChanged: (val) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(val ? 'Order notifications enabled' : 'Order notifications disabled'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                        ),
                        const Divider(height: 1),
                        // Hindi Language Mode Switch
                        Consumer(
                          builder: (context, ref, _) {
                            final currentLang = ref.watch(appLanguageProvider);
                            final isHi = currentLang == 'hi';
                            return SwitchListTile(
                              secondary: const Icon(Icons.translate, color: AppColors.primary, size: 22),
                              title: const Text('हिंदी भाषा (Hindi Mode)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              subtitle: Text(
                                isHi ? 'ऐप की भाषा हिंदी में सक्रिय है (टैप करके बदलें)' : 'Switch entire app language to Hindi',
                                style: const TextStyle(fontSize: 11),
                              ),
                              value: isHi,
                              activeThumbColor: AppColors.primary,
                              activeTrackColor: AppColors.primaryContainer,
                              onChanged: (val) {
                                ref.read(appLanguageProvider.notifier).setLanguage(val ? 'hi' : 'en');
                                setModalState(() {});
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(val ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language changed to English'),
                                    duration: const Duration(seconds: 2),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: const Icon(Icons.cleaning_services_outlined, color: AppColors.primary, size: 20),
                          title: const Text('Clear App Cache', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          subtitle: const Text('Free up local storage and reset cached catalog', style: TextStyle(fontSize: 11)),
                          onTap: () {
                            Navigator.pop(ctx);
                            _clearAppCache(context, ref);
                          },
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: const Icon(Icons.privacy_tip_outlined, color: AppColors.primary, size: 20),
                          title: const Text('Privacy Policy', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          subtitle: const Text('Read how we safeguard customer data and privacy', style: TextStyle(fontSize: 11)),
                          trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                          onTap: () {
                            Navigator.pop(ctx);
                            context.push('/privacy-policy');
                          },
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: const Icon(Icons.info_outline, color: AppColors.primary, size: 20),
                          title: const Text('About Kanhaiya General Store', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          subtitle: const Text('Fatehpur Roshnai, Kanpur Dehat • App v1.0.0', style: TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _clearAppCache(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.cleaning_services_outlined, color: AppColors.primary),
            SizedBox(width: 10),
            Text('Clear App Cache', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'This will clear cached images, local temporary files, and refresh store products. Do you want to proceed?',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogCtx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Clear Now'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    int deletedFilesCount = 0;
    int deletedBytes = 0;

    try {
      // 1. Clear Flutter Image Cache in memory
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();

      // 2. Clear disk temporary files
      final tempDir = await getTemporaryDirectory();
      if (tempDir.existsSync()) {
        final entities = tempDir.listSync(recursive: true, followLinks: false);
        for (final entity in entities) {
          try {
            if (entity is File) {
              deletedBytes += entity.lengthSync();
              entity.deleteSync();
              deletedFilesCount++;
            }
          } catch (_) {}
        }
      }

      // 3. Invalidate catalog version to fetch fresh data
      ref.read(catalogVersionProvider.notifier).bump();
    } catch (_) {}

    if (context.mounted) {
      final sizeMb = (deletedBytes / (1024 * 1024)).toStringAsFixed(1);
      final msg = deletedFilesCount > 0
          ? 'App cache cleared ($sizeMb MB freed) and catalog refreshed!'
          : 'App cache cleared and store catalog refreshed successfully!';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _onMyInvoicesTap(BuildContext context, bool isAuthenticated) {
    if (isAuthenticated) {
      context.go('/orders');
    } else {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 18),
                const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.primary),
                const SizedBox(height: 12),
                const Text(
                  'Order Invoices & Receipts',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Sign in with your Google account to view orders, track status, and view GST invoices.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      context.push('/signin');
                    },
                    icon: const Icon(Icons.login),
                    label: const Text('Sign In with Google'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.go('/orders');
                  },
                  child: const Text('Continue to Orders Screen', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ),
              ],
            ),
          );
        },
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final lang = ref.watch(appLanguageProvider);

    return Scaffold(
      appBar: AppBar(title: Text('My Account'.tr(lang))),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          await ref.read(authProvider.notifier).refreshProfile();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(AppDimensions.lg),
          child: Column(
            children: [
            // User Header Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        user != null && user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : 'G',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: AppDimensions.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.displayName ?? 'Guest Shopper',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            user?.email ?? 'Sign in for in-store order pickup',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          if (user?.phoneNumber != null && user!.phoneNumber!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              '+91 ${user.phoneNumber}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                          ] else ...[
                            FutureBuilder<SharedPreferences>(
                              future: SharedPreferences.getInstance(),
                              builder: (context, snapshot) {
                                final checkoutPhone = snapshot.data?.getString('saved_checkout_phone');
                                if (checkoutPhone != null && checkoutPhone.isNotEmpty) {
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      '+91 $checkoutPhone (Saved from Checkout)',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                                    ),
                                  );
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ],
                          if (user != null) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: user.isAdmin ? AppColors.secondaryContainer : AppColors.primaryContainer,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                user.isAdmin ? 'AUTHORIZED STORE ADMIN' : 'VERIFIED CUSTOMER',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: user.isAdmin ? AppColors.onSecondaryContainer : AppColors.onPrimaryContainer),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (user != null) ...[
                      IconButton(
                        tooltip: 'Edit Profile',
                        onPressed: () => _showEditProfileModal(context, ref, user),
                        icon: const Icon(Icons.edit_outlined, color: AppColors.primary),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // If user has admin privileges, display the protected Admin Workspace button!
            if (authState.isAdmin) ...[
              Card(
                color: AppColors.secondaryContainer.withValues(alpha: 0.4),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: AppColors.secondary, width: 1.5),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                ),
                child: ListTile(
                  leading: const Icon(Icons.admin_panel_settings, color: AppColors.secondary),
                  title: const Text(
                    'Store Admin Dashboard',
                    style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.onSecondaryContainer),
                  ),
                  subtitle: const Text(
                    'Manage store orders, WhatsApp QR payments & stock',
                    style: TextStyle(fontSize: 12),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.secondary),
                  onTap: () => context.push('/admin'),
                ),
              ),
              const SizedBox(height: AppDimensions.md),
            ],

            // General menu options
            Card(
              child: Column(
                children: [
                  if (user != null) ...[
                    ListTile(
                      leading: const Icon(Icons.person_outline, color: AppColors.primary),
                      title: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      subtitle: Text(
                        user.phoneNumber != null && user.phoneNumber!.isNotEmpty
                            ? '+91 ${user.phoneNumber} • Update details'
                            : 'Add mobile number & update name',
                        style: const TextStyle(fontSize: 11),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                      onTap: () => _showEditProfileModal(context, ref, user),
                    ),
                    const Divider(height: 1),
                  ],
                  ListTile(
                    leading: const Icon(Icons.storefront_outlined, color: AppColors.primary),
                    title: Text('Store Location & Counter'.tr(lang), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: const Text('Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, UP', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () => _showStoreLocationModal(context),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.call_outlined, color: AppColors.primary),
                    title: Text('Store Helpline & Support'.tr(lang), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: const Text('+91 9936269347 • kanhaiyaastore@gmail.com', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () => _showHelplineModal(context, ref, user),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.receipt_long_outlined, color: AppColors.primary),
                    title: Text('My Invoices'.tr(lang), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () => _onMyInvoicesTap(context, authState.isAuthenticated),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.settings_outlined, color: AppColors.primary),
                    title: Text('Settings & Preferences'.tr(lang), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: Text(lang == 'hi' ? 'भाषा, सूचनाएं, कैश और गोपनीयता नीति' : 'Language, notifications, clear cache & privacy policy', style: const TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12),
                    onTap: () => _showSettingsModal(context, ref),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // Sign In / Sign Out action
            if (!authState.isAuthenticated) ...[
              ElevatedButton.icon(
                onPressed: () => context.push('/signin'),
                icon: const Icon(Icons.login),
                label: const Text('Sign In with Google'),
              ),
            ] else ...[
              OutlinedButton.icon(
                onPressed: () {
                  ref.read(authProvider.notifier).signOut();
                },
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text('Sign Out', style: TextStyle(color: AppColors.error)),
              ),
            ],
            const SizedBox(height: AppDimensions.xl),

            // Store Info Footer
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset('assets/images/kgs_logo.png', width: 28, height: 28),
                const SizedBox(width: 8),
                const Text(
                  'Kanhaiya General Store • App v1.0.0',
                  style: TextStyle(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}
}

