import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryContainer,
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.privacy_tip, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Kanhaiya General Store',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Customer Privacy & Data Protection Policy',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _buildSection(
              title: '1. Introduction',
              content:
                  'Kanhaiya General Store ("we", "our", or "us"), located at Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh 209304, is dedicated to protecting the privacy and personal data of our customers who use our mobile and web applications.',
            ),

            _buildSection(
              title: '2. Information We Collect',
              content:
                  'We only collect information essential to process grocery orders, arrange counter pickups, and provide billing invoices:\n\n'
                  '• Contact Details: Name, 10-digit mobile phone number, and optional email address.\n'
                  '• Order & Transaction History: Items ordered, pickup selections, GST retail invoice records, and payment mode.\n'
                  '• Delivery / Pickup Address: Local address details saved by the customer for repeat grocery orders.',
            ),

            _buildSection(
              title: '3. How We Use Your Information',
              content:
                  'Your personal information is used exclusively to:\n\n'
                  '• Prepare and package your grocery orders ready for store counter pickup.\n'
                  '• Provide digital GST retail invoices and WhatsApp/SMS pickup notifications.\n'
                  '• Auto-fill your contact number on repeat checkouts for your convenience.\n'
                  '• Comply with statutory tax and retail record-keeping requirements (FSSAI & GSTIN).',
            ),

            _buildSection(
              title: '4. Data Security & Storage',
              content:
                  'All order records and customer profiles are stored with industry-standard encryption. We do not sell, rent, or trade your personal information with any third-party advertisers or marketing agencies.',
            ),

            _buildSection(
              title: '5. Local Storage & App Cache',
              content:
                  'Our mobile app caches catalogue images and local preferences to ensure fast offline loading. Customers can clear cached images and reset local preferences at any time via App Settings > Clear App Cache.',
            ),

            _buildSection(
              title: '6. Contact & Grievance Officer',
              content:
                  'For any privacy queries, account updates, or data deletion requests, you may reach us directly:\n\n'
                  '• Address: Fatehpur Roshnai, Sarvankhera, Kanpur Dehat, UP - 209304\n'
                  '• Helpline / WhatsApp: +91 9936269347\n'
                  '• Email: kanhaiyaastore@gmail.com\n'
                  '• FSSAI License: 12722046000057 • GSTIN: 09ANBPL4077E1Z1',
            ),

            const SizedBox(height: 24),
            Center(
              child: Text(
                'Last Updated: October 2026 • Version 1.0.0',
                style: TextStyle(fontSize: 11, color: AppColors.textTertiary),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required String content}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            content,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
