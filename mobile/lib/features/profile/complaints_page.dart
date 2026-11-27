import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/misc.dart';
import '../../../shared/widgets/app_states.dart';

/// Complaints raised by the signed-in user.
class ComplaintsPage extends ConsumerStatefulWidget {
  const ComplaintsPage({super.key});

  @override
  ConsumerState<ComplaintsPage> createState() => _ComplaintsPageState();
}

class _ComplaintsPageState extends ConsumerState<ComplaintsPage> {
  List<Complaint> _complaints = const [];
  bool _loading = true;
  String? _error;

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
      final complaints = await ref.read(engagementRepositoryProvider).fetchMyComplaints();
      if (!mounted) {
        return;
      }
      setState(() => _complaints = complaints);
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

  Future<void> _raiseComplaint() async {
    final entityTypeController = TextEditingController(text: 'ORDER');
    final entityIdController = TextEditingController();
    final reasonController = TextEditingController();
    final detailsController = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Raise a complaint'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: 'ORDER',
                decoration: const InputDecoration(labelText: 'Against'),
                items: const [
                  DropdownMenuItem(value: 'ORDER', child: Text('Order')),
                  DropdownMenuItem(value: 'PRODUCT', child: Text('Product listing')),
                  DropdownMenuItem(value: 'FARMER', child: Text('Cultivator')),
                  DropdownMenuItem(value: 'ENQUIRY', child: Text('Conversation')),
                ],
                onChanged: (value) =>
                    entityTypeController.text = value ?? 'ORDER',
              ),
              const SizedBox(height: 10),
              TextField(
                controller: entityIdController,
                decoration: const InputDecoration(labelText: 'Reference id'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(labelText: 'Reason'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: detailsController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Details'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (submitted != true) {
      return;
    }

    try {
      await ref.read(engagementRepositoryProvider).createComplaint(
            entityType: entityTypeController.text.trim(),
            entityId: entityIdController.text.trim().isEmpty
                ? 'GENERAL'
                : entityIdController.text.trim(),
            reason: reasonController.text.trim(),
            details: detailsController.text.trim(),
          );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Complaint registered')),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My complaints')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _raiseComplaint,
        backgroundColor: AppTheme.emerald,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Raise complaint'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppTheme.emerald,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_complaints.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No complaints registered',
            message: 'Raise a complaint when an order, listing or conversation needs attention.',
            icon: Icons.verified_user_outlined,
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
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
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          complaint.reason,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppTheme.amber.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          complaint.status,
                          style: const TextStyle(
                            color: Color(0xFFB45309),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    complaint.details,
                    style: const TextStyle(color: AppTheme.stone700, height: 1.4),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${complaint.entityType} · ${Formatters.dateTime(complaint.createdAt)}',
                    style: const TextStyle(color: AppTheme.stone500, fontSize: 11.5),
                  ),
                  if (complaint.adminNotes != null && complaint.adminNotes!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Admin response: ${complaint.adminNotes}',
                      style: const TextStyle(
                        color: AppTheme.emeraldDark,
                        fontWeight: FontWeight.w600,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
