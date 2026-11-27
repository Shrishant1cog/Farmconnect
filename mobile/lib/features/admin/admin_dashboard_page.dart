import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/misc.dart';
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
        setState(() => _error = error.displayMessage);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _toggleUser(Map<String, dynamic> user) async {
    try {
      await ref.read(adminRepositoryProvider).toggleUserStatus(user['id'].toString());
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  Future<void> _resolveComplaint(Map<String, dynamic> complaint) async {
    final notesController = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Resolve complaint'),
        content: TextField(
          controller: notesController,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Resolution notes'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Resolve'),
          ),
        ],
      ),
    );

    if (submitted != true) {
      return;
    }

    try {
      await ref.read(adminRepositoryProvider).resolveComplaint(
            complaint['id'].toString(),
            notes: notesController.text.trim(),
          );
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 0, label: Text('Overview'), icon: Icon(Icons.insights_outlined)),
              ButtonSegment(value: 1, label: Text('Users'), icon: Icon(Icons.people_outline)),
              ButtonSegment(
                value: 2,
                label: Text('Complaints'),
                icon: Icon(Icons.report_gmailerrorred_outlined),
              ),
            ],
            selected: {_tab},
            onSelectionChanged: (selection) => setState(() => _tab = selection.first),
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
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
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
    final metrics = _metrics?.raw ?? const <String, dynamic>{};
    final entries = metrics.entries.take(8).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      children: [
        if (entries.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(22),
              child: Text(
                'No platform metrics available yet.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.stone500),
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
                .map((entry) => Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${entry.value}',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              entry.key.replaceAll(RegExp(r'([A-Z])'), r' $1').trim(),
                              style: const TextStyle(color: AppTheme.stone500, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ))
                .toList(),
          ),
      ],
    );
  }

  Widget _buildUsers() {
    if (_users.isEmpty) {
      return ListView(
        children: const [
          EmptyState(title: 'No users found', icon: Icons.people_outline),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      itemCount: _users.length,
      itemBuilder: (context, index) {
        final user = _users[index];
        final isActive = user['isActive'] == true;

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppTheme.emerald.withValues(alpha: 0.14),
                child: Text(
                  (user['name']?.toString() ?? 'U').characters.first.toUpperCase(),
                  style: const TextStyle(color: AppTheme.emeraldDark, fontWeight: FontWeight.w800),
                ),
              ),
              title: Text(
                user['name']?.toString() ?? 'Unknown',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                '${user['email'] ?? ''} · ${user['role'] ?? ''}',
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
    if (_complaints.isEmpty) {
      return ListView(
        children: const [
          EmptyState(title: 'No complaints', icon: Icons.verified_outlined),
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
                    complaint['reason']?.toString() ?? 'Complaint',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    complaint['details']?.toString() ?? '',
                    style: const TextStyle(color: AppTheme.stone700, height: 1.4),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        complaint['status']?.toString() ?? 'PENDING',
                        style: const TextStyle(
                          color: AppTheme.stone500,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        Formatters.relative(
                          DateTime.tryParse(complaint['createdAt']?.toString() ?? ''),
                        ),
                        style: const TextStyle(color: AppTheme.stone500, fontSize: 11.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _resolveComplaint(complaint),
                    icon: const Icon(Icons.check_rounded, size: 17),
                    label: const Text('Resolve'),
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
