import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Central Dio based API client.
///
/// Every repository in the app talks to the backend through this class, which
/// guarantees:
///  * one configurable base URL (`API_BASE_URL`),
///  * a JWT `Authorization` header on every request,
///  * consistent timeouts and structured error mapping.
class ApiClient {
  ApiClient({required TokenStorage tokenStorage, Dio? dio})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _tokenStorage = tokenStorage,
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AppConfig.apiBaseUrl,
                connectTimeout: const Duration(seconds: AppConfig.connectTimeoutSeconds),
                receiveTimeout: const Duration(seconds: AppConfig.receiveTimeoutSeconds),
                sendTimeout: const Duration(seconds: AppConfig.connectTimeoutSeconds),
                headers: {'Content-Type': 'application/json'},
                responseType: ResponseType.json,
              ),
            ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;

  Dio get raw => _dio;

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? query,
    Options? options,
  }) async {
    try {
      final response = await _dio.get<dynamic>(path, queryParameters: query, options: options);
      return response.data;
    } on DioException catch (error) {
      throw _map(error);
    }
  }

  Future<dynamic> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Options? options,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        path,
        data: body,
        queryParameters: query,
        options: options,
      );
      return response.data;
    } on DioException catch (error) {
      throw _map(error);
    }
  }

  Future<dynamic> put(String path, {Object? body, Options? options}) async {
    try {
      final response = await _dio.put<dynamic>(path, data: body, options: options);
      return response.data;
    } on DioException catch (error) {
      throw _map(error);
    }
  }

  Future<dynamic> patch(String path, {Object? body, Options? options}) async {
    try {
      final response = await _dio.patch<dynamic>(path, data: body, options: options);
      return response.data;
    } on DioException catch (error) {
      throw _map(error);
    }
  }

  Future<dynamic> delete(String path, {Object? body, Options? options}) async {
    try {
      final response = await _dio.delete<dynamic>(path, data: body, options: options);
      return response.data;
    } on DioException catch (error) {
      throw _map(error);
    }
  }

  /// Multipart upload used for product images (`POST /api/upload`).
  Future<dynamic> uploadFile(
    String path, {
    required File file,
    String fieldName = 'image',
    Map<String, dynamic>? fields,
  }) async {
    try {
      final form = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(file.path),
        if (fields != null) ...fields,
      });

      final response = await _dio.post<dynamic>(
        path,
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      return response.data;
    } on DioException catch (error) {
      throw _map(error);
    }
  }

  /// Extracts a list from the different envelope shapes used by the backend
  /// (`data`, `products`, `orders`, `enquiries`, ...).
  ///
  /// The backend returns collections in a few different shapes:
  ///  * a bare array — `[...]`
  ///  * a flat envelope — `{ "data": [...] }`, `{ "products": [...] }`
  ///  * a nested envelope — `{ "data": { "orders": [...] } }`
  ///
  /// This helper understands all of them so a repository never has to guess
  /// the exact response shape of an endpoint.
  static List<dynamic> extractList(dynamic payload, {List<String> keys = const ['data']}) {
    if (payload is List) {
      return payload;
    }
    if (payload is! Map) {
      return const [];
    }

    // 1. The requested keys directly on the payload.
    for (final key in keys) {
      final value = payload[key];
      if (value is List) {
        return value;
      }
    }

    // 2. A nested `data` object that carries the collection.
    final data = payload['data'];
    if (data is List) {
      return data;
    }
    if (data is Map) {
      for (final key in keys) {
        final value = data[key];
        if (value is List) {
          return value;
        }
      }
      // 3. Fall back to the first list value found in the nested object.
      for (final value in data.values) {
        if (value is List) {
          return value;
        }
      }
    }

    // 4. Fall back to the first list value found on the payload itself.
    for (final value in payload.values) {
      if (value is List) {
        return value;
      }
    }

    return const [];
  }

  ApiException _map(DioException error) {
    final response = error.response;
    final statusCode = response?.statusCode;

    String message;
    final data = response?.data;
    if (data is Map && data['message'] != null) {
      message = data['message'].toString();
    } else if (data is Map && data['error'] != null) {
      message = data['error'].toString();
    } else if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      message = 'The server took too long to respond. Please try again.';
    } else if (error.type == DioExceptionType.connectionError) {
      message = AppConfig.isMissingProductionUrl
          ? AppConfig.missingProductionUrlMessage
          : 'Unable to reach the FarmConnect server.';
    } else {
      message = error.message ?? 'Something went wrong while contacting the server.';
    }

    if (kDebugMode) {
      debugPrint('[ApiClient] ${error.requestOptions.path} -> $statusCode: $message');
    }

    return ApiException(
      message: message,
      statusCode: statusCode,
      payload: data,
      isNetworkError: error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout,
    );
  }
}
