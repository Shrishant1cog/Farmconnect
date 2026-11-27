import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/enquiry.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';

/// Enquiry list for both roles — parity with `/consumer/enquiries` and
/// `/farmer/inquiries`.
class EnquiriesPage extends ConsumerStatefulWidget {
  const EnquiriesPage({super.key, this.farmerView = false});

  final bool farmerView;

  @override
  ConsumerState<EnquiriesPage> createState() => _EnquiriesPageState();
}

class _EnquiriesPageState extends ConsumerState<EnquiriesPage> {
  List<Enquiry> _enquiries = const [];
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
      final repository = ref.read(enquiryRepositoryProvider);
      final enquiries = widget.farmerView
          ? await repository.fetchFarmerEnquiries()
          : await repository.fetchMyEnquiries();
      if (!mounted) {
        return;
      }
      setState(() => _enquiries = enquiries);
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

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.emerald,
      child: _buildBody(),
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
    if (_enquiries.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: widget.farmerView
                ? l10n.enquiriesFarmerEmptyTitle
                : l10n.enquiriesConsumerEmptyTitle,
            message: widget.farmerView
                ? l10n.enquiriesFarmerEmptyMessage
                : l10n.enquiriesConsumerEmptyMessage,
            icon: Icons.forum_outlined,
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      itemCount: _enquiries.length,
      itemBuilder: (context, index) {
        final enquiry = _enquiries[index];
        final counterpart = _counterpartName(l10n, enquiry, widget.farmerView);

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () => context.push('/chat/${enquiry.id}'),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            enquiry.subject,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        _statusChip(enquiry.status),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${widget.farmerView ? l10n.commonBuyer : l10n.commonCultivator}: $counterpart · ${enquiry.productTitle}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.stone500,
                        fontSize: 12.5,
                      ),
                    ),
                    if (enquiry.lastMessage != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        enquiry.lastMessage!.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppTheme.stone700,
                          fontSize: 13,
                          height: 1.35,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      _formatRelative(
                        context,
                        l10n,
                        enquiry.updatedAt ?? enquiry.createdAt,
                      ),
                      style: const TextStyle(
                        color: AppTheme.stone500,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _statusChip(EnquiryStatus status) {
    final l10n = AppLocalizations.of(context);
    final color = switch (status) {
      EnquiryStatus.open => AppTheme.amber,
      EnquiryStatus.negotiating => const Color(0xFF2563EB),
      EnquiryStatus.accepted => AppTheme.emeraldDark,
      EnquiryStatus.closed => AppTheme.stone500,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _enquiryStatusLabel(l10n, status),
        style: TextStyle(
          color: color,
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

String _counterpartName(
  AppLocalizations l10n,
  Enquiry enquiry,
  bool farmerView,
) {
  if (farmerView) {
    final name = enquiry.consumer?['name']?.toString().trim();
    return name == null || name.isEmpty ? l10n.commonBuyer : name;
  }
  final user = enquiry.farmer?['user'];
  final name = user is Map ? user['name']?.toString().trim() : null;
  if (name != null && name.isNotEmpty) {
    return name;
  }
  final farmName = enquiry.farmer?['farmName']?.toString().trim();
  return farmName == null || farmName.isEmpty
      ? l10n.commonCultivator
      : farmName;
}

String _enquiryStatusLabel(AppLocalizations l10n, EnquiryStatus status) {
  switch (status) {
    case EnquiryStatus.open:
      return l10n.enquiryStatusOpen;
    case EnquiryStatus.negotiating:
      return l10n.enquiryStatusNegotiating;
    case EnquiryStatus.accepted:
      return l10n.enquiryStatusAccepted;
    case EnquiryStatus.closed:
      return l10n.enquiryStatusClosed;
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
