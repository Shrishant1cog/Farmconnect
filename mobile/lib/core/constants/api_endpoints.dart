/// Canonical API paths.
///
/// The Android app is a second client of the *same* API that the website uses,
/// therefore every path here already exists in the Express backend (or was added
/// during the Android parity work and is now shared by both clients).
class ApiEndpoints {
  const ApiEndpoints._();

  static const String health = '/health';

  // Authentication
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String loginPhone = '/auth/login-phone';
  static const String firebasePhone = '/auth/firebase-phone';
  static const String verifyAadhaar = '/farmer/verify-aadhaar';
  static const String authMe = '/auth/me';

  // Products
  static const String products = '/products';
  static const String myProducts = '/products/my-products';
  static String product(String id) => '/products/$id';

  // Orders
  static const String orders = '/orders';
  static const String myOrders = '/orders/my';
  static const String farmerOrders = '/orders/farmer';
  static String order(String id) => '/orders/$id';
  static String orderStatus(String id) => '/orders/$id/status';
  static String orderReceived(String id) => '/orders/$id/received';

  // Enquiries & messaging
  static const String enquiries = '/enquiries';
  static const String myEnquiries = '/enquiries/my';
  static const String farmerEnquiries = '/enquiries/farmer';
  static String enquiryMessages(String id) => '/enquiries/$id/messages';

  // Farmers & discovery
  static const String farmerDirectory = '/users/farmers';
  static const String farmerMap = '/farmers/map';
  static String farmer(String id) => '/farmers/$id';
  static const String farmerDashboard = '/dashboard/farmer';

  // Users
  static const String userMe = '/users/me';

  // Favourites
  static const String favorites = '/favorites';
  static String favoriteProduct(String id) => '/favorites/products/$id';
  static String favoriteFarmer(String id) => '/favorites/farmers/$id';

  // Notifications
  static const String notifications = '/notifications';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';

  // Complaints
  static const String complaints = '/complaints';
  static const String myComplaints = '/complaints/mine';

  // Admin
  static const String adminMetrics = '/admin/metrics';
  static const String adminUsers = '/admin/users';
  static String adminUserToggle(String id) => '/admin/users/$id/toggle-status';
  static const String adminComplaints = '/admin/complaints';
  static String adminComplaintResolve(String id) => '/admin/complaints/$id/resolve';

  // Miscellaneous
  static const String upload = '/upload';
  static const String logisticsQuote = '/logistics/quote';
  static const String apmcRates = '/apmc/rates';
}
