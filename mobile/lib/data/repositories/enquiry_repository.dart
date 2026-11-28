import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/enquiry.dart';

/// Enquiry + messaging repository.
class EnquiryRepository {
  EnquiryRepository({required ApiClient api})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api;

  final ApiClient _api;

  /// Start a negotiation thread on a product.
  Future<Enquiry> createEnquiry({
    required String productId,
    required String subject,
    required String message,
  }) async {
    final payload = await _api.post(ApiEndpoints.enquiries, body: {
      'productId': productId,
      'subject': subject,
      'message': message,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['enquiry'] ?? map;
    if (raw is! Map) {
      throw StateError('The enquiry could not be created.');
    }
    return Enquiry.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<List<Enquiry>> fetchMyEnquiries() async {
    final payload = await _api.get(ApiEndpoints.myEnquiries);
    return _parseList(payload);
  }

  Future<List<Enquiry>> fetchFarmerEnquiries() async {
    final payload = await _api.get(ApiEndpoints.farmerEnquiries);
    return _parseList(payload);
  }

  /// Full thread including the message history.
  Future<Enquiry> fetchThread(String enquiryId) async {
    final payload = await _api.get(ApiEndpoints.enquiryMessages(enquiryId));
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map;
    if (raw is! Map) {
      throw StateError('The conversation could not be loaded.');
    }
    return Enquiry.fromJson(Map<String, dynamic>.from(raw));
  }

  /// Send a message. The backend also broadcasts it over Socket.IO.
  Future<ChatMessage> sendMessage(String enquiryId, String content) async {
    final payload = await _api.post(
      ApiEndpoints.enquiryMessages(enquiryId),
      body: {'content': content},
    );

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['message'] ?? map;
    if (raw is! Map) {
      throw StateError('The message could not be sent.');
    }
    return ChatMessage.fromJson(Map<String, dynamic>.from(raw));
  }

  List<Enquiry> _parseList(dynamic payload) {
    return ApiClient.extractList(payload, keys: ['data', 'enquiries'])
        .whereType<Map>()
        .map((item) => Enquiry.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }
}
