import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../data/admin_users_repository.dart';
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

  List<AdminUserModel> _users = [];
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalUsers = 0;

  String _selectedRoleFilter = 'ALL'; // 'ALL', 'CUSTOMER', 'ADMIN'
  String _selectedStatusFilter = 'ALL'; // 'ALL', 'ACTIVE', 'BLOCKED'

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(adminUsersRepositoryProvider);
      final res = await repo.getUsers(
        search: _searchController.text.trim(),
        role: _selectedRoleFilter == 'ALL' ? null : _selectedRoleFilter,
        status: _selectedStatusFilter == 'ALL' ? null : _selectedStatusFilter,
        page: _currentPage,
        limit: 20,
      );

      if (mounted) {
        setState(() {
          _users = res['users'] as List<AdminUserModel>;
          _totalUsers = res['total'] as int;
          _totalPages = (res['totalPages'] as int).clamp(1, 9999);
          _currentPage = res['page'] as int;
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

  Future<void> _openAddUserDialog() async {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String role = 'CUSTOMER';
    bool isActive = true;

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.person_add, color: AppColors.primary),
              SizedBox(width: 8),
              Text('Add User to MongoDB', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email Address *', border: OutlineInputBorder(), isDense: true),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Phone Number (Optional)', border: OutlineInputBorder(), isDense: true),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Role', border: OutlineInputBorder(), isDense: true),
                  initialValue: role,
                  items: const [
                    DropdownMenuItem(value: 'CUSTOMER', child: Text('Customer')),
                    DropdownMenuItem(value: 'ADMIN', child: Text('Administrator')),
                  ],
                  onChanged: (val) {
                    if (val != null) setDlgState(() => role = val);
                  },
                ),
                const SizedBox(height: 10),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Account Active', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: Text(isActive ? 'User can log in and place orders' : 'User is blocked', style: const TextStyle(fontSize: 11)),
                  value: isActive,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => setDlgState(() => isActive = val),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () async {
                final email = emailCtrl.text.trim();
                if (email.isEmpty || !email.contains('@')) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(content: Text('Please enter a valid email address'), backgroundColor: AppColors.error),
                  );
                  return;
                }
                try {
                  final repo = ref.read(adminUsersRepositoryProvider);
                  await repo.createUser({
                    'email': email,
                    'displayName': nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : 'Customer',
                    'phoneNumber': phoneCtrl.text.trim(),
                    'role': role,
                    'isActive': isActive,
                  });
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(content: Text('Failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
                    );
                  }
                }
              },
              child: const Text('Create User', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );

    if (created == true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User created directly in MongoDB!'), backgroundColor: AppColors.primary),
        );
        _fetchUsers();
      }
    }
  }

  Future<void> _openEditUserDialog(AdminUserModel user) async {
    final nameCtrl = TextEditingController(text: user.displayName);
    final phoneCtrl = TextEditingController(text: user.phoneNumber);

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit ${user.displayName}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Email: ${user.email}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Display Name', border: OutlineInputBorder(), isDense: true),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder(), isDense: true),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              try {
                final repo = ref.read(adminUsersRepositoryProvider);
                await repo.updateUser(user.id, {
                  'displayName': nameCtrl.text.trim(),
                  'phoneNumber': phoneCtrl.text.trim(),
                });
                if (ctx.mounted) Navigator.pop(ctx, true);
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text('Update failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
                  );
                }
              }
            },
            child: const Text('Save Changes', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (updated == true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User updated in MongoDB!'), backgroundColor: AppColors.primary),
        );
        _fetchUsers();
      }
    }
  }

  Future<void> _toggleUserRole(AdminUserModel user) async {
    if (user.isRootAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Root owner role cannot be changed.'), backgroundColor: AppColors.error),
      );
      return;
    }

    final newRole = user.role == 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Change role to $newRole?'),
        content: Text('Change role of "${user.displayName}" (${user.email}) to $newRole?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Change Role', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(adminUsersRepositoryProvider);
      await repo.updateUser(user.id, {'role': newRole});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User role changed to $newRole.'), backgroundColor: AppColors.primary),
        );
        _fetchUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _toggleUserStatus(AdminUserModel user) async {
    if (user.isRootAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Root owner cannot be blocked.'), backgroundColor: AppColors.error),
      );
      return;
    }

    final newStatus = !user.isActive;
    final actionText = newStatus ? 'Activate / Unblock' : 'Block / Deactivate';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$actionText User?'),
        content: Text(
          newStatus
              ? 'Restore access for "${user.displayName}"? They will be able to log in.'
              : 'Block "${user.displayName}"? They will be immediately prevented from logging in.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: newStatus ? AppColors.primary : AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(actionText, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(adminUsersRepositoryProvider);
      await repo.updateUser(user.id, {'isActive': newStatus});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(newStatus ? 'User unblocked and active.' : 'User blocked successfully.'),
            backgroundColor: newStatus ? AppColors.primary : AppColors.error,
          ),
        );
        _fetchUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _deleteUser(AdminUserModel user) async {
    if (user.isRootAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('The root store owner account cannot be deleted.'), backgroundColor: AppColors.error),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete "${user.displayName}"?'),
        content: Text(
          'Are you sure you want to permanently delete user "${user.email}" directly from MongoDB? This action cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete from MongoDB', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(adminUsersRepositoryProvider);
      await repo.deleteUser(user.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User "${user.displayName}" permanently deleted from MongoDB.')),
        );
        _fetchUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _showUserDetailsDialog(AdminUserModel user) async {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>>(
          future: ref.read(adminUsersRepositoryProvider).getUserDetails(user.id),
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
                title: const Text('User Details'),
                content: Text(ApiErrorHandler.getMessage(snapshot.error)),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
                ],
              );
            }

            final data = snapshot.data!;
            final u = data['user'] as Map<String, dynamic>? ?? {};
            final orders = data['orders'] as List<dynamic>? ?? [];

            return AlertDialog(
              title: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: user.role == 'ADMIN' ? Colors.indigo : AppColors.primary,
                    child: Icon(
                      user.role == 'ADMIN' ? Icons.admin_panel_settings : Icons.person,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(u['displayName'] ?? user.displayName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        Text(
                          '${u['role'] ?? user.role} • ${u['isActive'] != false ? 'ACTIVE' : 'BLOCKED'}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: user.role == 'ADMIN' ? Colors.indigo : AppColors.primary,
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
                      _buildInfoRow('MongoDB ID', user.id),
                      _buildInfoRow('Email Address', u['email'] ?? user.email),
                      _buildInfoRow('Phone Number', (u['phoneNumber'] ?? user.phoneNumber).isNotEmpty ? (u['phoneNumber'] ?? user.phoneNumber) : 'Not specified'),
                      _buildInfoRow('Total Spend', CurrencyFormatter.format(user.totalSpend)),
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
                                    Text(
                                      CurrencyFormatter.format(o['totalAmount'] as num? ?? 0),
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.primary),
                                    ),
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
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onSelected) {
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500)),
      selected: isSelected,
      selectedColor: AppColors.primaryContainer,
      labelStyle: TextStyle(color: isSelected ? AppColors.onPrimaryContainer : AppColors.textPrimary),
      onSelected: (_) => onSelected(),
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
            const Text(
              'Mongo User Management',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
            ),
            if (!_isLoading)
              Text('Total: $_totalUsers users (Page $_currentPage/$_totalPages)',
                  style: const TextStyle(fontSize: 10, color: Colors.white70)),
          ],
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            tooltip: 'Add User',
            onPressed: _openAddUserDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchUsers,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add),
        label: const Text('Add User', style: TextStyle(fontWeight: FontWeight.w700)),
        onPressed: _openAddUserDialog,
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(AppDimensions.md),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by Name, Phone, or Email directly in Mongo...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _currentPage = 1;
                              _fetchUsers();
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
                    _fetchUsers();
                  },
                ),
                const SizedBox(height: 8),

                // Filter chips row
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All Users', _selectedRoleFilter == 'ALL' && _selectedStatusFilter == 'ALL', () {
                        setState(() {
                          _selectedRoleFilter = 'ALL';
                          _selectedStatusFilter = 'ALL';
                          _currentPage = 1;
                        });
                        _fetchUsers();
                      }),
                      const SizedBox(width: 6),
                      _buildFilterChip('Customers', _selectedRoleFilter == 'CUSTOMER', () {
                        setState(() {
                          _selectedRoleFilter = 'CUSTOMER';
                          _currentPage = 1;
                        });
                        _fetchUsers();
                      }),
                      const SizedBox(width: 6),
                      _buildFilterChip('Admins', _selectedRoleFilter == 'ADMIN', () {
                        setState(() {
                          _selectedRoleFilter = 'ADMIN';
                          _currentPage = 1;
                        });
                        _fetchUsers();
                      }),
                      const SizedBox(width: 6),
                      _buildFilterChip('Active', _selectedStatusFilter == 'ACTIVE', () {
                        setState(() {
                          _selectedStatusFilter = 'ACTIVE';
                          _currentPage = 1;
                        });
                        _fetchUsers();
                      }),
                      const SizedBox(width: 6),
                      _buildFilterChip('Blocked', _selectedStatusFilter == 'BLOCKED', () {
                        setState(() {
                          _selectedStatusFilter = 'BLOCKED';
                          _currentPage = 1;
                        });
                        _fetchUsers();
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // User List State
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchUsers,
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
                              ElevatedButton(onPressed: _fetchUsers, child: const Text('Retry')),
                            ],
                          ),
                        )
                      : _users.isEmpty
                          ? const Center(child: Text('No users found in MongoDB', style: TextStyle(color: Colors.grey)))
                          : ListView.builder(
                              padding: const EdgeInsets.all(AppDimensions.md),
                              itemCount: _users.length,
                              itemBuilder: (context, index) {
                                final u = _users[index];
                                final isAdmin = u.role == 'ADMIN';

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  elevation: 0.5,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  child: ListTile(
                                    onTap: () => _showUserDetailsDialog(u),
                                    leading: CircleAvatar(
                                      backgroundColor: isAdmin ? Colors.indigo.shade100 : AppColors.primaryContainer,
                                      child: Icon(
                                        isAdmin ? Icons.admin_panel_settings : Icons.person,
                                        color: isAdmin ? Colors.indigo : AppColors.primary,
                                        size: 22,
                                      ),
                                    ),
                                    title: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            u.displayName,
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: isAdmin ? Colors.indigo.shade50 : Colors.blue.shade50,
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(
                                              color: isAdmin ? Colors.indigo.shade200 : Colors.blue.shade200,
                                            ),
                                          ),
                                          child: Text(
                                            u.role,
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                              color: isAdmin ? Colors.indigo.shade800 : Colors.blue.shade800,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: u.isActive ? Colors.green.shade50 : Colors.red.shade50,
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(
                                              color: u.isActive ? Colors.green.shade200 : Colors.red.shade200,
                                            ),
                                          ),
                                          child: Text(
                                            u.isActive ? 'ACTIVE' : 'BLOCKED',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                              color: u.isActive ? Colors.green.shade800 : Colors.red.shade800,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${u.email}${u.phoneNumber.isNotEmpty ? ' • ${u.phoneNumber}' : ''}',
                                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                        ),
                                        Text(
                                          '${u.orderCount} orders placed • Total spend: ${CurrencyFormatter.format(u.totalSpend)}',
                                          style: const TextStyle(fontSize: 10, color: AppColors.textTertiary),
                                        ),
                                      ],
                                    ),
                                    trailing: PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert, size: 20),
                                      onSelected: (val) {
                                        switch (val) {
                                          case 'details':
                                            _showUserDetailsDialog(u);
                                            break;
                                          case 'edit':
                                            _openEditUserDialog(u);
                                            break;
                                          case 'toggleRole':
                                            _toggleUserRole(u);
                                            break;
                                          case 'toggleStatus':
                                            _toggleUserStatus(u);
                                            break;
                                          case 'delete':
                                            _deleteUser(u);
                                            break;
                                        }
                                      },
                                      itemBuilder: (ctx) => [
                                        const PopupMenuItem(
                                          value: 'details',
                                          child: Row(
                                            children: [
                                              Icon(Icons.history, size: 18),
                                              SizedBox(width: 8),
                                              Text('Orders History', style: TextStyle(fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'edit',
                                          child: Row(
                                            children: [
                                              Icon(Icons.edit_outlined, size: 18),
                                              SizedBox(width: 8),
                                              Text('Edit User Info', style: TextStyle(fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                        if (!u.isRootAdmin) ...[
                                          PopupMenuItem(
                                            value: 'toggleRole',
                                            child: Row(
                                              children: [
                                                Icon(u.role == 'ADMIN' ? Icons.person : Icons.admin_panel_settings, size: 18),
                                                SizedBox(width: 8),
                                                Text(u.role == 'ADMIN' ? 'Demote to Customer' : 'Make Administrator', style: const TextStyle(fontSize: 12)),
                                              ],
                                            ),
                                          ),
                                          PopupMenuItem(
                                            value: 'toggleStatus',
                                            child: Row(
                                              children: [
                                                Icon(u.isActive ? Icons.block : Icons.check_circle_outline, size: 18, color: u.isActive ? Colors.red : Colors.green),
                                                const SizedBox(width: 8),
                                                Text(u.isActive ? 'Block User' : 'Unblock User', style: TextStyle(fontSize: 12, color: u.isActive ? Colors.red : Colors.green)),
                                              ],
                                            ),
                                          ),
                                          const PopupMenuDivider(),
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Row(
                                              children: [
                                                Icon(Icons.delete_forever, size: 18, color: Colors.red),
                                                SizedBox(width: 8),
                                                Text('Delete from MongoDB', style: TextStyle(fontSize: 12, color: Colors.red)),
                                              ],
                                            ),
                                          ),
                                        ],
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
