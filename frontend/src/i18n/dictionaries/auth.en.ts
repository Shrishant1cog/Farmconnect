// Authentication screen strings — English (reference).
//
// Keys use the `auth.<section>.<key>` convention. Every key added here must
// also be added to the Kannada and Hindi tables.
import type { TranslationMap } from '../types';

export const authEn: TranslationMap = {
  // Login page
  'auth.login.title': 'Welcome to FarmConnect',
  'auth.login.subtitle': 'Direct Karnataka farm-to-door agricultural exchange.',
  'auth.login.tabPassword': 'Email & Password',
  'auth.login.tabOtp': 'Mobile OTP',
  'auth.login.roleFarmer': 'Cultivator (Farmer)',
  'auth.login.roleConsumer': 'Buyer (Consumer)',
  'auth.login.emailOrPhone': 'Email or Mobile Number',
  'auth.login.emailPlaceholder': 'farmer@farmconnect.com',
  'auth.login.password': 'Password',
  'auth.login.passwordPlaceholder': '••••••••',
  'auth.login.mobileNumber': 'Mobile Number',
  'auth.login.countryCode': 'IN +91',
  'auth.login.phonePlaceholder': '8073477125',
  'auth.login.otpLabel': 'Enter 6-Digit Verification Code',
  'auth.login.otpPlaceholder': '123456',
  'auth.login.signIn': 'Sign In',
  'auth.login.sendCode': 'Send Verification Code',
  'auth.login.verifySignIn': 'Verify & Sign In',
  'auth.login.changePhone': 'Change Phone Number',
  'auth.login.quickFill': 'Quick-Fill Test Credentials',
  'auth.login.farmerSeed': 'Cultivator Seed',
  'auth.login.consumerSeed': 'Buyer Seed',
  'auth.login.noAccount': "Don't have an account yet?",
  'auth.login.registerHere': 'Register here',
  'auth.login.loadingVerifyingCredentials': 'Verifying credentials...',
  'auth.login.loadingDispatchingCode': 'Dispatching SMS verification code...',
  'auth.login.loadingConfirmingCode': 'Confirming verification code...',
  'auth.login.loadingSecuringSession': 'Securing session tokens...',
  'auth.login.loadingAuthenticating': 'Authenticating credentials...',
  'auth.login.success': 'Authentication successful! Navigating to workspace...',
  'auth.login.errorInvalidPhone': 'Please provide a valid 10-digit mobile number.',
  'auth.login.errorInvalidOtp': 'Please enter the 6-digit verification code.',
  'auth.login.errorSmsUnavailable':
    'SMS sign-in is not available because the message service is not configured. Please sign in with your mobile number and password.',
  'auth.login.errorUnableDispatch': 'Unable to dispatch the verification SMS.',
  'auth.login.errorTokenNotReceived': 'Login failed: Token not received from server.',
  'auth.login.errorVerificationFailed': 'Verification failed. Please check the code.',
  'auth.login.errorMissingCredentials': 'Please enter both identifier and password.',
  'auth.login.errorInvalidCredentials':
    'Invalid credentials. Please verify your phone/email and password.',
  'auth.login.errorBackendUnavailable':
    'Cannot reach backend server. Please verify your Express backend is running on port 5000 (`npm run dev` in backend directory).',
  'auth.login.errorLoginFailed': 'Login failed. Please check your credentials.',

  // Registration page
  'auth.register.title': 'Create Your Account',
  'auth.register.subtitle': 'Direct all-India cultivator and wholesale exchange.',
  'auth.register.farmerRole': 'Cultivator / Farmer',
  'auth.register.consumerRole': 'Buyer / Consumer',
  'auth.register.loadingFarmer': 'Cultivator Node Provisioning',
  'auth.register.loadingBuyer': 'Buyer Setup',
  'auth.register.loadingDescription':
    'Configuring your direct exchange credentials and map permissions.',
  'auth.register.loadingSetupProfile':
    'Setting up your verified agricultural profile...',
  'auth.register.loadingConfigureProfile':
    'Configuring your direct agricultural exchange profile...',
  'auth.register.loadingLaunchPortal': 'Launching portal workspace...',
  'auth.register.successRegistered': 'Account registered successfully! Redirecting...',
  'auth.register.successRegistrationCompleted':
    'Registration completed! Redirecting to sign in...',
  'auth.register.errorPincodeNotFound':
    'PIN code details not found automatically. Please enter your State and District manually.',
  'auth.register.errorGeolocationUnsupported':
    'Geolocation is not supported by your browser.',
  'auth.register.errorLocationPermissionDenied':
    'Location permission was denied. You can enter your details manually.',
  'auth.register.errorInvalidPhone': 'Please provide a valid 10-digit mobile number.',
  'auth.register.errorPasswordMismatch': 'Passwords do not match.',
  'auth.register.errorPasswordTooShort': 'Password must contain at least 6 characters.',
  'auth.register.errorMissingLocation':
    'Please provide your PIN code, State, and District.',
  'auth.register.errorMissingFarmName': 'Please provide your Farm or Estate name.',
  'auth.register.errorBackendUnavailable':
    'Unable to reach the server. Please verify your backend server is running on port 5000 (`npm run dev` in the backend directory).',
  'auth.register.errorRegistrationFailed':
    'Registration failed. Please check your entries and try again.',
  'auth.register.fullName': 'Full Legal Name *',
  'auth.register.farmerNamePlaceholder': 'e.g. Ramesh Kumar',
  'auth.register.consumerNamePlaceholder': 'e.g. Priya Sharma',
  'auth.register.farmName': 'Farm or Estate Name *',
  'auth.register.farmNamePlaceholder': 'e.g. Mandya Green Valley Organic Farm',
  'auth.register.mobileNumber': 'Mobile Number *',
  'auth.register.mobilePlaceholder': '10-digit mobile',
  'auth.register.emailAddress': 'Email Address',
  'auth.register.optional': '(optional)',
  'auth.register.emailPlaceholder': 'optional@domain.com',
  'auth.register.locationDetails': 'Location Details',
  'auth.register.gpsTitle': 'Detect and auto-fill address from GPS coordinates',
  'auth.register.gpsAttached': 'GPS Attached',
  'auth.register.gpsDetect': 'Detect via GPS',
  'auth.register.pinCode': 'PIN Code *',
  'auth.register.pinCodePlaceholder': 'e.g. 571401',
  'auth.register.state': 'State *',
  'auth.register.statePlaceholder': 'Type state...',
  'auth.register.district': 'District *',
  'auth.register.districtPlaceholder': 'e.g. Mandya',
  'auth.register.taluk': 'Taluk / Tehsil',
  'auth.register.talukPlaceholder': 'e.g. Pandavapura',
  'auth.register.address': 'Street / Village / Landmark',
  'auth.register.addressPlaceholder': 'Plot/Door No, Village or Landmark',
  'auth.register.mapFarmerConsent': 'Show my farm location on the Public Farm Map',
  'auth.register.mapConsumerConsent':
    'Enable regional location discovery on the Delivery Map',
  'auth.register.mapConsentDescription':
    'Your location will only appear on the map with your explicit consent.',
  'auth.register.viewBenefits': 'View benefits',
  'auth.register.whyShowLocation': 'Why show your location on the map?',
  'auth.register.directPickupTitle': 'Direct Farm Gate Pickups:',
  'auth.register.directPickupBody':
    'Verified institutional buyers and local families can route directly to you for fresh produce.',
  'auth.register.transportFeesTitle': 'Zero Middleman Transport Fees:',
  'auth.register.transportFeesBody':
    'Accurate road distance eliminates speculative freight markup.',
  'auth.register.privacyTitle': 'Full Privacy Control:',
  'auth.register.privacyBody':
    'Exact door numbers or residential rooms are never displayed; map visibility can be modified anytime in settings.',
  'auth.register.password': 'Password *',
  'auth.register.passwordPlaceholder': 'Min 6 characters',
  'auth.register.confirmPassword': 'Confirm Password *',
  'auth.register.confirmPasswordPlaceholder': 'Repeat password',
  'auth.register.createFarmerAccount': 'Create Cultivator Account',
  'auth.register.createBuyerAccount': 'Create Buyer Account',
  'auth.register.haveAccount': 'Already have an account?',
  'auth.register.signInHere': 'Sign In here',

  // Reusable phone authentication form
  'auth.phone.mobileNumber': 'Mobile Number',
  'auth.phone.countryCode': 'IN +91',
  'auth.phone.phonePlaceholder': '8073477125',
  'auth.phone.smsHelper': 'An SMS verification code will be sent to your phone.',
  'auth.phone.otpLabel': 'Enter 6-Digit OTP Code',
  'auth.phone.otpPlaceholder': '123456',
  'auth.phone.sendingOtp': 'Sending OTP Code...',
  'auth.phone.sendCode': 'Send Verification Code',
  'auth.phone.verifyingOtp': 'Verifying OTP...',
  'auth.phone.verifyWorkspace': 'Verify & Enter Workspace',
  'auth.phone.changeMobile': 'Change Mobile Number',
  'auth.phone.errorInvalidPhone': 'Please provide a valid 10-digit mobile number.',
  'auth.phone.errorUnableDispatch': 'Unable to dispatch verification SMS.',
  'auth.phone.errorSmsUnavailable':
    'SMS sign-in is not available because the message service is not configured. Please sign in with your mobile number and password.',
  'auth.phone.errorInvalidOtpLength': 'Please enter the 6-digit verification code.',
  'auth.phone.errorVerificationFailed': 'Verification code failed. Please try again.',
};
