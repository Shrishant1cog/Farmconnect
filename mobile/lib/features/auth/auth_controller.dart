import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/network/socket_service.dart';
import '../../core/providers.dart';
import '../../core/storage/token_storage.dart';
import '../../data/models/user.dart';
import '../../data/repositories/auth_repository.dart';

/// Session state of the signed-in user.
class AuthState {
  const AuthState({this.user, this.token, this.isRestoring = true});

  final AppUser? user;
  final String? token;
  final bool isRestoring;

  bool get isAuthenticated => user != null && token != null;

  AuthState copyWith({
    AppUser? user,
    String? token,
    bool? isRestoring,
    bool clear = false,
  }) {
    if (clear) {
      return const AuthState(user: null, token: null, isRestoring: false);
    }
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isRestoring: isRestoring ?? this.isRestoring,
    );
  }
}

/// Manages the shared session (login, registration, persistence, logout).
class AuthController extends Notifier<AuthState> {
  late final AuthRepository _repository;
  late final TokenStorage _storage;
  late final SocketService _socket;

  @override
  AuthState build() {
    _repository = ref.watch(authRepositoryProvider);
    _storage = ref.watch(tokenStorageProvider);
    _socket = ref.watch(socketServiceProvider);

    Future.microtask(_restore);
    return const AuthState(isRestoring: true);
  }

  Future<void> _restore() async {
    final session = await _repository.restoreSession();
    if (session == null) {
      state = const AuthState(isRestoring: false);
      return;
    }

    state = AuthState(user: session.user, token: session.token, isRestoring: false);
    _connectSocket(session.token);

    // Refresh the profile from the shared backend so the Android app always
    // shows the same account state as the website.
    try {
      final fresh = await _repository.fetchCurrentUser();
      await _storage.writeUserJson(jsonEncode(fresh.toJson()));
      await _storage.writeRole(fresh.role.wireValue);
      state = state.copyWith(user: fresh);
    } catch (error) {
      if (error is ApiException && error.isUnauthorized) {
        await logout();
      }
    }
  }

  void _connectSocket(String token) {
    try {
      _socket.connect(token: token);
    } catch (error) {
      debugPrint('[AuthController] socket connection failed: $error');
    }
  }

  Future<void> login({
    String? identifier,
    String? email,
    String? phone,
    required String password,
  }) async {
    final session = await _repository.login(
      identifier: identifier,
      email: email,
      phone: phone,
      password: password,
    );
    await _applySession(session);
  }

  Future<void> loginWithPhone({required String phone, required UserRole role}) async {
    final session = await _repository.loginWithPhone(phone: phone, role: role);
    await _applySession(session);
  }

  Future<void> register({
    required String name,
    required String phone,
    required String password,
    String? email,
    required UserRole role,
    String pincode = '',
    String state = 'Karnataka',
    String district = 'Mandya',
    String taluk = '',
    String addressLine = '',
    double? latitude,
    double? longitude,
    String farmName = '',
  }) async {
    final session = await _repository.register(
      name: name,
      phone: phone,
      password: password,
      email: email,
      role: role,
      pincode: pincode,
      state: state,
      district: district,
      taluk: taluk,
      addressLine: addressLine,
      latitude: latitude,
      longitude: longitude,
      farmName: farmName,
    );
    await _applySession(session);
  }

  Future<void> _applySession(AuthSession session) async {
    state = AuthState(user: session.user, token: session.token, isRestoring: false);
    _connectSocket(session.token);
  }

  /// Refresh the cached profile from the shared backend.
  Future<void> refreshProfile() async {
    if (!state.isAuthenticated) {
      return;
    }
    final fresh = await _repository.fetchCurrentUser();
    await _storage.writeUserJson(jsonEncode(fresh.toJson()));
    state = state.copyWith(user: fresh);
  }

  Future<void> logout() async {
    await _repository.logout();
    _socket.disconnect();
    state = const AuthState(isRestoring: false);
  }
}

/// Session provider used by the router and every screen.
final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

/// Convenience provider exposing the signed-in user (or null).
final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(authControllerProvider).user;
});
