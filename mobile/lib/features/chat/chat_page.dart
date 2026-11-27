import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/enquiry.dart';
import '../../../shared/widgets/app_states.dart';
import '../auth/auth_controller.dart';

/// Negotiation thread — parity with `/chat/[id]` and `/consumer/enquiries/[id]`.
class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key, required this.enquiryId});

  final String enquiryId;

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  Enquiry? _enquiry;
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _subscribe();
  }

  void _subscribe() {
    final socket = ref.read(socketServiceProvider);
    socket.joinEnquiry(widget.enquiryId);
    socket.on('new_chat_message', _onIncomingMessage);
  }

  void _onIncomingMessage(dynamic payload) {
    if (payload is! Map) {
      return;
    }
    final message = ChatMessage.fromJson(Map<String, dynamic>.from(payload));
    setState(() {
      _messages = [..._messages.where((item) => item.id != message.id), message];
    });
    _scrollToBottom();
  }

  @override
  void dispose() {
    final socket = ref.read(socketServiceProvider);
    socket.off('new_chat_message', _onIncomingMessage);
    socket.leaveEnquiry(widget.enquiryId);
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final enquiry = await ref.read(enquiryRepositoryProvider).fetchThread(widget.enquiryId);
      if (!mounted) {
        return;
      }
      setState(() {
        _enquiry = enquiry;
        _messages = enquiry.messages;
      });
      _scrollToBottom();
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

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) {
      return;
    }

    setState(() => _sending = true);
    _messageController.clear();

    try {
      final message = await ref.read(enquiryRepositoryProvider).sendMessage(widget.enquiryId, content);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages = [..._messages.where((item) => item.id != message.id), message];
      });
      _scrollToBottom();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_enquiry?.farmerName ?? 'Conversation'),
            if (_enquiry != null)
              Text(
                _enquiry!.productTitle,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500),
              ),
          ],
        ),
      ),
      body: _buildBody(user?.id),
      bottomNavigationBar: _buildComposer(),
    );
  }

  Widget _buildBody(String? currentUserId) {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }
    if (_messages.isEmpty) {
      return const EmptyState(
        title: 'No messages yet',
        message: 'Start the negotiation — messages are shared with the other party in real time.',
        icon: Icons.chat_bubble_outline_rounded,
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        final isMine = message.senderId == currentUserId;

        return Align(
          alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            constraints: const BoxConstraints(maxWidth: 300),
            decoration: BoxDecoration(
              color: isMine ? AppTheme.emerald : Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isMine ? 16 : 4),
                bottomRight: Radius.circular(isMine ? 4 : 16),
              ),
              border: isMine ? null : Border.all(color: AppTheme.stone200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.content,
                  style: TextStyle(
                    color: isMine ? Colors.white : AppTheme.stone900,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  Formatters.time(message.createdAt),
                  style: TextStyle(
                    fontSize: 10.5,
                    color: isMine ? Colors.white70 : AppTheme.stone500,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildComposer() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppTheme.stone200)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(
                  hintText: 'Write a message…',
                  isDense: true,
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                    )
                  : const Icon(Icons.send_rounded, size: 19),
              style: IconButton.styleFrom(
                backgroundColor: AppTheme.emerald,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
