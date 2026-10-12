import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../data/admin_analytics_repository.dart';
import '../../domain/models/analytics_models.dart';
import 'admin_order_details_screen.dart';

class AdminCustomersScreen extends ConsumerStatefulWidget {
  const AdminCustomersScreen({super.key});

  @override
  ConsumerState<AdminCustomersScreen> createState() => _AdminCustomersScreenState();
}

class _AdminCustomersScreenState extends ConsumerState<AdminCustomersScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = true;
  String? _errorMessage;

  List<CustomerSummaryModel> _customers = [];
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalCustomers = 0;

  @override
  void initState() {
    super.initState();
    _fetchCustomers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchCustomers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final res = await repo.getCustomers(
        search: _searchController.text.trim(),
        page: _currentPage,
        limit: 20,
      );

      if (mounted) {
        setState(() {
          _customers = res['customers'] as List<CustomerSummaryModel>;
          _totalCustomers = res['total'] as int;
          _totalPages = (res['totalPages'] as int).clamp(1, 9999);
          _currentPage = res['page'] as int;
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

  Future<void> _showCustomerDetailsDialog(CustomerSummaryModel customer) async {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>>(
          future: ref.read(adminAnalyticsRepositoryProvider).getCustomerDetails(customer.id),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const AlertDialog(
                content: SizedBox(
                  height: 120,
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                ),
              );
            }

            if (snapshot.hasError) {
              return AlertDialog(
                title: const Text('Customer Details'),
                content: Text('Error: ${snapshot.error}'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
                ],
              );
            }

            final data = snapshot.data!;
            final cust = data['customer'] as Map<String, dynamic>? ?? {};
            final orders = data['orders'] as List<dynamic>? ?? [];

            return AlertDialog(
              title: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: customer.isRegistered ? AppColors.primary : Colors.grey,
                    child: Icon(
                      customer.isRegistered ? Icons.person : Icons.person_outline,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(cust['name'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        Text(
                          cust['isRegistered'] == true ? 'Registered Customer' : 'Guest Shopper',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: cust['isRegistered'] == true ? AppColors.primary : Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              content: SizedBox(
                width: double.maxFinite,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildInfoRow('Contact Phone', cust['phone']?.isNotEmpty == true ? cust['phone'] : 'Not provided'),
                      _buildInfoRow('Email Address', cust['email']?.isNotEmpty == true ? cust['email'] : 'Not provided'),
                      _buildInfoRow('Total Spend', CurrencyFormatter.format(customer.totalSpend)),
                      _buildInfoRow('Lifetime Orders', '${orders.length} orders'),
                      const Divider(height: 20),
                      const Text('Recent Order History', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      const SizedBox(height: 8),
                      if (orders.isEmpty)
                        const Text('No previous orders found.', style: TextStyle(fontSize: 12, color: Colors.grey))
                      else
                        ...orders.map((o) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(o['orderNumber'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                    Text('${o['orderStatus']} • ${o['paymentStatus']}', style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Text(CurrencyFormatter.format(o['totalAmount'] as num? ?? 0), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.primary)),
                                    IconButton(
                                      icon: const Icon(Icons.arrow_forward_ios, size: 12),
                                      onPressed: () {
                                        Navigator.pop(ctx);
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => AdminOrderDetailsScreen(orderId: o['_id'] ?? o['id']),
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Customer Directory & Spend'),
            if (!_isLoading)
              Text('Total: $_totalCustomers customers (Page $_currentPage/$_totalPages)',
                  style: const TextStyle(fontSize: 10, color: Colors.white70)),
          ],
        ),
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchCustomers,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(AppDimensions.md),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search customer by Name, Phone, or Email...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _currentPage = 1;
                          _fetchCustomers();
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                isDense: true,
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
              ),
              onSubmitted: (_) {
                _currentPage = 1;
                _fetchCustomers();
              },
            ),
          ),

          // List state
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchCustomers,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _errorMessage != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, size: 40, color: AppColors.error),
                              const SizedBox(height: 8),
                              Text(_errorMessage!, style: const TextStyle(color: AppColors.error)),
                              const SizedBox(height: 12),
                              ElevatedButton(onPressed: _fetchCustomers, child: const Text('Retry')),
                            ],
                          ),
                        )
                      : _customers.isEmpty
                          ? const Center(child: Text('No customers found', style: TextStyle(color: Colors.grey)))
                          : ListView.builder(
                              padding: const EdgeInsets.all(AppDimensions.md),
                              itemCount: _customers.length,
                              itemBuilder: (context, index) {
                                final cust = _customers[index];
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  elevation: 0.5,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  child: ListTile(
                                    onTap: () => _showCustomerDetailsDialog(cust),
                                    leading: CircleAvatar(
                                      backgroundColor: cust.isRegistered
                                          ? AppColors.primaryContainer
                                          : Colors.grey.shade200,
                                      child: Icon(
                                        cust.isRegistered ? Icons.person : Icons.person_outline,
                                        color: cust.isRegistered ? AppColors.primary : Colors.grey.shade700,
                                        size: 22,
                                      ),
                                    ),
                                    title: Row(
                                      children: [
                                        Text(cust.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: cust.isRegistered ? Colors.green.shade50 : Colors.grey.shade100,
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(
                                              color: cust.isRegistered ? Colors.green.shade200 : Colors.grey.shade300,
                                            ),
                                          ),
                                          child: Text(
                                            cust.isRegistered ? 'REGISTERED' : 'GUEST',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                              color: cust.isRegistered ? Colors.green.shade800 : Colors.grey.shade700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    subtitle: Text(
                                      '${cust.phone.isNotEmpty ? cust.phone : cust.email} • ${cust.orderCount} orders placed',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    ),
                                    trailing: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          CurrencyFormatter.format(cust.totalSpend),
                                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.primary),
                                        ),
                                        const Text('Total Spend', style: TextStyle(fontSize: 9, color: AppColors.textSecondary)),
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
