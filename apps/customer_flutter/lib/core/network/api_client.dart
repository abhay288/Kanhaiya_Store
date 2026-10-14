import 'package:dio/dio.dart';
import '../config/env_config.dart';

class ApiClient {
  static const String defaultBaseUrl = EnvConfig.apiBaseUrl;

  final Dio dio;
  String? _authToken;
  void Function()? onUnauthorized;

  ApiClient({String? baseUrl})
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? defaultBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // Attach Authorization Bearer token only if present and target is not an external third-party URL
          if (_authToken != null && _authToken!.isNotEmpty) {
            final uri = options.uri;
            final isInternal = !options.path.startsWith('http') ||
                uri.host.contains('onrender.com') ||
                uri.host.contains('localhost') ||
                uri.host.contains('127.0.0.1') ||
                uri.host.contains('10.0.2.2');

            if (isInternal) {
              options.headers['Authorization'] = 'Bearer $_authToken';
            }
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          if (error.response?.statusCode == 401) {
            onUnauthorized?.call();
          }
          return handler.next(error);
        },
      ),
    );
  }

  void setAuthToken(String? token) {
    _authToken = token;
  }

  String? get authToken => _authToken;
}

final apiClient = ApiClient();
