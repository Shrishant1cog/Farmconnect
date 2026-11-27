import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/misc.dart';
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
      final notifications = await ref.read(engagementRepositoryProvider).fetchNotifications();
      if (!mounted) {
        return;
      }
      setState(() => _notifications = notifications);
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

  Future<void> _markAllRead() async {
    try {
      await ref.read(engagementRepositoryProvider).markAllNotificationsRead();
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            onPressed: _notifications.isEmpty ? null : _markAllRead,
            icon: const Icon(Icons.done_all_rounded),
            tooltip: 'Mark all as read',
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
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_notifications.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No notifications',
            message: 'Order updates and buyer enquiries will appear here in real time.',
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
                  color: notification.isRead ? AppTheme.stone500 : AppTheme.emeraldDark,
                ),
              ),
              title: Text(
                notification.title,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
              ),
              subtitle: Text(notification.message),
              trailing: Text(
                Formatters.relative(notification.createdAt),
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
        return Icons.forum_outlined;
      case 'ORDER':
        return Icons.receipt_long_outlined;
      case 'COMPLAINT_RAISED':
        return Icons.report_gmailerrorred_outlined;
      default:
        return Icons.notifications_none_rounded;
    }
  }
}
