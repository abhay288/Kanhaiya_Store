import 'package:dio/dio.dart';

/// Centralized API error handler for Flutter customer & admin modules.
/// Transforms raw DioExceptions into human-readable, actionable error messages
/// suitable for production retail applications without leaking stack traces or internal URLs.
class ApiErrorHandler {
  static String getMessage(dynamic error) {
    if (error is DioException) {
      final statusCode = error.response?.statusCode;

      // 401 Unauthorized: Expired session or missing auth credentials
      if (statusCode == 401) {
        return 'Your session has expired or authentication is required. Please sign in again to continue.';
      }

      // 403 Forbidden: Authenticated user does not possess required role
      if (statusCode == 403) {
        return 'Access denied: You do not have permission to view or manage this administrative section.';
      }

      // 404 Not Found
      if (statusCode == 404) {
        final resData = error.response?.data;
        if (resData is Map<String, dynamic> && resData['error'] is Map) {
          final msg = resData['error']['message']?.toString();
          if (msg != null && msg.isNotEmpty) return msg;
        }
        return 'The requested store resource could not be found.';
      }

      // 400 Bad Request
      if (statusCode == 400) {
        final resData = error.response?.data;
        if (resData is Map<String, dynamic>) {
          if (resData['error'] is Map && resData['error']['message'] != null) {
            return resData['error']['message'].toString();
          }
          if (resData['message'] != null) {
            return resData['message'].toString();
          }
        }
        return 'Invalid request details. Please check your input and try again.';
      }

      // 500+ Internal Server Error
      if (statusCode != null && statusCode >= 500) {
        return 'Store server error ($statusCode). Please try again in a few moments.';
      }

      // Network connection / timeout issues
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'Connection timed out. Please check your internet connectivity and try again.';
        case DioExceptionType.connectionError:
          return 'Unable to reach KGS store server. Please check your network connection.';
        case DioExceptionType.cancel:
          return 'Request was cancelled.';
        default:
          break;
      }

      // Safely check backend structured error response
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        if (data['error'] is Map && data['error']['message'] != null) {
          return data['error']['message'].toString();
        }
        if (data['message'] != null) {
          return data['message'].toString();
        }
      }

      return 'Unable to complete operation. Please try again.';
    }

    if (error == null) return 'An unexpected error occurred.';

    final errorStr = error.toString();
    if (errorStr.contains('sign_in_failed') || errorStr.contains('ApiException')) {
      return 'Google Sign-In failed. Please ensure Google Play Services is enabled and your network connection is active.';
    }

    final str = errorStr.replaceFirst('Exception: ', '').trim();
    if (str.isEmpty) return 'An unexpected error occurred.';
    return str;
  }
}
