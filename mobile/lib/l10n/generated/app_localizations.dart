import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_kn.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('kn'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'FarmConnect'**
  String get appTitle;

  /// No description provided for @appTagline.
  ///
  /// In en, this message translates to:
  /// **'Direct trade between cultivators and buyers'**
  String get appTagline;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navLots.
  ///
  /// In en, this message translates to:
  /// **'Lots'**
  String get navLots;

  /// No description provided for @navOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get navOrders;

  /// No description provided for @navEnquiries.
  ///
  /// In en, this message translates to:
  /// **'Enquiries'**
  String get navEnquiries;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @navExplore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get navExplore;

  /// No description provided for @navFavorites.
  ///
  /// In en, this message translates to:
  /// **'Favourites'**
  String get navFavorites;

  /// No description provided for @navCart.
  ///
  /// In en, this message translates to:
  /// **'Cart'**
  String get navCart;

  /// No description provided for @navNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get navNotifications;

  /// No description provided for @navChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get navChat;

  /// No description provided for @navMap.
  ///
  /// In en, this message translates to:
  /// **'Farm Map'**
  String get navMap;

  /// No description provided for @navMarketRates.
  ///
  /// In en, this message translates to:
  /// **'Mandi Rates'**
  String get navMarketRates;

  /// No description provided for @navLogistics.
  ///
  /// In en, this message translates to:
  /// **'Logistics'**
  String get navLogistics;

  /// No description provided for @navComplaints.
  ///
  /// In en, this message translates to:
  /// **'Complaints'**
  String get navComplaints;

  /// No description provided for @navAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get navAdmin;

  /// No description provided for @navLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get navLanguage;

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get commonLoading;

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get commonRetry;

  /// No description provided for @commonErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get commonErrorTitle;

  /// No description provided for @commonErrorBody.
  ///
  /// In en, this message translates to:
  /// **'We could not complete this request. Please try again.'**
  String get commonErrorBody;

  /// No description provided for @commonNoResults.
  ///
  /// In en, this message translates to:
  /// **'No results found'**
  String get commonNoResults;

  /// No description provided for @commonSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get commonSearch;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get commonClose;

  /// No description provided for @commonBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get commonBack;

  /// No description provided for @commonNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get commonNext;

  /// No description provided for @commonSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get commonSubmit;

  /// No description provided for @commonConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get commonConfirm;

  /// No description provided for @commonViewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get commonViewAll;

  /// No description provided for @commonOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get commonOptional;

  /// No description provided for @commonRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get commonRequired;

  /// No description provided for @commonAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get commonAll;

  /// No description provided for @commonYes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get commonYes;

  /// No description provided for @commonNo.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get commonNo;

  /// No description provided for @commonAvailable.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get commonAvailable;

  /// No description provided for @commonUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Unavailable'**
  String get commonUnavailable;

  /// No description provided for @commonQuantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get commonQuantity;

  /// No description provided for @commonPrice.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get commonPrice;

  /// No description provided for @commonPerKg.
  ///
  /// In en, this message translates to:
  /// **'per kg'**
  String get commonPerKg;

  /// No description provided for @commonKg.
  ///
  /// In en, this message translates to:
  /// **'kg'**
  String get commonKg;

  /// No description provided for @commonMinOrder.
  ///
  /// In en, this message translates to:
  /// **'Minimum order'**
  String get commonMinOrder;

  /// No description provided for @commonGrade.
  ///
  /// In en, this message translates to:
  /// **'Grade'**
  String get commonGrade;

  /// No description provided for @commonOrganic.
  ///
  /// In en, this message translates to:
  /// **'Organic'**
  String get commonOrganic;

  /// No description provided for @commonLocation.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get commonLocation;

  /// No description provided for @commonVariety.
  ///
  /// In en, this message translates to:
  /// **'Variety'**
  String get commonVariety;

  /// No description provided for @commonCrop.
  ///
  /// In en, this message translates to:
  /// **'Crop'**
  String get commonCrop;

  /// No description provided for @commonCropName.
  ///
  /// In en, this message translates to:
  /// **'Crop name'**
  String get commonCropName;

  /// No description provided for @commonCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get commonCategory;

  /// No description provided for @commonFarmer.
  ///
  /// In en, this message translates to:
  /// **'Farmer'**
  String get commonFarmer;

  /// No description provided for @commonFarmName.
  ///
  /// In en, this message translates to:
  /// **'Farm name'**
  String get commonFarmName;

  /// No description provided for @commonDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get commonDescription;

  /// No description provided for @commonImage.
  ///
  /// In en, this message translates to:
  /// **'Image'**
  String get commonImage;

  /// No description provided for @commonPriceUnit.
  ///
  /// In en, this message translates to:
  /// **'Price unit'**
  String get commonPriceUnit;

  /// No description provided for @commonQuantityUnit.
  ///
  /// In en, this message translates to:
  /// **'Quantity unit'**
  String get commonQuantityUnit;

  /// No description provided for @commonMinOrderKg.
  ///
  /// In en, this message translates to:
  /// **'Minimum order (kg)'**
  String get commonMinOrderKg;

  /// No description provided for @commonDistrict.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get commonDistrict;

  /// No description provided for @commonState.
  ///
  /// In en, this message translates to:
  /// **'State'**
  String get commonState;

  /// No description provided for @commonEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get commonEmail;

  /// No description provided for @commonPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get commonPhone;

  /// No description provided for @commonName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get commonName;

  /// No description provided for @commonPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get commonPassword;

  /// No description provided for @commonRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get commonRole;

  /// No description provided for @commonStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get commonStatus;

  /// No description provided for @commonDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get commonDate;

  /// No description provided for @commonTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get commonTotal;

  /// No description provided for @commonEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get commonEdit;

  /// No description provided for @commonDelete.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get commonDelete;

  /// No description provided for @commonAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get commonAdd;

  /// No description provided for @commonApply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get commonApply;

  /// No description provided for @commonClear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get commonClear;

  /// No description provided for @commonFilters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get commonFilters;

  /// No description provided for @commonLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get commonLanguage;

  /// No description provided for @commonUpdated.
  ///
  /// In en, this message translates to:
  /// **'Updated'**
  String get commonUpdated;

  /// No description provided for @commonCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get commonCreated;

  /// No description provided for @commonUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get commonUnknown;

  /// No description provided for @commonNotFound.
  ///
  /// In en, this message translates to:
  /// **'Not found'**
  String get commonNotFound;

  /// No description provided for @commonSomethingWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get commonSomethingWrong;

  /// No description provided for @languageHeading.
  ///
  /// In en, this message translates to:
  /// **'Choose your language'**
  String get languageHeading;

  /// No description provided for @languageSwitch.
  ///
  /// In en, this message translates to:
  /// **'Switch language'**
  String get languageSwitch;

  /// No description provided for @languageCurrent.
  ///
  /// In en, this message translates to:
  /// **'Current language: {language}'**
  String languageCurrent(Object language);

  /// No description provided for @languageSaved.
  ///
  /// In en, this message translates to:
  /// **'Language preference saved'**
  String get languageSaved;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageKannada.
  ///
  /// In en, this message translates to:
  /// **'ಕನ್ನಡ'**
  String get languageKannada;

  /// No description provided for @languageHindi.
  ///
  /// In en, this message translates to:
  /// **'हिन्दी'**
  String get languageHindi;

  /// No description provided for @emptyProducts.
  ///
  /// In en, this message translates to:
  /// **'No harvest lots published yet'**
  String get emptyProducts;

  /// No description provided for @emptyOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get emptyOrders;

  /// No description provided for @emptyEnquiries.
  ///
  /// In en, this message translates to:
  /// **'No enquiries yet'**
  String get emptyEnquiries;

  /// No description provided for @emptyFavorites.
  ///
  /// In en, this message translates to:
  /// **'No favourites yet'**
  String get emptyFavorites;

  /// No description provided for @emptyChats.
  ///
  /// In en, this message translates to:
  /// **'No conversations yet'**
  String get emptyChats;

  /// No description provided for @emptyComplaints.
  ///
  /// In en, this message translates to:
  /// **'No complaints raised'**
  String get emptyComplaints;

  /// No description provided for @emptyNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get emptyNotifications;

  /// No description provided for @emptySearchHint.
  ///
  /// In en, this message translates to:
  /// **'Try another crop, variety or district.'**
  String get emptySearchHint;

  /// No description provided for @farmerRequestFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not complete the request: {message}'**
  String farmerRequestFailed(Object message);

  /// No description provided for @farmerDashboardHarvestLots.
  ///
  /// In en, this message translates to:
  /// **'Harvest lots'**
  String get farmerDashboardHarvestLots;

  /// No description provided for @farmerDashboardAvailableLots.
  ///
  /// In en, this message translates to:
  /// **'Available lots'**
  String get farmerDashboardAvailableLots;

  /// No description provided for @farmerDashboardEnquiries.
  ///
  /// In en, this message translates to:
  /// **'Enquiries'**
  String get farmerDashboardEnquiries;

  /// No description provided for @farmerDashboardProfileViews.
  ///
  /// In en, this message translates to:
  /// **'Profile views'**
  String get farmerDashboardProfileViews;

  /// No description provided for @farmerDashboardMyHarvestBatches.
  ///
  /// In en, this message translates to:
  /// **'My harvest batches'**
  String get farmerDashboardMyHarvestBatches;

  /// No description provided for @farmerDashboardListLot.
  ///
  /// In en, this message translates to:
  /// **'List lot'**
  String get farmerDashboardListLot;

  /// No description provided for @farmerDashboardNoHarvestBatches.
  ///
  /// In en, this message translates to:
  /// **'No harvest batches found'**
  String get farmerDashboardNoHarvestBatches;

  /// No description provided for @farmerProductsAvailableOnly.
  ///
  /// In en, this message translates to:
  /// **'Available only'**
  String get farmerProductsAvailableOnly;

  /// No description provided for @farmerProductsNewLot.
  ///
  /// In en, this message translates to:
  /// **'New lot'**
  String get farmerProductsNewLot;

  /// No description provided for @farmerProductsRemoveTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove harvest lot?'**
  String get farmerProductsRemoveTitle;

  /// No description provided for @farmerProductsRemoveMessage.
  ///
  /// In en, this message translates to:
  /// **'\"{title}\" will be removed from the marketplace.'**
  String farmerProductsRemoveMessage(Object title);

  /// No description provided for @farmerProductsRemoved.
  ///
  /// In en, this message translates to:
  /// **'Harvest lot removed'**
  String get farmerProductsRemoved;

  /// No description provided for @farmerProductsAvailableForBuyers.
  ///
  /// In en, this message translates to:
  /// **'Available for buyers'**
  String get farmerProductsAvailableForBuyers;

  /// No description provided for @farmerProductsMarkedUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Marked unavailable'**
  String get farmerProductsMarkedUnavailable;

  /// No description provided for @farmerProductsEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No harvest lots found'**
  String get farmerProductsEmptyTitle;

  /// No description provided for @farmerProductsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'List your first crop lot to reach buyers on the website and the app.'**
  String get farmerProductsEmptyMessage;

  /// No description provided for @farmerOrderStatusSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'Update dispatch status'**
  String get farmerOrderStatusSheetTitle;

  /// No description provided for @farmerOrderStatusUpdated.
  ///
  /// In en, this message translates to:
  /// **'Order marked as {status}'**
  String farmerOrderStatusUpdated(Object status);

  /// No description provided for @farmerOrderUpdateStatus.
  ///
  /// In en, this message translates to:
  /// **'Update status'**
  String get farmerOrderUpdateStatus;

  /// No description provided for @farmerOrdersEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No orders found'**
  String get farmerOrdersEmptyTitle;

  /// No description provided for @farmerOrdersEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Orders placed by buyers on the website or the app will appear here.'**
  String get farmerOrdersEmptyMessage;

  /// No description provided for @farmerOrderNumber.
  ///
  /// In en, this message translates to:
  /// **'Order #{orderNumber}'**
  String farmerOrderNumber(Object orderNumber);

  /// No description provided for @farmerOrderBuyerLabel.
  ///
  /// In en, this message translates to:
  /// **'Buyer: {buyer}'**
  String farmerOrderBuyerLabel(Object buyer);

  /// No description provided for @farmerOrderStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get farmerOrderStatusPending;

  /// No description provided for @farmerOrderStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Packed'**
  String get farmerOrderStatusConfirmed;

  /// No description provided for @farmerOrderStatusDispatched.
  ///
  /// In en, this message translates to:
  /// **'Dispatched'**
  String get farmerOrderStatusDispatched;

  /// No description provided for @farmerOrderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get farmerOrderStatusDelivered;

  /// No description provided for @farmerOrderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get farmerOrderStatusCancelled;

  /// No description provided for @farmerFormEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Modify crop lot'**
  String get farmerFormEditTitle;

  /// No description provided for @farmerFormCreateTitle.
  ///
  /// In en, this message translates to:
  /// **'List fresh harvest lot'**
  String get farmerFormCreateTitle;

  /// No description provided for @farmerFormCropTitle.
  ///
  /// In en, this message translates to:
  /// **'Crop title'**
  String get farmerFormCropTitle;

  /// No description provided for @farmerFormCropTitleRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a crop title'**
  String get farmerFormCropTitleRequired;

  /// No description provided for @farmerFormDescriptionRequired.
  ///
  /// In en, this message translates to:
  /// **'Describe your harvest lot'**
  String get farmerFormDescriptionRequired;

  /// No description provided for @farmerFormPricePerUnit.
  ///
  /// In en, this message translates to:
  /// **'Price per unit'**
  String get farmerFormPricePerUnit;

  /// No description provided for @farmerFormValidPrice.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid price'**
  String get farmerFormValidPrice;

  /// No description provided for @farmerFormValidQuantity.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid quantity'**
  String get farmerFormValidQuantity;

  /// No description provided for @farmerFormQuantityAvailable.
  ///
  /// In en, this message translates to:
  /// **'Quantity available'**
  String get farmerFormQuantityAvailable;

  /// No description provided for @farmerFormMinimumOrderQuantity.
  ///
  /// In en, this message translates to:
  /// **'Minimum order quantity'**
  String get farmerFormMinimumOrderQuantity;

  /// No description provided for @farmerFormMinimumOrderPositive.
  ///
  /// In en, this message translates to:
  /// **'Minimum order must be greater than zero'**
  String get farmerFormMinimumOrderPositive;

  /// No description provided for @farmerDefaultGrade.
  ///
  /// In en, this message translates to:
  /// **'Export grade A'**
  String get farmerDefaultGrade;

  /// No description provided for @farmerDefaultLocation.
  ///
  /// In en, this message translates to:
  /// **'Karnataka'**
  String get farmerDefaultLocation;

  /// No description provided for @farmerFormOrganicTitle.
  ///
  /// In en, this message translates to:
  /// **'Certified organic produce'**
  String get farmerFormOrganicTitle;

  /// No description provided for @farmerFormOrganicSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Organic lots are highlighted in the marketplace'**
  String get farmerFormOrganicSubtitle;

  /// No description provided for @farmerFormUpdated.
  ///
  /// In en, this message translates to:
  /// **'Harvest lot updated'**
  String get farmerFormUpdated;

  /// No description provided for @farmerFormListed.
  ///
  /// In en, this message translates to:
  /// **'Harvest lot listed'**
  String get farmerFormListed;

  /// No description provided for @farmerFormCamera.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get farmerFormCamera;

  /// No description provided for @farmerFormGallery.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get farmerFormGallery;

  /// No description provided for @farmerFormImageUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'The image could not be uploaded.'**
  String get farmerFormImageUploadFailed;

  /// No description provided for @farmerFormCropNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a crop name'**
  String get farmerFormCropNameRequired;

  /// No description provided for @farmerCropSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search crop names'**
  String get farmerCropSearchHint;

  /// No description provided for @farmerCropSuggestions.
  ///
  /// In en, this message translates to:
  /// **'Crop suggestions'**
  String get farmerCropSuggestions;

  /// No description provided for @farmerCropCatalogueError.
  ///
  /// In en, this message translates to:
  /// **'The crop catalogue could not be loaded.'**
  String get farmerCropCatalogueError;

  /// No description provided for @farmerCategoriesLoadError.
  ///
  /// In en, this message translates to:
  /// **'Crop categories could not be loaded.'**
  String get farmerCategoriesLoadError;

  /// No description provided for @farmerNoCategory.
  ///
  /// In en, this message translates to:
  /// **'No category'**
  String get farmerNoCategory;

  /// No description provided for @farmerPerQuintal.
  ///
  /// In en, this message translates to:
  /// **'per quintal'**
  String get farmerPerQuintal;

  /// No description provided for @farmerPerDozen.
  ///
  /// In en, this message translates to:
  /// **'per dozen'**
  String get farmerPerDozen;

  /// No description provided for @farmerPerTon.
  ///
  /// In en, this message translates to:
  /// **'per ton'**
  String get farmerPerTon;

  /// No description provided for @farmerQuintal.
  ///
  /// In en, this message translates to:
  /// **'Quintal'**
  String get farmerQuintal;

  /// No description provided for @farmerDozen.
  ///
  /// In en, this message translates to:
  /// **'Dozen'**
  String get farmerDozen;

  /// No description provided for @farmerTon.
  ///
  /// In en, this message translates to:
  /// **'Ton'**
  String get farmerTon;

  /// No description provided for @farmerPublishLot.
  ///
  /// In en, this message translates to:
  /// **'Publish harvest lot'**
  String get farmerPublishLot;

  /// No description provided for @farmerSaveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get farmerSaveChanges;

  /// No description provided for @consumerRequestFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not complete the request: {message}'**
  String consumerRequestFailed(Object message);

  /// No description provided for @consumerExploreSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search crops, varieties or farms…'**
  String get consumerExploreSearchHint;

  /// No description provided for @consumerOrganicOnly.
  ///
  /// In en, this message translates to:
  /// **'Organic only'**
  String get consumerOrganicOnly;

  /// No description provided for @consumerListingCount.
  ///
  /// In en, this message translates to:
  /// **'{count} listings'**
  String consumerListingCount(Object count);

  /// No description provided for @consumerExploreLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading the marketplace…'**
  String get consumerExploreLoading;

  /// No description provided for @consumerExploreEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No produce listings found'**
  String get consumerExploreEmptyTitle;

  /// No description provided for @consumerExploreEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Try another crop, variety or category, or clear the filters.'**
  String get consumerExploreEmptyMessage;

  /// No description provided for @consumerAddedToCart.
  ///
  /// In en, this message translates to:
  /// **'{product} added to the cart'**
  String consumerAddedToCart(Object product);

  /// No description provided for @consumerCropCategoriesUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Crop categories could not be loaded.'**
  String get consumerCropCategoriesUnavailable;

  /// No description provided for @consumerListingTitle.
  ///
  /// In en, this message translates to:
  /// **'Listing'**
  String get consumerListingTitle;

  /// No description provided for @consumerHarvested.
  ///
  /// In en, this message translates to:
  /// **'Harvested'**
  String get consumerHarvested;

  /// No description provided for @consumerEnquiryTitle.
  ///
  /// In en, this message translates to:
  /// **'Send direct crop enquiry to farmer'**
  String get consumerEnquiryTitle;

  /// No description provided for @consumerEnquirySubject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get consumerEnquirySubject;

  /// No description provided for @consumerEnquiryMessage.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get consumerEnquiryMessage;

  /// No description provided for @consumerEnquiryDefaultSubject.
  ///
  /// In en, this message translates to:
  /// **'Bulk purchase enquiry'**
  String get consumerEnquiryDefaultSubject;

  /// No description provided for @consumerEnquiryDefaultMessage.
  ///
  /// In en, this message translates to:
  /// **'I am interested in {title}. Please share the best wholesale rate.'**
  String consumerEnquiryDefaultMessage(Object title);

  /// No description provided for @consumerSendEnquiry.
  ///
  /// In en, this message translates to:
  /// **'Send enquiry'**
  String get consumerSendEnquiry;

  /// No description provided for @consumerEnquirySent.
  ///
  /// In en, this message translates to:
  /// **'Enquiry sent to the farmer'**
  String get consumerEnquirySent;

  /// No description provided for @consumerFarmerListedPrice.
  ///
  /// In en, this message translates to:
  /// **'Farmer listed price'**
  String get consumerFarmerListedPrice;

  /// No description provided for @consumerAddToCart.
  ///
  /// In en, this message translates to:
  /// **'Add to cart'**
  String get consumerAddToCart;

  /// No description provided for @consumerOrderQuantity.
  ///
  /// In en, this message translates to:
  /// **'Order quantity'**
  String get consumerOrderQuantity;

  /// No description provided for @consumerUpdateQuantity.
  ///
  /// In en, this message translates to:
  /// **'Update quantity'**
  String get consumerUpdateQuantity;

  /// No description provided for @consumerDecreaseQuantity.
  ///
  /// In en, this message translates to:
  /// **'Decrease quantity'**
  String get consumerDecreaseQuantity;

  /// No description provided for @consumerIncreaseQuantity.
  ///
  /// In en, this message translates to:
  /// **'Increase quantity'**
  String get consumerIncreaseQuantity;

  /// No description provided for @consumerCartEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your cart is empty'**
  String get consumerCartEmptyTitle;

  /// No description provided for @consumerCartEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Browse the marketplace and add harvest lots to start an order.'**
  String get consumerCartEmptyMessage;

  /// No description provided for @consumerItems.
  ///
  /// In en, this message translates to:
  /// **'Items'**
  String get consumerItems;

  /// No description provided for @consumerItemsTotal.
  ///
  /// In en, this message translates to:
  /// **'Items total'**
  String get consumerItemsTotal;

  /// No description provided for @consumerTransportAndContainer.
  ///
  /// In en, this message translates to:
  /// **'Transport & container'**
  String get consumerTransportAndContainer;

  /// No description provided for @consumerCalculatedAtCheckout.
  ///
  /// In en, this message translates to:
  /// **'Calculated at checkout'**
  String get consumerCalculatedAtCheckout;

  /// No description provided for @consumerProceedToCheckout.
  ///
  /// In en, this message translates to:
  /// **'Proceed to checkout'**
  String get consumerProceedToCheckout;

  /// No description provided for @consumerCheckoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Direct wholesale checkout'**
  String get consumerCheckoutTitle;

  /// No description provided for @consumerOrderSummary.
  ///
  /// In en, this message translates to:
  /// **'Order summary'**
  String get consumerOrderSummary;

  /// No description provided for @consumerDeliveryAddressRequired.
  ///
  /// In en, this message translates to:
  /// **'A delivery address is required.'**
  String get consumerDeliveryAddressRequired;

  /// No description provided for @consumerCartEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your cart is empty.'**
  String get consumerCartEmpty;

  /// No description provided for @consumerOrderPlaced.
  ///
  /// In en, this message translates to:
  /// **'Order placed'**
  String get consumerOrderPlaced;

  /// No description provided for @consumerOrderPlacedMessage.
  ///
  /// In en, this message translates to:
  /// **'Order {orderNumber} was created with status {status}. The farmer has been notified in real time.'**
  String consumerOrderPlacedMessage(Object orderNumber, Object status);

  /// No description provided for @consumerViewOrders.
  ///
  /// In en, this message translates to:
  /// **'View orders'**
  String get consumerViewOrders;

  /// No description provided for @consumerDeliveryAddress.
  ///
  /// In en, this message translates to:
  /// **'Delivery address'**
  String get consumerDeliveryAddress;

  /// No description provided for @consumerLogistics.
  ///
  /// In en, this message translates to:
  /// **'Logistics'**
  String get consumerLogistics;

  /// No description provided for @consumerLogisticsDescription.
  ///
  /// In en, this message translates to:
  /// **'Transport and container charges are computed by the shared backend when the farmer confirms the dispatch.'**
  String get consumerLogisticsDescription;

  /// No description provided for @consumerTransportCost.
  ///
  /// In en, this message translates to:
  /// **'Transport cost'**
  String get consumerTransportCost;

  /// No description provided for @consumerContainerCost.
  ///
  /// In en, this message translates to:
  /// **'Container cost'**
  String get consumerContainerCost;

  /// No description provided for @consumerPlaceOrder.
  ///
  /// In en, this message translates to:
  /// **'Place order · {total}'**
  String consumerPlaceOrder(Object total);

  /// No description provided for @consumerOrderNumber.
  ///
  /// In en, this message translates to:
  /// **'Order #{orderNumber}'**
  String consumerOrderNumber(Object orderNumber);

  /// No description provided for @consumerOrderStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get consumerOrderStatusPending;

  /// No description provided for @consumerOrderStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Packed'**
  String get consumerOrderStatusConfirmed;

  /// No description provided for @consumerOrderStatusDispatched.
  ///
  /// In en, this message translates to:
  /// **'Dispatched'**
  String get consumerOrderStatusDispatched;

  /// No description provided for @consumerOrderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get consumerOrderStatusDelivered;

  /// No description provided for @consumerOrderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get consumerOrderStatusCancelled;

  /// No description provided for @consumerFavoriteAdded.
  ///
  /// In en, this message translates to:
  /// **'Added to favourites'**
  String get consumerFavoriteAdded;

  /// No description provided for @consumerFavoriteRemoved.
  ///
  /// In en, this message translates to:
  /// **'Removed from favourites'**
  String get consumerFavoriteRemoved;

  /// No description provided for @consumerProfileViews.
  ///
  /// In en, this message translates to:
  /// **'{count} profile views'**
  String consumerProfileViews(Object count);

  /// No description provided for @consumerHarvestLotsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} harvest lots'**
  String consumerHarvestLotsCount(Object count);

  /// No description provided for @consumerActiveHarvestLots.
  ///
  /// In en, this message translates to:
  /// **'Active harvest lots'**
  String get consumerActiveHarvestLots;

  /// No description provided for @consumerNoActiveHarvestLots.
  ///
  /// In en, this message translates to:
  /// **'No active harvest lots ready'**
  String get consumerNoActiveHarvestLots;

  /// No description provided for @consumerOrdersEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No orders placed yet'**
  String get consumerOrdersEmptyTitle;

  /// No description provided for @consumerOrdersEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Your wholesale orders will appear here with live dispatch status.'**
  String get consumerOrdersEmptyMessage;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'My Profile'**
  String get profileTitle;

  /// No description provided for @profileLanguageHeading.
  ///
  /// In en, this message translates to:
  /// **'Language preference'**
  String get profileLanguageHeading;

  /// No description provided for @profileLanguageHint.
  ///
  /// In en, this message translates to:
  /// **'Your choice is saved to your account and follows you to the website.'**
  String get profileLanguageHint;

  /// No description provided for @profileAccountHeading.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get profileAccountHeading;

  /// No description provided for @profileSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get profileSignOut;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get notificationsEmpty;

  /// No description provided for @notificationsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Order updates, new enquiries and chat replies will appear here.'**
  String get notificationsEmptyBody;

  /// No description provided for @notificationsMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all as read'**
  String get notificationsMarkAllRead;

  /// No description provided for @commonRequestFailed.
  ///
  /// In en, this message translates to:
  /// **'Request failed: {message}'**
  String commonRequestFailed(Object message);

  /// No description provided for @commonBuyer.
  ///
  /// In en, this message translates to:
  /// **'Buyer'**
  String get commonBuyer;

  /// No description provided for @commonCultivator.
  ///
  /// In en, this message translates to:
  /// **'Cultivator'**
  String get commonCultivator;

  /// No description provided for @commonAdmin.
  ///
  /// In en, this message translates to:
  /// **'Administrator'**
  String get commonAdmin;

  /// No description provided for @commonFarmConnectUser.
  ///
  /// In en, this message translates to:
  /// **'FarmConnect user'**
  String get commonFarmConnectUser;

  /// No description provided for @commonMetersAway.
  ///
  /// In en, this message translates to:
  /// **'{distance} m away'**
  String commonMetersAway(Object distance);

  /// No description provided for @commonKilometersAway.
  ///
  /// In en, this message translates to:
  /// **'{distance} km away'**
  String commonKilometersAway(Object distance);

  /// No description provided for @commonJustNow.
  ///
  /// In en, this message translates to:
  /// **'Just now'**
  String get commonJustNow;

  /// No description provided for @commonMinutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min ago'**
  String commonMinutesAgo(Object minutes);

  /// No description provided for @commonHoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{hours} hr ago'**
  String commonHoursAgo(Object hours);

  /// No description provided for @commonDaysAgo.
  ///
  /// In en, this message translates to:
  /// **'{days} d ago'**
  String commonDaysAgo(Object days);

  /// No description provided for @commonKm.
  ///
  /// In en, this message translates to:
  /// **'km'**
  String get commonKm;

  /// No description provided for @commonDays.
  ///
  /// In en, this message translates to:
  /// **'days'**
  String get commonDays;

  /// No description provided for @authSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignIn;

  /// No description provided for @authNewUserPrompt.
  ///
  /// In en, this message translates to:
  /// **'New to FarmConnect?'**
  String get authNewUserPrompt;

  /// No description provided for @authCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get authCreateAccount;

  /// No description provided for @authMobileOrEmail.
  ///
  /// In en, this message translates to:
  /// **'Mobile number or email'**
  String get authMobileOrEmail;

  /// No description provided for @authIdentifierRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile number or email'**
  String get authIdentifierRequired;

  /// No description provided for @authPasswordMinLength.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 6 characters'**
  String get authPasswordMinLength;

  /// No description provided for @authMobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get authMobileNumber;

  /// No description provided for @authValidMobile.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid 10-digit mobile number'**
  String get authValidMobile;

  /// No description provided for @authPasswordTab.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPasswordTab;

  /// No description provided for @authMobileTab.
  ///
  /// In en, this message translates to:
  /// **'Mobile'**
  String get authMobileTab;

  /// No description provided for @authMobileSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in with mobile'**
  String get authMobileSignIn;

  /// No description provided for @authMobileSignInHint.
  ///
  /// In en, this message translates to:
  /// **'Enter the mobile number and the password of your account. The role of the account decides which workspace opens.'**
  String get authMobileSignInHint;

  /// No description provided for @authCreateAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your account'**
  String get authCreateAccountTitle;

  /// No description provided for @authRegisterAsCultivator.
  ///
  /// In en, this message translates to:
  /// **'Register as cultivator'**
  String get authRegisterAsCultivator;

  /// No description provided for @authRegisterAsBuyer.
  ///
  /// In en, this message translates to:
  /// **'Register as buyer'**
  String get authRegisterAsBuyer;

  /// No description provided for @authFullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get authFullName;

  /// No description provided for @authNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your name'**
  String get authNameRequired;

  /// No description provided for @authEmailOptional.
  ///
  /// In en, this message translates to:
  /// **'Email (optional)'**
  String get authEmailOptional;

  /// No description provided for @authFarmAddress.
  ///
  /// In en, this message translates to:
  /// **'Farm address'**
  String get authFarmAddress;

  /// No description provided for @authPinCode.
  ///
  /// In en, this message translates to:
  /// **'PIN code'**
  String get authPinCode;

  /// No description provided for @authSameAccountNote.
  ///
  /// In en, this message translates to:
  /// **'The same account works on the FarmConnect website and on this app.'**
  String get authSameAccountNote;

  /// No description provided for @authShowPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get authShowPassword;

  /// No description provided for @authHidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get authHidePassword;

  /// No description provided for @profileLogoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Log out?'**
  String get profileLogoutTitle;

  /// No description provided for @profileLogoutMessage.
  ///
  /// In en, this message translates to:
  /// **'You will need to sign in again to access your account.'**
  String get profileLogoutMessage;

  /// No description provided for @profileEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get profileEditTitle;

  /// No description provided for @profileMobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get profileMobileNumber;

  /// No description provided for @profileUpdated.
  ///
  /// In en, this message translates to:
  /// **'Profile updated'**
  String get profileUpdated;

  /// No description provided for @profileIdentityVerificationTitle.
  ///
  /// In en, this message translates to:
  /// **'Cultivator identity verification'**
  String get profileIdentityVerificationTitle;

  /// No description provided for @profileIdentityNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'12-digit identity number'**
  String get profileIdentityNumberLabel;

  /// No description provided for @profileVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get profileVerify;

  /// No description provided for @profileVerificationCompleted.
  ///
  /// In en, this message translates to:
  /// **'Identity verification completed'**
  String get profileVerificationCompleted;

  /// No description provided for @profileNotSignedIn.
  ///
  /// In en, this message translates to:
  /// **'Not signed in'**
  String get profileNotSignedIn;

  /// No description provided for @profileMyFavorites.
  ///
  /// In en, this message translates to:
  /// **'My favourites'**
  String get profileMyFavorites;

  /// No description provided for @profileMyComplaints.
  ///
  /// In en, this message translates to:
  /// **'My complaints'**
  String get profileMyComplaints;

  /// No description provided for @profileLogisticsCalculator.
  ///
  /// In en, this message translates to:
  /// **'Logistics & profit calculator'**
  String get profileLogisticsCalculator;

  /// No description provided for @profileApmcRates.
  ///
  /// In en, this message translates to:
  /// **'APMC mandi rates'**
  String get profileApmcRates;

  /// No description provided for @profileVerifyCultivator.
  ///
  /// In en, this message translates to:
  /// **'Verify cultivator identity'**
  String get profileVerifyCultivator;

  /// No description provided for @profileShareFarmPosition.
  ///
  /// In en, this message translates to:
  /// **'Share my farm position'**
  String get profileShareFarmPosition;

  /// No description provided for @profileShareDeliveryPosition.
  ///
  /// In en, this message translates to:
  /// **'Share my delivery position'**
  String get profileShareDeliveryPosition;

  /// No description provided for @profilePositionNotShared.
  ///
  /// In en, this message translates to:
  /// **'Not shared yet'**
  String get profilePositionNotShared;

  /// No description provided for @profilePositionSaved.
  ///
  /// In en, this message translates to:
  /// **'Your position was saved.'**
  String get profilePositionSaved;

  /// No description provided for @profilePositionFailed.
  ///
  /// In en, this message translates to:
  /// **'The position could not be saved. Please try again.'**
  String get profilePositionFailed;

  /// No description provided for @profilePositionPermissionDenied.
  ///
  /// In en, this message translates to:
  /// **'The position permission was denied, so nothing was shared.'**
  String get profilePositionPermissionDenied;

  /// No description provided for @profilePositionServiceDisabled.
  ///
  /// In en, this message translates to:
  /// **'The location service of this device is switched off.'**
  String get profilePositionServiceDisabled;

  /// No description provided for @profileSharedAccountNote.
  ///
  /// In en, this message translates to:
  /// **'This account is shared with the FarmConnect website — orders, listings and conversations stay in sync.'**
  String get profileSharedAccountNote;

  /// No description provided for @complaintsPageTitle.
  ///
  /// In en, this message translates to:
  /// **'My complaints'**
  String get complaintsPageTitle;

  /// No description provided for @complaintsRaiseTitle.
  ///
  /// In en, this message translates to:
  /// **'Raise a complaint'**
  String get complaintsRaiseTitle;

  /// No description provided for @complaintsRaiseButton.
  ///
  /// In en, this message translates to:
  /// **'Raise complaint'**
  String get complaintsRaiseButton;

  /// No description provided for @complaintsAgainst.
  ///
  /// In en, this message translates to:
  /// **'Against'**
  String get complaintsAgainst;

  /// No description provided for @complaintsEntityOrder.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get complaintsEntityOrder;

  /// No description provided for @complaintsEntityProduct.
  ///
  /// In en, this message translates to:
  /// **'Product listing'**
  String get complaintsEntityProduct;

  /// No description provided for @complaintsEntityCultivator.
  ///
  /// In en, this message translates to:
  /// **'Cultivator'**
  String get complaintsEntityCultivator;

  /// No description provided for @complaintsEntityConversation.
  ///
  /// In en, this message translates to:
  /// **'Conversation'**
  String get complaintsEntityConversation;

  /// No description provided for @complaintsEntityGeneral.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get complaintsEntityGeneral;

  /// No description provided for @complaintsReferenceId.
  ///
  /// In en, this message translates to:
  /// **'Reference ID'**
  String get complaintsReferenceId;

  /// No description provided for @complaintsReason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get complaintsReason;

  /// No description provided for @complaintsDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get complaintsDetails;

  /// No description provided for @complaintsRegistered.
  ///
  /// In en, this message translates to:
  /// **'Complaint registered'**
  String get complaintsRegistered;

  /// No description provided for @complaintsEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No complaints registered'**
  String get complaintsEmptyTitle;

  /// No description provided for @complaintsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Raise a complaint when an order, listing or conversation needs attention.'**
  String get complaintsEmptyMessage;

  /// No description provided for @complaintsAdminResponse.
  ///
  /// In en, this message translates to:
  /// **'Admin response: {notes}'**
  String complaintsAdminResponse(Object notes);

  /// No description provided for @complaintStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get complaintStatusPending;

  /// No description provided for @complaintStatusInReview.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get complaintStatusInReview;

  /// No description provided for @complaintStatusResolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get complaintStatusResolved;

  /// No description provided for @complaintStatusDismissed.
  ///
  /// In en, this message translates to:
  /// **'Dismissed'**
  String get complaintStatusDismissed;

  /// No description provided for @chatConversationTitle.
  ///
  /// In en, this message translates to:
  /// **'Conversation'**
  String get chatConversationTitle;

  /// No description provided for @chatNoMessagesTitle.
  ///
  /// In en, this message translates to:
  /// **'No messages yet'**
  String get chatNoMessagesTitle;

  /// No description provided for @chatNoMessagesMessage.
  ///
  /// In en, this message translates to:
  /// **'Start the negotiation — messages are shared with the other party in real time.'**
  String get chatNoMessagesMessage;

  /// No description provided for @chatWriteMessage.
  ///
  /// In en, this message translates to:
  /// **'Write a message…'**
  String get chatWriteMessage;

  /// No description provided for @chatSendMessage.
  ///
  /// In en, this message translates to:
  /// **'Send message'**
  String get chatSendMessage;

  /// No description provided for @enquiriesFarmerEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No buyer enquiries'**
  String get enquiriesFarmerEmptyTitle;

  /// No description provided for @enquiriesConsumerEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No enquiries yet'**
  String get enquiriesConsumerEmptyTitle;

  /// No description provided for @enquiriesFarmerEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Buyer negotiations for your harvest lots will appear here.'**
  String get enquiriesFarmerEmptyMessage;

  /// No description provided for @enquiriesConsumerEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Start a negotiation from a product listing to talk directly with the farmer.'**
  String get enquiriesConsumerEmptyMessage;

  /// No description provided for @enquiryStatusOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get enquiryStatusOpen;

  /// No description provided for @enquiryStatusNegotiating.
  ///
  /// In en, this message translates to:
  /// **'Negotiating'**
  String get enquiryStatusNegotiating;

  /// No description provided for @enquiryStatusAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get enquiryStatusAccepted;

  /// No description provided for @enquiryStatusClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get enquiryStatusClosed;

  /// No description provided for @ordersTrackingTitle.
  ///
  /// In en, this message translates to:
  /// **'Order tracking'**
  String get ordersTrackingTitle;

  /// No description provided for @ordersDeliveryReceiptConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Delivery receipt confirmed'**
  String get ordersDeliveryReceiptConfirmed;

  /// No description provided for @ordersConfirmDeliveryReceipt.
  ///
  /// In en, this message translates to:
  /// **'Confirm delivery receipt'**
  String get ordersConfirmDeliveryReceipt;

  /// No description provided for @ordersItemsTotal.
  ///
  /// In en, this message translates to:
  /// **'Items total'**
  String get ordersItemsTotal;

  /// No description provided for @ordersTransportCost.
  ///
  /// In en, this message translates to:
  /// **'Transport'**
  String get ordersTransportCost;

  /// No description provided for @ordersContainerCost.
  ///
  /// In en, this message translates to:
  /// **'Container'**
  String get ordersContainerCost;

  /// No description provided for @ordersGrandTotal.
  ///
  /// In en, this message translates to:
  /// **'Grand total'**
  String get ordersGrandTotal;

  /// No description provided for @ordersDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get ordersDelivery;

  /// No description provided for @ordersCultivatorLabel.
  ///
  /// In en, this message translates to:
  /// **'Cultivator: {name}'**
  String ordersCultivatorLabel(Object name);

  /// No description provided for @ordersBuyerLabel.
  ///
  /// In en, this message translates to:
  /// **'Buyer: {name}'**
  String ordersBuyerLabel(Object name);

  /// No description provided for @ordersPhoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone: {phone}'**
  String ordersPhoneLabel(Object phone);

  /// No description provided for @ordersTimelinePlaced.
  ///
  /// In en, this message translates to:
  /// **'Order placed'**
  String get ordersTimelinePlaced;

  /// No description provided for @ordersTimelinePacked.
  ///
  /// In en, this message translates to:
  /// **'Packed by farmer'**
  String get ordersTimelinePacked;

  /// No description provided for @favoritesListingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Favourite listings'**
  String get favoritesListingsTitle;

  /// No description provided for @favoritesCultivatorsTitle.
  ///
  /// In en, this message translates to:
  /// **'Favourite cultivators'**
  String get favoritesCultivatorsTitle;

  /// No description provided for @favoritesEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Tap the heart on a listing or a farm to keep it handy for later.'**
  String get favoritesEmptyMessage;

  /// No description provided for @mapLoadingNearbyFarms.
  ///
  /// In en, this message translates to:
  /// **'Loading nearby farms…'**
  String get mapLoadingNearbyFarms;

  /// No description provided for @mapVerifiedFarmsNearby.
  ///
  /// In en, this message translates to:
  /// **'{count} verified farms near {latitude}, {longitude}'**
  String mapVerifiedFarmsNearby(
    Object count,
    Object latitude,
    Object longitude,
  );

  /// No description provided for @mapUseMyLocation.
  ///
  /// In en, this message translates to:
  /// **'Use my location'**
  String get mapUseMyLocation;

  /// No description provided for @mapLocationPermissionDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission was denied.'**
  String get mapLocationPermissionDenied;

  /// No description provided for @marketRatesSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search commodity, district or market centre'**
  String get marketRatesSearchHint;

  /// No description provided for @marketRatesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No market rates found'**
  String get marketRatesEmptyTitle;

  /// No description provided for @marketRatesEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'APMC rates are refreshed from the shared backend database.'**
  String get marketRatesEmptyMessage;

  /// No description provided for @marketRatesMinimum.
  ///
  /// In en, this message translates to:
  /// **'Minimum'**
  String get marketRatesMinimum;

  /// No description provided for @marketRatesModal.
  ///
  /// In en, this message translates to:
  /// **'Modal'**
  String get marketRatesModal;

  /// No description provided for @marketRatesMaximum.
  ///
  /// In en, this message translates to:
  /// **'Maximum'**
  String get marketRatesMaximum;

  /// No description provided for @logisticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Geo-Logistics & Trade Profit Hub'**
  String get logisticsTitle;

  /// No description provided for @logisticsDescription.
  ///
  /// In en, this message translates to:
  /// **'Costs are calculated by the shared FarmConnect backend so the website and the Android app always quote the same logistics.'**
  String get logisticsDescription;

  /// No description provided for @logisticsCropQuantityKg.
  ///
  /// In en, this message translates to:
  /// **'Crop quantity (kg)'**
  String get logisticsCropQuantityKg;

  /// No description provided for @logisticsFarmerPricePerKg.
  ///
  /// In en, this message translates to:
  /// **'Farmer price per kg'**
  String get logisticsFarmerPricePerKg;

  /// No description provided for @logisticsApmcModalPrice.
  ///
  /// In en, this message translates to:
  /// **'APMC modal price per quintal'**
  String get logisticsApmcModalPrice;

  /// No description provided for @logisticsContainerType.
  ///
  /// In en, this message translates to:
  /// **'Container type'**
  String get logisticsContainerType;

  /// No description provided for @logisticsStandardCrate.
  ///
  /// In en, this message translates to:
  /// **'Standard crate'**
  String get logisticsStandardCrate;

  /// No description provided for @logisticsColdChain.
  ///
  /// In en, this message translates to:
  /// **'Cold chain refrigerated'**
  String get logisticsColdChain;

  /// No description provided for @logisticsMoistureControlled.
  ///
  /// In en, this message translates to:
  /// **'Moisture controlled'**
  String get logisticsMoistureControlled;

  /// No description provided for @logisticsVentilatedJute.
  ///
  /// In en, this message translates to:
  /// **'Ventilated jute'**
  String get logisticsVentilatedJute;

  /// No description provided for @logisticsCalculate.
  ///
  /// In en, this message translates to:
  /// **'Calculate logistics & profit'**
  String get logisticsCalculate;

  /// No description provided for @logisticsQuotation.
  ///
  /// In en, this message translates to:
  /// **'Quotation'**
  String get logisticsQuotation;

  /// No description provided for @logisticsDistance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get logisticsDistance;

  /// No description provided for @logisticsTotalCost.
  ///
  /// In en, this message translates to:
  /// **'Total logistics cost'**
  String get logisticsTotalCost;

  /// No description provided for @logisticsApmcValue.
  ///
  /// In en, this message translates to:
  /// **'APMC value'**
  String get logisticsApmcValue;

  /// No description provided for @logisticsEstimatedProfit.
  ///
  /// In en, this message translates to:
  /// **'Estimated profit'**
  String get logisticsEstimatedProfit;

  /// No description provided for @logisticsProfitMargin.
  ///
  /// In en, this message translates to:
  /// **'Profit margin'**
  String get logisticsProfitMargin;

  /// No description provided for @logisticsSelectListing.
  ///
  /// In en, this message translates to:
  /// **'Crop lot'**
  String get logisticsSelectListing;

  /// No description provided for @logisticsNoListings.
  ///
  /// In en, this message translates to:
  /// **'No live crop lot is available in the shared catalogue.'**
  String get logisticsNoListings;

  /// No description provided for @logisticsPriceFromListing.
  ///
  /// In en, this message translates to:
  /// **'The farmer\'s listed price of the selected crop lot.'**
  String get logisticsPriceFromListing;

  /// No description provided for @logisticsBenchmarkSource.
  ///
  /// In en, this message translates to:
  /// **'Published by {source}'**
  String logisticsBenchmarkSource(Object source);

  /// No description provided for @logisticsNoPublishedBenchmarkHint.
  ///
  /// In en, this message translates to:
  /// **'No APMC benchmark has been published for this crop, so the profit against the mandi cannot be stated.'**
  String get logisticsNoPublishedBenchmarkHint;

  /// No description provided for @logisticsMissingFarmerPrice.
  ///
  /// In en, this message translates to:
  /// **'The listing carries no price, so the landed cost cannot be computed.'**
  String get logisticsMissingFarmerPrice;

  /// No description provided for @logisticsMissingFarmCoordinates.
  ///
  /// In en, this message translates to:
  /// **'The farm of this listing has no coordinates, so the freight distance cannot be computed.'**
  String get logisticsMissingFarmCoordinates;

  /// No description provided for @logisticsMissingDestinationCoordinates.
  ///
  /// In en, this message translates to:
  /// **'Your delivery address has no coordinates, so the freight distance cannot be computed.'**
  String get logisticsMissingDestinationCoordinates;

  /// No description provided for @logisticsInvalidQuantity.
  ///
  /// In en, this message translates to:
  /// **'Enter the crop quantity in kilograms.'**
  String get logisticsInvalidQuantity;

  /// No description provided for @logisticsCoordinatesHint.
  ///
  /// In en, this message translates to:
  /// **'The farm coordinates come from the selected listing and the delivery coordinates from your account profile.'**
  String get logisticsCoordinatesHint;

  /// No description provided for @logisticsNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'—'**
  String get logisticsNotAvailable;

  /// No description provided for @adminOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get adminOverview;

  /// No description provided for @adminUsers.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get adminUsers;

  /// No description provided for @adminComplaints.
  ///
  /// In en, this message translates to:
  /// **'Complaints'**
  String get adminComplaints;

  /// No description provided for @adminResolveComplaint.
  ///
  /// In en, this message translates to:
  /// **'Resolve complaint'**
  String get adminResolveComplaint;

  /// No description provided for @adminResolutionNotes.
  ///
  /// In en, this message translates to:
  /// **'Resolution notes'**
  String get adminResolutionNotes;

  /// No description provided for @adminResolve.
  ///
  /// In en, this message translates to:
  /// **'Resolve'**
  String get adminResolve;

  /// No description provided for @adminNoMetrics.
  ///
  /// In en, this message translates to:
  /// **'No platform metrics available yet.'**
  String get adminNoMetrics;

  /// No description provided for @adminNoUsers.
  ///
  /// In en, this message translates to:
  /// **'No users found'**
  String get adminNoUsers;

  /// No description provided for @adminNoComplaints.
  ///
  /// In en, this message translates to:
  /// **'No complaints'**
  String get adminNoComplaints;

  /// No description provided for @adminComplaintFallback.
  ///
  /// In en, this message translates to:
  /// **'Complaint'**
  String get adminComplaintFallback;

  /// No description provided for @adminMetricTotalUsers.
  ///
  /// In en, this message translates to:
  /// **'Total users'**
  String get adminMetricTotalUsers;

  /// No description provided for @adminMetricTotalFarmers.
  ///
  /// In en, this message translates to:
  /// **'Total cultivators'**
  String get adminMetricTotalFarmers;

  /// No description provided for @adminMetricTotalConsumers.
  ///
  /// In en, this message translates to:
  /// **'Total buyers'**
  String get adminMetricTotalConsumers;

  /// No description provided for @adminMetricActiveProducts.
  ///
  /// In en, this message translates to:
  /// **'Active listings'**
  String get adminMetricActiveProducts;

  /// No description provided for @adminMetricActiveOrders.
  ///
  /// In en, this message translates to:
  /// **'Active orders'**
  String get adminMetricActiveOrders;

  /// No description provided for @adminMetricPendingComplaints.
  ///
  /// In en, this message translates to:
  /// **'Pending complaints'**
  String get adminMetricPendingComplaints;

  /// No description provided for @homeFarmerDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Farmer dashboard'**
  String get homeFarmerDashboardTitle;

  /// No description provided for @homeHarvestInventoryTitle.
  ///
  /// In en, this message translates to:
  /// **'Harvest inventory'**
  String get homeHarvestInventoryTitle;

  /// No description provided for @homeIncomingOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'Incoming orders'**
  String get homeIncomingOrdersTitle;

  /// No description provided for @homeCustomerInquiriesTitle.
  ///
  /// In en, this message translates to:
  /// **'Buyer enquiries'**
  String get homeCustomerInquiriesTitle;

  /// No description provided for @homeAdminConsoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Admin console'**
  String get homeAdminConsoleTitle;

  /// No description provided for @homeConsoleLabel.
  ///
  /// In en, this message translates to:
  /// **'Console'**
  String get homeConsoleLabel;

  /// No description provided for @homeRatesLabel.
  ///
  /// In en, this message translates to:
  /// **'Rates'**
  String get homeRatesLabel;

  /// No description provided for @homeMarketplaceTitle.
  ///
  /// In en, this message translates to:
  /// **'Marketplace'**
  String get homeMarketplaceTitle;

  /// No description provided for @homeMyOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'My orders'**
  String get homeMyOrdersTitle;

  /// No description provided for @homeMyCartTitle.
  ///
  /// In en, this message translates to:
  /// **'My cart'**
  String get homeMyCartTitle;

  /// No description provided for @farmerCardLotsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} lots'**
  String farmerCardLotsCount(Object count);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi', 'kn'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
    case 'kn':
      return AppLocalizationsKn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
