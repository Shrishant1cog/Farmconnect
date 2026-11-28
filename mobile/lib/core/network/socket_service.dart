import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/app_config.dart';

/// Thin wrapper around `socket_io_client`.
///
/// The event and room names are identical to the ones used by the Next.js
/// website, so both clients receive the same real-time broadcasts.
class SocketService {
  SocketService();

  io.Socket? _socket;
  final Map<String, void Function(dynamic)> _listeners = {};

  bool get isConnected => _socket?.connected ?? false;

  void connect({String? token, String? baseUrl}) {
    if (_socket != null) {
      return;
    }

    _socket = io.io(
      baseUrl ?? AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth(token != null && token.isNotEmpty ? {'token': token} : <String, dynamic>{})
          .enableReconnection()
          .setReconnectionDelay(1500)
          .setReconnectionAttempts(9999)
          .build(),
    );

    _socket!.onConnect((_) {
      if (kDebugMode) {
        debugPrint('[Socket] connected');
      }
    });

    _socket!.onDisconnect((_) {
      if (kDebugMode) {
        debugPrint('[Socket] disconnected');
      }
    });

    _socket!.onConnectError((error) {
      if (kDebugMode) {
        debugPrint('[Socket] connect error: $error');
      }
    });

    // Re-attach every listener that was registered before the socket existed.
    // The language preference listener is registered when the session starts
    // and the socket is connected a moment later, so without this the event
    // would never arrive.
    _listeners.forEach((event, handler) {
      _socket!.on(event, handler);
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    // The listener registry is kept on purpose: the listeners are re-attached
    // by the next `connect()` call, so a sign-out / sign-in cycle does not
    // silently drop the real-time channels.
  }

  /// Subscribe to a server event. The returned callback removes the listener.
  void on(String event, void Function(dynamic) handler) {
    _socket?.on(event, handler);
    _listeners[event] = handler;
  }

  void off(String event, [void Function(dynamic)? handler]) {
    if (handler != null) {
      _socket?.off(event, handler);
    } else {
      _socket?.off(event);
    }
    _listeners.remove(event);
  }

  void emit(String event, [Object? data]) {
    _socket?.emit(event, data);
  }

  // ---------------------------------------------------------------------------
  // Room helpers — identical room naming to the backend
  // ---------------------------------------------------------------------------

  void joinProduct(String productId) {
    emit('join_product', {'productId': productId});
    emit('join_product_room', {'productId': productId});
  }

  void leaveProduct(String productId) {
    emit('leave_product', {'productId': productId});
    emit('leave_product_room', {'productId': productId});
  }

  void joinOrder(String orderId) {
    emit('join_order', {'orderId': orderId});
    emit('join_order_room', {'orderId': orderId});
  }

  void leaveOrder(String orderId) {
    emit('leave_order', {'orderId': orderId});
    emit('leave_order_room', {'orderId': orderId});
  }

  void joinEnquiry(String enquiryId) {
    emit('join_enquiry', {'enquiryId': enquiryId});
    emit('join_enquiry_room', {'enquiryId': enquiryId});
  }

  void leaveEnquiry(String enquiryId) {
    emit('leave_enquiry', {'enquiryId': enquiryId});
    emit('leave_enquiry_room', {'enquiryId': enquiryId});
  }

  void startTyping(String enquiryId) => emit('typing_start', {'enquiryId': enquiryId});

  void stopTyping(String enquiryId) => emit('typing_stop', {'enquiryId': enquiryId});
}
