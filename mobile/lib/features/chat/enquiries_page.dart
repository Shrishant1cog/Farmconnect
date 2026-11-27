import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/enquiry.dart';
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

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.emerald,
      child: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_enquiries.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: widget.farmerView ? 'No Buyer Inquiries' : 'No Enquiries Yet',
            message: widget.farmerView
                ? 'Buyer negotiations for your harvest lots will appear here.'
                : 'Start a negotiation from a product listing to talk directly with the farmer.',
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
        final counterpart = widget.farmerView ? enquiry.consumerName : enquiry.farmerName;

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
                      '${widget.farmerView ? 'Buyer' : 'Cultivator'}: $counterpart · ${enquiry.productTitle}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                    ),
                    if (enquiry.lastMessage != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        enquiry.lastMessage!.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppTheme.stone700, fontSize: 13, height: 1.35),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      Formatters.relative(enquiry.updatedAt ?? enquiry.createdAt),
                      style: const TextStyle(color: AppTheme.stone500, fontSize: 11.5),
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
        status.label,
        style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}
