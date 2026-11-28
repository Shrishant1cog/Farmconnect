// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'FarmConnect';

  @override
  String get appTagline => 'Direct trade between cultivators and buyers';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navLots => 'Lots';

  @override
  String get navOrders => 'Orders';

  @override
  String get navEnquiries => 'Enquiries';

  @override
  String get navProfile => 'Profile';

  @override
  String get navExplore => 'Explore';

  @override
  String get navFavorites => 'Favourites';

  @override
  String get navCart => 'Cart';

  @override
  String get navNotifications => 'Notifications';

  @override
  String get navChat => 'Chat';

  @override
  String get navMap => 'Farm Map';

  @override
  String get navMarketRates => 'Mandi Rates';

  @override
  String get navLogistics => 'Logistics';

  @override
  String get navComplaints => 'Complaints';

  @override
  String get navAdmin => 'Admin';

  @override
  String get navLanguage => 'Language';

  @override
  String get commonLoading => 'Loading…';

  @override
  String get commonRetry => 'Retry';

  @override
  String get commonErrorTitle => 'Something went wrong';

  @override
  String get commonErrorBody =>
      'We could not complete this request. Please try again.';

  @override
  String get commonNoResults => 'No results found';

  @override
  String get commonSearch => 'Search';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonSave => 'Save';

  @override
  String get commonClose => 'Close';

  @override
  String get commonBack => 'Back';

  @override
  String get commonNext => 'Next';

  @override
  String get commonSubmit => 'Submit';

  @override
  String get commonConfirm => 'Confirm';

  @override
  String get commonViewAll => 'View all';

  @override
  String get commonOptional => 'Optional';

  @override
  String get commonRequired => 'Required';

  @override
  String get commonAll => 'All';

  @override
  String get commonYes => 'Yes';

  @override
  String get commonNo => 'No';

  @override
  String get commonAvailable => 'Available';

  @override
  String get commonUnavailable => 'Unavailable';

  @override
  String get commonQuantity => 'Quantity';

  @override
  String get commonPrice => 'Price';

  @override
  String get commonPerKg => 'per kg';

  @override
  String get commonKg => 'kg';

  @override
  String get commonMinOrder => 'Minimum order';

  @override
  String get commonGrade => 'Grade';

  @override
  String get commonOrganic => 'Organic';

  @override
  String get commonLocation => 'Location';

  @override
  String get commonVariety => 'Variety';

  @override
  String get commonCrop => 'Crop';

  @override
  String get commonCropName => 'Crop name';

  @override
  String get commonCategory => 'Category';

  @override
  String get commonFarmer => 'Farmer';

  @override
  String get commonFarmName => 'Farm name';

  @override
  String get commonDescription => 'Description';

  @override
  String get commonImage => 'Image';

  @override
  String get commonPriceUnit => 'Price unit';

  @override
  String get commonQuantityUnit => 'Quantity unit';

  @override
  String get commonMinOrderKg => 'Minimum order (kg)';

  @override
  String get commonDistrict => 'District';

  @override
  String get commonState => 'State';

  @override
  String get commonEmail => 'Email';

  @override
  String get commonPhone => 'Phone';

  @override
  String get commonName => 'Name';

  @override
  String get commonPassword => 'Password';

  @override
  String get commonRole => 'Role';

  @override
  String get commonStatus => 'Status';

  @override
  String get commonDate => 'Date';

  @override
  String get commonTotal => 'Total';

  @override
  String get commonEdit => 'Edit';

  @override
  String get commonDelete => 'Remove';

  @override
  String get commonAdd => 'Add';

  @override
  String get commonApply => 'Apply';

  @override
  String get commonClear => 'Clear';

  @override
  String get commonFilters => 'Filters';

  @override
  String get commonLanguage => 'Language';

  @override
  String get commonUpdated => 'Updated';

  @override
  String get commonCreated => 'Created';

  @override
  String get commonUnknown => 'Unknown';

  @override
  String get commonNotFound => 'Not found';

  @override
  String get commonSomethingWrong => 'Something went wrong. Please try again.';

  @override
  String get languageHeading => 'Choose your language';

  @override
  String get languageSwitch => 'Switch language';

  @override
  String languageCurrent(Object language) {
    return 'Current language: $language';
  }

  @override
  String get languageSaved => 'Language preference saved';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageKannada => 'ಕನ್ನಡ';

  @override
  String get languageHindi => 'हिन्दी';

  @override
  String get emptyProducts => 'No harvest lots published yet';

  @override
  String get emptyOrders => 'No orders yet';

  @override
  String get emptyEnquiries => 'No enquiries yet';

  @override
  String get emptyFavorites => 'No favourites yet';

  @override
  String get emptyChats => 'No conversations yet';

  @override
  String get emptyComplaints => 'No complaints raised';

  @override
  String get emptyNotifications => 'No notifications yet';

  @override
  String get emptySearchHint => 'Try another crop, variety or district.';

  @override
  String farmerRequestFailed(Object message) {
    return 'Could not complete the request: $message';
  }

  @override
  String get farmerDashboardHarvestLots => 'Harvest lots';

  @override
  String get farmerDashboardAvailableLots => 'Available lots';

  @override
  String get farmerDashboardEnquiries => 'Enquiries';

  @override
  String get farmerDashboardProfileViews => 'Profile views';

  @override
  String get farmerDashboardMyHarvestBatches => 'My harvest batches';

  @override
  String get farmerDashboardListLot => 'List lot';

  @override
  String get farmerDashboardNoHarvestBatches => 'No harvest batches found';

  @override
  String get farmerProductsAvailableOnly => 'Available only';

  @override
  String get farmerProductsNewLot => 'New lot';

  @override
  String get farmerProductsRemoveTitle => 'Remove harvest lot?';

  @override
  String farmerProductsRemoveMessage(Object title) {
    return '\"$title\" will be removed from the marketplace.';
  }

  @override
  String get farmerProductsRemoved => 'Harvest lot removed';

  @override
  String get farmerProductsAvailableForBuyers => 'Available for buyers';

  @override
  String get farmerProductsMarkedUnavailable => 'Marked unavailable';

  @override
  String get farmerProductsEmptyTitle => 'No harvest lots found';

  @override
  String get farmerProductsEmptyMessage =>
      'List your first crop lot to reach buyers on the website and the app.';

  @override
  String get farmerOrderStatusSheetTitle => 'Update dispatch status';

  @override
  String farmerOrderStatusUpdated(Object status) {
    return 'Order marked as $status';
  }

  @override
  String get farmerOrderUpdateStatus => 'Update status';

  @override
  String get farmerOrdersEmptyTitle => 'No orders found';

  @override
  String get farmerOrdersEmptyMessage =>
      'Orders placed by buyers on the website or the app will appear here.';

  @override
  String farmerOrderNumber(Object orderNumber) {
    return 'Order #$orderNumber';
  }

  @override
  String farmerOrderBuyerLabel(Object buyer) {
    return 'Buyer: $buyer';
  }

  @override
  String get farmerOrderStatusPending => 'Pending';

  @override
  String get farmerOrderStatusConfirmed => 'Confirmed';

  @override
  String get farmerOrderStatusPacked => 'Packed';

  @override
  String get farmerOrderStatusDispatched => 'Dispatched';

  @override
  String get farmerOrderStatusDelivered => 'Delivered';

  @override
  String get farmerOrderStatusCancelled => 'Cancelled';

  @override
  String get farmerFormEditTitle => 'Modify crop lot';

  @override
  String get farmerFormCreateTitle => 'List fresh harvest lot';

  @override
  String get farmerFormCropTitle => 'Crop title';

  @override
  String get farmerFormCropTitleRequired => 'Enter a crop title';

  @override
  String get farmerFormDescriptionRequired => 'Describe your harvest lot';

  @override
  String get farmerFormPricePerUnit => 'Price per unit';

  @override
  String get farmerFormValidPrice => 'Enter a valid price';

  @override
  String get farmerFormValidQuantity => 'Enter a valid quantity';

  @override
  String get farmerFormQuantityAvailable => 'Quantity available';

  @override
  String get farmerFormMinimumOrderQuantity => 'Minimum order quantity';

  @override
  String get farmerFormMinimumOrderPositive =>
      'Minimum order must be greater than zero';

  @override
  String get farmerDefaultGrade => 'Export grade A';

  @override
  String get farmerDefaultLocation => 'Karnataka';

  @override
  String get farmerFormOrganicTitle => 'Certified organic produce';

  @override
  String get farmerFormOrganicSubtitle =>
      'Organic lots are highlighted in the marketplace';

  @override
  String get farmerFormUpdated => 'Harvest lot updated';

  @override
  String get farmerFormListed => 'Harvest lot listed';

  @override
  String get farmerFormCamera => 'Camera';

  @override
  String get farmerFormGallery => 'Gallery';

  @override
  String get farmerFormImageUploadFailed => 'The image could not be uploaded.';

  @override
  String get farmerFormCropNameRequired => 'Enter a crop name';

  @override
  String get farmerCropSearchHint => 'Search crop names';

  @override
  String get farmerCropSuggestions => 'Crop suggestions';

  @override
  String get farmerCropCatalogueError =>
      'The crop catalogue could not be loaded.';

  @override
  String get farmerCategoriesLoadError =>
      'Crop categories could not be loaded.';

  @override
  String get farmerNoCategory => 'No category';

  @override
  String get farmerPerQuintal => 'per quintal';

  @override
  String get farmerPerDozen => 'per dozen';

  @override
  String get farmerPerTon => 'per ton';

  @override
  String get farmerQuintal => 'Quintal';

  @override
  String get farmerDozen => 'Dozen';

  @override
  String get farmerTon => 'Ton';

  @override
  String get farmerPublishLot => 'Publish harvest lot';

  @override
  String get farmerSaveChanges => 'Save changes';

  @override
  String consumerRequestFailed(Object message) {
    return 'Could not complete the request: $message';
  }

  @override
  String get consumerExploreSearchHint => 'Search crops, varieties or farms…';

  @override
  String get consumerOrganicOnly => 'Organic only';

  @override
  String consumerListingCount(Object count) {
    return '$count listings';
  }

  @override
  String get consumerExploreLoading => 'Loading the marketplace…';

  @override
  String get consumerExploreEmptyTitle => 'No produce listings found';

  @override
  String get consumerExploreEmptyMessage =>
      'Try another crop, variety or category, or clear the filters.';

  @override
  String consumerAddedToCart(Object product) {
    return '$product added to the cart';
  }

  @override
  String get consumerCropCategoriesUnavailable =>
      'Crop categories could not be loaded.';

  @override
  String get consumerListingTitle => 'Listing';

  @override
  String get consumerHarvested => 'Harvested';

  @override
  String get consumerEnquiryTitle => 'Send direct crop enquiry to farmer';

  @override
  String get consumerEnquirySubject => 'Subject';

  @override
  String get consumerEnquiryMessage => 'Message';

  @override
  String get consumerEnquiryDefaultSubject => 'Bulk purchase enquiry';

  @override
  String consumerEnquiryDefaultMessage(Object title) {
    return 'I am interested in $title. Please share the best wholesale rate.';
  }

  @override
  String get consumerSendEnquiry => 'Send enquiry';

  @override
  String get consumerEnquirySent => 'Enquiry sent to the farmer';

  @override
  String get consumerFarmerListedPrice => 'Farmer listed price';

  @override
  String get consumerAddToCart => 'Add to cart';

  @override
  String get consumerOrderQuantity => 'Order quantity';

  @override
  String get consumerUpdateQuantity => 'Update quantity';

  @override
  String get consumerDecreaseQuantity => 'Decrease quantity';

  @override
  String get consumerIncreaseQuantity => 'Increase quantity';

  @override
  String get consumerCartEmptyTitle => 'Your cart is empty';

  @override
  String get consumerCartEmptyMessage =>
      'Browse the marketplace and add harvest lots to start an order.';

  @override
  String get consumerItems => 'Items';

  @override
  String get consumerItemsTotal => 'Items total';

  @override
  String get consumerTransportAndContainer => 'Transport & container';

  @override
  String get consumerCalculatedAtCheckout => 'Calculated at checkout';

  @override
  String get consumerProceedToCheckout => 'Proceed to checkout';

  @override
  String get consumerCheckoutTitle => 'Direct wholesale checkout';

  @override
  String get consumerOrderSummary => 'Order summary';

  @override
  String get consumerDeliveryAddressRequired =>
      'A delivery address is required.';

  @override
  String get consumerCartEmpty => 'Your cart is empty.';

  @override
  String get consumerOrderPlaced => 'Order placed';

  @override
  String consumerOrderPlacedMessage(Object orderNumber, Object status) {
    return 'Order $orderNumber was created with status $status. The farmer has been notified in real time.';
  }

  @override
  String get consumerViewOrders => 'View orders';

  @override
  String get consumerDeliveryAddress => 'Delivery address';

  @override
  String get consumerLogistics => 'Logistics';

  @override
  String get consumerLogisticsDescription =>
      'Transport and container charges are computed by the shared backend when the farmer confirms the dispatch.';

  @override
  String get consumerTransportCost => 'Transport cost';

  @override
  String get consumerContainerCost => 'Container cost';

  @override
  String consumerPlaceOrder(Object total) {
    return 'Place order · $total';
  }

  @override
  String consumerOrderNumber(Object orderNumber) {
    return 'Order #$orderNumber';
  }

  @override
  String get consumerOrderStatusPending => 'Pending';

  @override
  String get consumerOrderStatusConfirmed => 'Confirmed';

  @override
  String get consumerOrderStatusPacked => 'Packed';

  @override
  String get consumerOrderStatusDispatched => 'Dispatched';

  @override
  String get consumerOrderStatusDelivered => 'Delivered';

  @override
  String get consumerOrderStatusCancelled => 'Cancelled';

  @override
  String get consumerFavoriteAdded => 'Added to favourites';

  @override
  String get consumerFavoriteRemoved => 'Removed from favourites';

  @override
  String consumerProfileViews(Object count) {
    return '$count profile views';
  }

  @override
  String consumerHarvestLotsCount(Object count) {
    return '$count harvest lots';
  }

  @override
  String get consumerActiveHarvestLots => 'Active harvest lots';

  @override
  String get consumerNoActiveHarvestLots => 'No active harvest lots ready';

  @override
  String get consumerOrdersEmptyTitle => 'No orders placed yet';

  @override
  String get consumerOrdersEmptyMessage =>
      'Your wholesale orders will appear here with live dispatch status.';

  @override
  String get profileTitle => 'My Profile';

  @override
  String get profileLanguageHeading => 'Language preference';

  @override
  String get profileLanguageHint =>
      'Your choice is saved to your account and follows you to the website.';

  @override
  String get profileAccountHeading => 'Account';

  @override
  String get profileSignOut => 'Sign out';

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get notificationsEmpty => 'No notifications yet';

  @override
  String get notificationsEmptyBody =>
      'Order updates, new enquiries and chat replies will appear here.';

  @override
  String get notificationsMarkAllRead => 'Mark all as read';

  @override
  String commonRequestFailed(Object message) {
    return 'Request failed: $message';
  }

  @override
  String get commonBuyer => 'Buyer';

  @override
  String get commonCultivator => 'Cultivator';

  @override
  String get commonAdmin => 'Administrator';

  @override
  String get commonFarmConnectUser => 'FarmConnect user';

  @override
  String commonMetersAway(Object distance) {
    return '$distance m away';
  }

  @override
  String commonKilometersAway(Object distance) {
    return '$distance km away';
  }

  @override
  String get commonJustNow => 'Just now';

  @override
  String commonMinutesAgo(Object minutes) {
    return '$minutes min ago';
  }

  @override
  String commonHoursAgo(Object hours) {
    return '$hours hr ago';
  }

  @override
  String commonDaysAgo(Object days) {
    return '$days d ago';
  }

  @override
  String get commonKm => 'km';

  @override
  String get commonDays => 'days';

  @override
  String get authSignIn => 'Sign in';

  @override
  String get authNewUserPrompt => 'New to FarmConnect?';

  @override
  String get authCreateAccount => 'Create an account';

  @override
  String get authMobileOrEmail => 'Mobile number or email';

  @override
  String get authIdentifierRequired => 'Enter your mobile number or email';

  @override
  String get authPasswordMinLength => 'Password must be at least 6 characters';

  @override
  String get authMobileNumber => 'Mobile number';

  @override
  String get authValidMobile => 'Enter a valid 10-digit mobile number';

  @override
  String get authPasswordTab => 'Password';

  @override
  String get authMobileTab => 'Mobile';

  @override
  String get authMobileSignIn => 'Sign in with mobile';

  @override
  String get authMobileSignInHint =>
      'Enter the mobile number and the password of your account. The role of the account decides which workspace opens.';

  @override
  String get authCreateAccountTitle => 'Create your account';

  @override
  String get authRegisterAsCultivator => 'Register as cultivator';

  @override
  String get authRegisterAsBuyer => 'Register as buyer';

  @override
  String get authFullName => 'Full name';

  @override
  String get authNameRequired => 'Enter your name';

  @override
  String get authEmailOptional => 'Email (optional)';

  @override
  String get authFarmAddress => 'Farm address';

  @override
  String get authPinCode => 'PIN code';

  @override
  String get authSameAccountNote =>
      'The same account works on the FarmConnect website and on this app.';

  @override
  String get authShowPassword => 'Show password';

  @override
  String get authHidePassword => 'Hide password';

  @override
  String get profileLogoutTitle => 'Log out?';

  @override
  String get profileLogoutMessage =>
      'You will need to sign in again to access your account.';

  @override
  String get profileEditTitle => 'Edit profile';

  @override
  String get profileMobileNumber => 'Mobile number';

  @override
  String get profileUpdated => 'Profile updated';

  @override
  String get profileIdentityVerificationTitle =>
      'Cultivator identity verification';

  @override
  String get profileIdentityNumberLabel => '12-digit identity number';

  @override
  String get profileVerify => 'Verify';

  @override
  String get profileVerificationCompleted => 'Identity verification completed';

  @override
  String get profileNotSignedIn => 'Not signed in';

  @override
  String get profileMyFavorites => 'My favourites';

  @override
  String get profileMyComplaints => 'My complaints';

  @override
  String get profileLogisticsCalculator => 'Logistics & profit calculator';

  @override
  String get profileApmcRates => 'APMC mandi rates';

  @override
  String get profileVerifyCultivator => 'Verify cultivator identity';

  @override
  String get profileShareFarmPosition => 'Share my farm position';

  @override
  String get profileShareDeliveryPosition => 'Share my delivery position';

  @override
  String get profilePositionNotShared => 'Not shared yet';

  @override
  String get profilePositionSaved => 'Your position was saved.';

  @override
  String get profilePositionFailed =>
      'The position could not be saved. Please try again.';

  @override
  String get profilePositionPermissionDenied =>
      'The position permission was denied, so nothing was shared.';

  @override
  String get profilePositionServiceDisabled =>
      'The location service of this device is switched off.';

  @override
  String get profileSharedAccountNote =>
      'This account is shared with the FarmConnect website — orders, listings and conversations stay in sync.';

  @override
  String get complaintsPageTitle => 'My complaints';

  @override
  String get complaintsRaiseTitle => 'Raise a complaint';

  @override
  String get complaintsRaiseButton => 'Raise complaint';

  @override
  String get complaintsAgainst => 'Against';

  @override
  String get complaintsEntityOrder => 'Order';

  @override
  String get complaintsEntityProduct => 'Product listing';

  @override
  String get complaintsEntityCultivator => 'Cultivator';

  @override
  String get complaintsEntityConversation => 'Conversation';

  @override
  String get complaintsEntityGeneral => 'General';

  @override
  String get complaintsReferenceId => 'Reference ID';

  @override
  String get complaintsReason => 'Reason';

  @override
  String get complaintsDetails => 'Details';

  @override
  String get complaintsRegistered => 'Complaint registered';

  @override
  String get complaintsEmptyTitle => 'No complaints registered';

  @override
  String get complaintsEmptyMessage =>
      'Raise a complaint when an order, listing or conversation needs attention.';

  @override
  String complaintsAdminResponse(Object notes) {
    return 'Admin response: $notes';
  }

  @override
  String get complaintStatusPending => 'Pending';

  @override
  String get complaintStatusInReview => 'In review';

  @override
  String get complaintStatusResolved => 'Resolved';

  @override
  String get complaintStatusDismissed => 'Dismissed';

  @override
  String get chatConversationTitle => 'Conversation';

  @override
  String get chatNoMessagesTitle => 'No messages yet';

  @override
  String get chatNoMessagesMessage =>
      'Start the negotiation — messages are shared with the other party in real time.';

  @override
  String get chatWriteMessage => 'Write a message…';

  @override
  String get chatSendMessage => 'Send message';

  @override
  String get enquiriesFarmerEmptyTitle => 'No buyer enquiries';

  @override
  String get enquiriesConsumerEmptyTitle => 'No enquiries yet';

  @override
  String get enquiriesFarmerEmptyMessage =>
      'Buyer negotiations for your harvest lots will appear here.';

  @override
  String get enquiriesConsumerEmptyMessage =>
      'Start a negotiation from a product listing to talk directly with the farmer.';

  @override
  String get enquiryStatusOpen => 'Open';

  @override
  String get enquiryStatusNegotiating => 'Negotiating';

  @override
  String get enquiryStatusAccepted => 'Accepted';

  @override
  String get enquiryStatusClosed => 'Closed';

  @override
  String get ordersTrackingTitle => 'Order tracking';

  @override
  String get ordersDeliveryReceiptConfirmed => 'Delivery receipt confirmed';

  @override
  String get ordersConfirmDeliveryReceipt => 'Confirm delivery receipt';

  @override
  String get ordersItemsTotal => 'Items total';

  @override
  String get ordersTransportCost => 'Transport';

  @override
  String get ordersContainerCost => 'Container';

  @override
  String get ordersGrandTotal => 'Grand total';

  @override
  String get ordersDelivery => 'Delivery';

  @override
  String ordersCultivatorLabel(Object name) {
    return 'Cultivator: $name';
  }

  @override
  String ordersBuyerLabel(Object name) {
    return 'Buyer: $name';
  }

  @override
  String ordersPhoneLabel(Object phone) {
    return 'Phone: $phone';
  }

  @override
  String get ordersTimelinePlaced => 'Order placed';

  @override
  String get ordersTimelinePacked => 'Packed by farmer';

  @override
  String get favoritesListingsTitle => 'Favourite listings';

  @override
  String get favoritesCultivatorsTitle => 'Favourite cultivators';

  @override
  String get favoritesEmptyMessage =>
      'Tap the heart on a listing or a farm to keep it handy for later.';

  @override
  String get mapLoadingNearbyFarms => 'Loading nearby farms…';

  @override
  String mapVerifiedFarmsNearby(
    Object count,
    Object latitude,
    Object longitude,
  ) {
    return '$count verified farms near $latitude, $longitude';
  }

  @override
  String get mapUseMyLocation => 'Use my location';

  @override
  String get mapLocationPermissionDenied => 'Location permission was denied.';

  @override
  String get marketRatesSearchHint =>
      'Search commodity, district or market centre';

  @override
  String get marketRatesEmptyTitle => 'No market rates found';

  @override
  String get marketRatesEmptyMessage =>
      'APMC rates are refreshed from the shared backend database.';

  @override
  String get marketRatesMinimum => 'Minimum';

  @override
  String get marketRatesModal => 'Modal';

  @override
  String get marketRatesMaximum => 'Maximum';

  @override
  String get logisticsTitle => 'Geo-Logistics & Trade Profit Hub';

  @override
  String get logisticsDescription =>
      'Costs are calculated by the shared FarmConnect backend so the website and the Android app always quote the same logistics.';

  @override
  String get logisticsCropQuantityKg => 'Crop quantity (kg)';

  @override
  String get logisticsFarmerPricePerKg => 'Farmer price per kg';

  @override
  String get logisticsApmcModalPrice => 'APMC modal price per quintal';

  @override
  String get logisticsContainerType => 'Container type';

  @override
  String get logisticsStandardCrate => 'Standard crate';

  @override
  String get logisticsColdChain => 'Cold chain refrigerated';

  @override
  String get logisticsMoistureControlled => 'Moisture controlled';

  @override
  String get logisticsVentilatedJute => 'Ventilated jute';

  @override
  String get logisticsCalculate => 'Calculate logistics & profit';

  @override
  String get logisticsQuotation => 'Quotation';

  @override
  String get logisticsDistance => 'Distance';

  @override
  String get logisticsTotalCost => 'Total logistics cost';

  @override
  String get logisticsApmcValue => 'APMC value';

  @override
  String get logisticsEstimatedProfit => 'Estimated profit';

  @override
  String get logisticsProfitMargin => 'Profit margin';

  @override
  String get logisticsSelectListing => 'Crop lot';

  @override
  String get logisticsNoListings =>
      'No live crop lot is available in the shared catalogue.';

  @override
  String get logisticsPriceFromListing =>
      'The farmer\'s listed price of the selected crop lot.';

  @override
  String logisticsBenchmarkSource(Object source) {
    return 'Published by $source';
  }

  @override
  String get logisticsNoPublishedBenchmarkHint =>
      'No APMC benchmark has been published for this crop, so the profit against the mandi cannot be stated.';

  @override
  String get logisticsMissingFarmerPrice =>
      'The listing carries no price, so the landed cost cannot be computed.';

  @override
  String get logisticsMissingFarmCoordinates =>
      'The farm of this listing has no coordinates, so the freight distance cannot be computed.';

  @override
  String get logisticsMissingDestinationCoordinates =>
      'Your delivery address has no coordinates, so the freight distance cannot be computed.';

  @override
  String get logisticsInvalidQuantity =>
      'Enter the crop quantity in kilograms.';

  @override
  String get logisticsCoordinatesHint =>
      'The farm coordinates come from the selected listing and the delivery coordinates from your account profile.';

  @override
  String get logisticsNotAvailable => '—';

  @override
  String get adminOverview => 'Overview';

  @override
  String get adminUsers => 'Users';

  @override
  String get adminComplaints => 'Complaints';

  @override
  String get adminResolveComplaint => 'Resolve complaint';

  @override
  String get adminResolutionNotes => 'Resolution notes';

  @override
  String get adminResolve => 'Resolve';

  @override
  String get adminNoMetrics => 'No platform metrics available yet.';

  @override
  String get adminNoUsers => 'No users found';

  @override
  String get adminNoComplaints => 'No complaints';

  @override
  String get adminComplaintFallback => 'Complaint';

  @override
  String get adminMetricTotalUsers => 'Total users';

  @override
  String get adminMetricTotalFarmers => 'Total cultivators';

  @override
  String get adminMetricTotalConsumers => 'Total buyers';

  @override
  String get adminMetricActiveProducts => 'Active listings';

  @override
  String get adminMetricActiveOrders => 'Active orders';

  @override
  String get adminMetricPendingComplaints => 'Pending complaints';

  @override
  String get homeFarmerDashboardTitle => 'Farmer dashboard';

  @override
  String get homeHarvestInventoryTitle => 'Harvest inventory';

  @override
  String get homeIncomingOrdersTitle => 'Incoming orders';

  @override
  String get homeCustomerInquiriesTitle => 'Buyer enquiries';

  @override
  String get homeAdminConsoleTitle => 'Admin console';

  @override
  String get homeConsoleLabel => 'Console';

  @override
  String get homeRatesLabel => 'Rates';

  @override
  String get homeMarketplaceTitle => 'Marketplace';

  @override
  String get homeMyOrdersTitle => 'My orders';

  @override
  String get homeMyCartTitle => 'My cart';

  @override
  String farmerCardLotsCount(Object count) {
    return '$count lots';
  }
}
