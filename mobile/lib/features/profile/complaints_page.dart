import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/misc.dart';
import '../../../l10n/generated/app_localizations.dart';
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
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final complaints = await ref
          .read(engagementRepositoryProvider)
          .fetchMyComplaints();
      if (!mounted) {
        return;
      }
      setState(() => _complaints = complaints);
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

  Future<void> _raiseComplaint() async {
    final l10n = AppLocalizations.of(context);
    final entityTypeController = TextEditingController(text: 'ORDER');
    final entityIdController = TextEditingController();
    final reasonController = TextEditingController();
    final detailsController = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.complaintsRaiseTitle),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: 'ORDER',
                isExpanded: true,
                decoration: InputDecoration(labelText: l10n.complaintsAgainst),
                items: [
                  DropdownMenuItem(
                    value: 'ORDER',
                    child: Text(
                      l10n.complaintsEntityOrder,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'PRODUCT',
                    child: Text(
                      l10n.complaintsEntityProduct,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'FARMER',
                    child: Text(
                      l10n.complaintsEntityCultivator,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'ENQUIRY',
                    child: Text(
                      l10n.complaintsEntityConversation,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                onChanged: (value) =>
                    entityTypeController.text = value ?? 'ORDER',
              ),
              const SizedBox(height: 10),
              TextField(
                controller: entityIdController,
                decoration: InputDecoration(
                  labelText: l10n.complaintsReferenceId,
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: reasonController,
                decoration: InputDecoration(labelText: l10n.complaintsReason),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: detailsController,
                maxLines: 3,
                decoration: InputDecoration(labelText: l10n.complaintsDetails),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.commonSubmit),
          ),
        ],
      ),
    );

    if (submitted != true) {
      return;
    }

    try {
      await ref
          .read(engagementRepositoryProvider)
          .createComplaint(
            entityType: entityTypeController.text.trim(),
            entityId: entityIdController.text.trim().isEmpty
                ? 'GENERAL'
                : entityIdController.text.trim(),
            reason: reasonController.text.trim(),
            details: detailsController.text.trim(),
          );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.complaintsRegistered)));
      }
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
    return Scaffold(
      appBar: AppBar(title: Text(l10n.complaintsPageTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _raiseComplaint,
        backgroundColor: AppTheme.emerald,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: Text(l10n.complaintsRaiseButton),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppTheme.emerald,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(
        children: [ErrorView(message: _error!, onRetry: _load)],
      );
    }
    if (_complaints.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.complaintsEmptyTitle,
            message: l10n.complaintsEmptyMessage,
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.amber.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          _complaintStatusLabel(l10n, complaint.status),
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
                    style: const TextStyle(
                      color: AppTheme.stone700,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${_complaintEntityLabel(l10n, complaint.entityType)} · ${_formatDateTime(context, complaint.createdAt)}',
                    style: const TextStyle(
                      color: AppTheme.stone500,
                      fontSize: 11.5,
                    ),
                  ),
                  if (complaint.adminNotes != null &&
                      complaint.adminNotes!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      l10n.complaintsAdminResponse(complaint.adminNotes!),
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

String _complaintEntityLabel(AppLocalizations l10n, String entityType) {
  switch (entityType.toUpperCase()) {
    case 'ORDER':
      return l10n.complaintsEntityOrder;
    case 'PRODUCT':
      return l10n.complaintsEntityProduct;
    case 'FARMER':
      return l10n.complaintsEntityCultivator;
    case 'ENQUIRY':
    case 'CONVERSATION':
      return l10n.complaintsEntityConversation;
    default:
      return l10n.complaintsEntityGeneral;
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

String _formatDateTime(BuildContext context, DateTime? value) {
  if (value == null) {
    return '—';
  }
  final locale = Localizations.localeOf(context).toString();
  return DateFormat.yMMMd(locale).add_jm().format(value.toLocal());
}
