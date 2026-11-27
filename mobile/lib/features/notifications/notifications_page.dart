import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/misc.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';

/// Notification inbox — backed by the shared `Notification` table.
class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  List<AppNotification> _notifications = const [];
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
      final notifications = await ref
          .read(engagementRepositoryProvider)
          .fetchNotifications();
      if (!mounted) {
        return;
      }
      setState(() => _notifications = notifications);
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.commonRequestFailed(error.displayMessage));
      }
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.commonSomethingWrong);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _markAllRead() async {
    final l10n = AppLocalizations.of(context);
    try {
      await ref.read(engagementRepositoryProvider).markAllNotificationsRead();
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
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notificationsTitle),
        actions: [
          IconButton(
            onPressed: _notifications.isEmpty ? null : _markAllRead,
            icon: const Icon(Icons.done_all_rounded),
            tooltip: l10n.notificationsMarkAllRead,
          ),
        ],
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
    if (_notifications.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.notificationsEmpty,
            message: l10n.notificationsEmptyBody,
            icon: Icons.notifications_none_rounded,
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: _notifications.length,
      itemBuilder: (context, index) {
        final notification = _notifications[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: notification.isRead
                    ? AppTheme.stone50
                    : AppTheme.emerald.withValues(alpha: 0.14),
                child: Icon(
                  _iconFor(notification.type),
                  color: notification.isRead
                      ? AppTheme.stone500
                      : AppTheme.emeraldDark,
                ),
              ),
              title: Text(
                notification.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14.5,
                ),
              ),
              subtitle: Text(
                notification.message,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: Text(
                _formatRelative(context, l10n, notification.createdAt),
                style: const TextStyle(color: AppTheme.stone500, fontSize: 11),
              ),
            ),
          ),
        );
      },
    );
  }

  IconData _iconFor(String type) {
    switch (type.toUpperCase()) {
      case 'NEW_ENQUIRY':
      case 'ENQUIRY_MSG':
      case 'NEW_MESSAGE':
        return Icons.forum_outlined;
      case 'ORDER':
      case 'NEW_ORDER':
      case 'ORDER_STATUS':
      case 'ORDER_DELIVERED':
        return Icons.receipt_long_outlined;
      case 'COMPLAINT_RAISED':
        return Icons.report_gmailerrorred_outlined;
      default:
        return Icons.notifications_none_rounded;
    }
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
