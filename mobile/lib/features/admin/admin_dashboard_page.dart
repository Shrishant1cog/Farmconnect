import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/misc.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';

/// Admin console — parity with `/admin/dashboard`.
class AdminDashboardPage extends ConsumerStatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  ConsumerState<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends ConsumerState<AdminDashboardPage> {
  AdminMetrics? _metrics;
  List<Map<String, dynamic>> _users = const [];
  List<Map<String, dynamic>> _complaints = const [];
  bool _loading = true;
  String? _error;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repository = ref.read(adminRepositoryProvider);
      final metrics = await repository.fetchMetrics();
      final users = await repository.fetchUsers();
      final complaints = await repository.fetchComplaints();
      if (!mounted) {
        return;
      }
      setState(() {
        _metrics = metrics;
        _users = users;
        _complaints = complaints;
      });
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = l10n.commonRequestFailed(error.displayMessage));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.commonSomethingWrong);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _toggleUser(Map<String, dynamic> user) async {
    final l10n = AppLocalizations.of(context);
    try {
      await ref
          .read(adminRepositoryProvider)
          .toggleUserStatus(user['id'].toString());
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.commonRequestFailed(error.displayMessage)),
          ),
        );
      }
    }
  }

  Future<void> _resolveComplaint(Map<String, dynamic> complaint) async {
    final l10n = AppLocalizations.of(context);
    final notesController = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.adminResolveComplaint),
        content: TextField(
          controller: notesController,
          maxLines: 3,
          decoration: InputDecoration(labelText: l10n.adminResolutionNotes),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.adminResolve),
          ),
        ],
      ),
    );

    if (submitted != true) {
      return;
    }

    try {
      await ref
          .read(adminRepositoryProvider)
          .resolveComplaint(
            complaint['id'].toString(),
            notes: notesController.text.trim(),
          );
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.commonRequestFailed(error.displayMessage)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: SegmentedButton<int>(
            segments: [
              ButtonSegment(
                value: 0,
                label: Text(l10n.adminOverview),
                icon: const Icon(Icons.insights_outlined),
              ),
              ButtonSegment(
                value: 1,
                label: Text(l10n.adminUsers),
                icon: const Icon(Icons.people_outline),
              ),
              ButtonSegment(
                value: 2,
                label: Text(l10n.adminComplaints),
                icon: const Icon(Icons.report_gmailerrorred_outlined),
              ),
            ],
            selected: {_tab},
            onSelectionChanged: (selection) =>
                setState(() => _tab = selection.first),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: AppTheme.emerald,
            child: _buildBody(),
          ),
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(
        children: [ErrorView(message: _error!, onRetry: _load)],
      );
    }

    if (_tab == 0) {
      return _buildOverview();
    }
    if (_tab == 1) {
      return _buildUsers();
    }
    return _buildComplaints();
  }

  Widget _buildOverview() {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toString();
    final numberFormat = NumberFormat.decimalPattern(locale);
    final metrics = _metrics?.raw ?? const <String, dynamic>{};
    final entries = metrics.entries.take(8).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      children: [
        if (entries.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Text(
                l10n.adminNoMetrics,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.stone500),
              ),
            ),
          )
        else
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: entries
                .map(
                  (entry) => Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            entry.value is num
                                ? numberFormat.format(entry.value as num)
                                : entry.value.toString(),
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _metricLabel(l10n, entry.key),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppTheme.stone500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }

  Widget _buildUsers() {
    final l10n = AppLocalizations.of(context);
    if (_users.isEmpty) {
      return ListView(
        children: [
          EmptyState(title: l10n.adminNoUsers, icon: Icons.people_outline),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      itemCount: _users.length,
      itemBuilder: (context, index) {
        final user = _users[index];
        final isActive = user['isActive'] == true;
        final userName = user['name']?.toString().trim() ?? '';

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppTheme.emerald.withValues(alpha: 0.14),
                child: Text(
                  userName.isEmpty
                      ? '?'
                      : userName.characters.first.toUpperCase(),
                  style: const TextStyle(
                    color: AppTheme.emeraldDark,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              title: Text(
                userName.isEmpty ? l10n.commonUnknown : userName,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                '${user['email'] ?? ''} · ${_roleLabel(l10n, user['role']?.toString())}',
              ),
              trailing: Switch(
                value: isActive,
                onChanged: (_) => _toggleUser(user),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildComplaints() {
    final l10n = AppLocalizations.of(context);
    if (_complaints.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.adminNoComplaints,
            icon: Icons.verified_outlined,
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      itemCount: _complaints.length,
      itemBuilder: (context, index) {
        final complaint = _complaints[index];

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    complaint['reason']?.toString() ??
                        l10n.adminComplaintFallback,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    complaint['details']?.toString() ?? '',
                    style: const TextStyle(
                      color: AppTheme.stone700,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        _complaintStatusLabel(
                          l10n,
                          complaint['status']?.toString() ?? 'PENDING',
                        ),
                        style: const TextStyle(
                          color: AppTheme.stone500,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        _formatRelative(
                          context,
                          l10n,
                          DateTime.tryParse(
                            complaint['createdAt']?.toString() ?? '',
                          ),
                        ),
                        style: const TextStyle(
                          color: AppTheme.stone500,
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _resolveComplaint(complaint),
                    icon: const Icon(Icons.check_rounded, size: 17),
                    label: Text(l10n.adminResolve),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 40),
                      backgroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

String _metricLabel(AppLocalizations l10n, String key) {
  switch (key) {
    case 'totalUsers':
      return l10n.adminMetricTotalUsers;
    case 'totalFarmers':
      return l10n.adminMetricTotalFarmers;
    case 'totalConsumers':
      return l10n.adminMetricTotalConsumers;
    case 'activeProducts':
      return l10n.adminMetricActiveProducts;
    case 'activeOrders':
      return l10n.adminMetricActiveOrders;
    case 'pendingComplaints':
      return l10n.adminMetricPendingComplaints;
    default:
      return l10n.commonUnknown;
  }
}

String _roleLabel(AppLocalizations l10n, String? role) {
  switch (role?.toUpperCase()) {
    case 'FARMER':
      return l10n.commonCultivator;
    case 'CONSUMER':
      return l10n.commonBuyer;
    case 'ADMIN':
      return l10n.commonAdmin;
    default:
      return l10n.commonUnknown;
  }
}

String _complaintStatusLabel(AppLocalizations l10n, String status) {
  switch (status.toUpperCase()) {
    case 'PENDING':
    case 'OPEN':
      return l10n.complaintStatusPending;
    case 'IN_REVIEW':
    case 'REVIEWING':
      return l10n.complaintStatusInReview;
    case 'RESOLVED':
      return l10n.complaintStatusResolved;
    case 'DISMISSED':
    case 'REJECTED':
      return l10n.complaintStatusDismissed;
    default:
      return l10n.commonUnknown;
  }
}

String _formatRelative(
  BuildContext context,
  AppLocalizations l10n,
  DateTime? value,
) {
  if (value == null) {
    return '—';
  }
  final locale = Localizations.localeOf(context).toString();
  final numberFormat = NumberFormat.decimalPattern(locale);
  final difference = DateTime.now().difference(value.toLocal());
  if (difference.inMinutes < 1) {
    return l10n.commonJustNow;
  }
  if (difference.inMinutes < 60) {
    return l10n.commonMinutesAgo(numberFormat.format(difference.inMinutes));
  }
  if (difference.inHours < 24) {
    return l10n.commonHoursAgo(numberFormat.format(difference.inHours));
  }
  if (difference.inDays < 7) {
    return l10n.commonDaysAgo(numberFormat.format(difference.inDays));
  }
  return DateFormat.yMMMd(locale).format(value.toLocal());
}
