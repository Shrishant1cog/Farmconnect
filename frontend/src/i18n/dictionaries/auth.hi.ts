// Authentication screen strings — Hindi (हिन्दी).
import type { TranslationMap } from '../types';

export const authHi: TranslationMap = {
  // Login page
  'auth.login.title': 'फ़ार्मकनेक्ट में आपका स्वागत है',
  'auth.login.subtitle': 'कर्नाटक में खेत से घर तक सीधी कृषि लेनदेन।',
  'auth.login.tabPassword': 'ईमेल और पासवर्ड',
  'auth.login.tabOtp': 'मोबाइल OTP',
  'auth.login.roleFarmer': 'कृषक (किसान)',
  'auth.login.roleConsumer': 'खरीदार (उपभोक्ता)',
  'auth.login.emailOrPhone': 'ईमेल या मोबाइल नंबर',
  'auth.login.emailPlaceholder': 'farmer@farmconnect.com',
  'auth.login.password': 'पासवर्ड',
  'auth.login.passwordPlaceholder': '••••••••',
  'auth.login.mobileNumber': 'मोबाइल नंबर',
  'auth.login.countryCode': 'IN +91',
  'auth.login.phonePlaceholder': '8073477125',
  'auth.login.otpLabel': '6-अंकीय सत्यापन कोड दर्ज करें',
  'auth.login.otpPlaceholder': '123456',
  'auth.login.signIn': 'साइन इन',
  'auth.login.sendCode': 'सत्यापन कोड भेजें',
  'auth.login.verifySignIn': 'सत्यापित करें और साइन इन करें',
  'auth.login.changePhone': 'फ़ोन नंबर बदलें',
  'auth.login.quickFill': 'टेस्ट विवरण तुरंत भरें',
  'auth.login.farmerSeed': 'कृषक टेस्ट',
  'auth.login.consumerSeed': 'खरीदार टेस्ट',
  'auth.login.noAccount': 'अभी खाता नहीं है?',
  'auth.login.registerHere': 'यहाँ रजिस्टर करें',
  'auth.login.loadingVerifyingCredentials': 'विवरण सत्यापित किए जा रहे हैं...',
  'auth.login.loadingDispatchingCode': 'SMS सत्यापन कोड भेजा जा रहा है...',
  'auth.login.loadingConfirmingCode': 'सत्यापन कोड की पुष्टि हो रही है...',
  'auth.login.loadingSecuringSession': 'सत्र टोकन सुरक्षित किए जा रहे हैं...',
  'auth.login.loadingAuthenticating': 'विवरण प्रमाणित किए जा रहे हैं...',
  'auth.login.success': 'प्रमाणीकरण सफल! वर्कस्पेस पर जा रहे हैं...',
  'auth.login.errorInvalidPhone': 'कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।',
  'auth.login.errorInvalidOtp': 'कृपया 6-अंकीय सत्यापन कोड दर्ज करें।',
  'auth.login.errorSmsUnavailable':
    'संदेश सेवा कॉन्फ़िगर नहीं होने के कारण SMS साइन-इन उपलब्ध नहीं है। कृपया अपने मोबाइल नंबर और पासवर्ड से साइन-इन करें।',
  'auth.login.errorUnableDispatch': 'सत्यापन SMS नहीं भेजा जा सका।',
  'auth.login.errorTokenNotReceived': 'साइन इन विफल: सर्वर से टोकन नहीं मिला।',
  'auth.login.errorVerificationFailed': 'सत्यापन विफल। कृपया कोड जाँचें।',
  'auth.login.errorMissingCredentials': 'कृपया पहचान संख्या और पासवर्ड दोनों दर्ज करें।',
  'auth.login.errorInvalidCredentials':
    'विवरण गलत हैं। कृपया अपना फ़ोन/ईमेल और पासवर्ड जाँचें।',
  'auth.login.errorBackendUnavailable':
    'बैकएंड सर्वर से संपर्क नहीं हो सका। कृपया जाँचें कि Express बैकएंड पोर्ट 5000 पर चल रहा है (`npm run dev` बैकएंड डirectory में)।',
  'auth.login.errorLoginFailed': 'साइन इन विफल। कृपया अपने विवरण जाँचें।',

  // Registration page
  'auth.register.title': 'अपना खाता बनाएँ',
  'auth.register.subtitle': 'भारत भर के किसानों और थोक व्यापार का सीधा एक्सचेंज।',
  'auth.register.farmerRole': 'कृषक / किसान',
  'auth.register.consumerRole': 'खरीदार / उपभोक्ता',
  'auth.register.loadingFarmer': 'किसान नोड तैयार किया जा रहा है',
  'auth.register.loadingBuyer': 'खरीदार सेटअप हो रहा है',
  'auth.register.loadingDescription':
    'आपके सीधे एक्सचेंज विवरण और मानचित्र अनुमतियाँ कॉन्फ़िगर की जा रही हैं।',
  'auth.register.loadingSetupProfile':
    'आपका सत्यापित कृषि प्रोफ़ाइल तैयार किया जा रहा है...',
  'auth.register.loadingConfigureProfile':
    'आपकी सीधी कृषि एक्सचेंज प्रोफ़ाइल कॉन्फ़िगर की जा रही है...',
  'auth.register.loadingLaunchPortal': 'पोर्टल वर्कस्पेस शुरू किया जा रहा है...',
  'auth.register.successRegistered': 'खाता सफलतापूर्वक बन गया! रीडायरेक्ट किया जा रहा है...',
  'auth.register.successRegistrationCompleted':
    'पंजीकरण पूरा हुआ! साइन इन पर रीडायरेक्ट किया जा रहा है...',
  'auth.register.errorPincodeNotFound':
    'PIN कोड की जानकारी अपने आप नहीं मिली। कृपया राज्य और ज़िला स्वयं भरें।',
  'auth.register.errorGeolocationUnsupported':
    'आपका ब्राउज़र जियोलोकेशन का समर्थन नहीं करता।',
  'auth.register.errorLocationPermissionDenied':
    'स्थान की अनुमति नहीं मिली। आप विवरण स्वयं भर सकते हैं।',
  'auth.register.errorInvalidPhone': 'कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।',
  'auth.register.errorPasswordMismatch': 'पासवर्ड मेल नहीं खाते।',
  'auth.register.errorPasswordTooShort': 'पासवर्ड में कम से कम 6 अक्षर होने चाहिए।',
  'auth.register.errorMissingLocation':
    'कृपया PIN कोड, राज्य और ज़िला दर्ज करें।',
  'auth.register.errorMissingFarmName': 'कृपया अपने खेत या एस्टेट का नाम दर्ज करें।',
  'auth.register.errorBackendUnavailable':
    'सर्वर से संपर्क नहीं हो सका। कृपया जाँचें कि बैकएंड सर्वर पोर्ट 5000 पर चल रहा है (`npm run dev` बैकएंड डirectory में)।',
  'auth.register.errorRegistrationFailed':
    'पंजीकरण विफल। कृपया अपनी जानकारी जाँचें और फिर कोशिश करें।',
  'auth.register.fullName': 'पूरा कानूनी नाम *',
  'auth.register.farmerNamePlaceholder': 'जैसे रमेश कुमार',
  'auth.register.consumerNamePlaceholder': 'जैसे प्रिया शर्मा',
  'auth.register.farmName': 'खेत या एस्टेट का नाम *',
  'auth.register.farmNamePlaceholder': 'जैसे मांड्या ग्रीन वैली ऑर्गेनिक फ़ार्म',
  'auth.register.mobileNumber': 'मोबाइल नंबर *',
  'auth.register.mobilePlaceholder': '10-अंकीय मोबाइल',
  'auth.register.emailAddress': 'ईमेल पता',
  'auth.register.optional': '(वैकल्पिक)',
  'auth.register.emailPlaceholder': 'optional@domain.com',
  'auth.register.locationDetails': 'स्थान की जानकारी',
  'auth.register.gpsTitle': 'GPS निर्देशांकों से पता लगाकर पता भरें',
  'auth.register.gpsAttached': 'GPS जुड़ा है',
  'auth.register.gpsDetect': 'GPS से पता लगाएँ',
  'auth.register.pinCode': 'PIN कोड *',
  'auth.register.pinCodePlaceholder': 'जैसे 571401',
  'auth.register.state': 'राज्य *',
  'auth.register.statePlaceholder': 'राज्य लिखें...',
  'auth.register.district': 'ज़िला *',
  'auth.register.districtPlaceholder': 'जैसे मांड्या',
  'auth.register.taluk': 'तालुका / तहसील',
  'auth.register.talukPlaceholder': 'जैसे पांडवपुर',
  'auth.register.address': 'सड़क / गाँव / पहचान की जगह',
  'auth.register.addressPlaceholder': 'प्लॉट/दरवाज़ा नंबर, गाँव या पहचान की जगह',
  'auth.register.mapFarmerConsent': 'सार्वजनिक फ़ार्म मैप पर मेरे खेत का स्थान दिखाएँ',
  'auth.register.mapConsumerConsent':
    'डिलीवरी मैप पर क्षेत्रीय स्थान खोज सक्षम करें',
  'auth.register.mapConsentDescription':
    'आपकी स्पष्ट सहमति के बिना आपका स्थान मानचित्र पर कभी नहीं दिखाया जाएगा।',
  'auth.register.viewBenefits': 'लाभ देखें',
  'auth.register.whyShowLocation': 'मानचित्र पर अपना स्थान क्यों दिखाएँ?',
  'auth.register.directPickupTitle': 'सीधी फ़ार्म गेट से पिकअप:',
  'auth.register.directPickupBody':
    'सत्यापित संस्थागत खरीदार और स्थानीय परिवार ताज़ा उपज के लिए सीधे आपके पास आ सकते हैं।',
  'auth.register.transportFeesTitle': 'बिचौलिया परिवहन शुल्क शून्य:',
  'auth.register.transportFeesBody':
    'सही सड़क दूरी से अनुमानित भाड़ा अतिरिक्त शुल्क नहीं लगता।',
  'auth.register.privacyTitle': 'पूर्ण गोपनीयता नियंत्रण:',
  'auth.register.privacyBody':
    'सटीक दरवाज़ा नंबर या घर के कमरे कभी नहीं दिखाए जाते; मानचित्र की दृश्यता को सेटिंग में कभी भी बदला जा सकता है।',
  'auth.register.password': 'पासवर्ड *',
  'auth.register.passwordPlaceholder': 'कम से कम 6 अक्षर',
  'auth.register.confirmPassword': 'पासवर्ड की पुष्टि करें *',
  'auth.register.confirmPasswordPlaceholder': 'पासवर्ड दोबारा दर्ज करें',
  'auth.register.createFarmerAccount': 'कृषक खाता बनाएँ',
  'auth.register.createBuyerAccount': 'खरीदार खाता बनाएँ',
  'auth.register.haveAccount': 'क्या आपके पास पहले से खाता है?',
  'auth.register.signInHere': 'यहाँ साइन इन करें',

  // Reusable phone authentication form
  'auth.phone.mobileNumber': 'मोबाइल नंबर',
  'auth.phone.countryCode': 'IN +91',
  'auth.phone.phonePlaceholder': '8073477125',
  'auth.phone.smsHelper': 'आपके फ़ोन पर SMS सत्यापन कोड भेजा जाएगा।',
  'auth.phone.otpLabel': '6-अंकीय OTP कोड दर्ज करें',
  'auth.phone.otpPlaceholder': '123456',
  'auth.phone.sendingOtp': 'OTP कोड भेजा जा रहा है...',
  'auth.phone.sendCode': 'सत्यापन कोड भेजें',
  'auth.phone.verifyingOtp': 'OTP सत्यापित किया जा रहा है...',
  'auth.phone.verifyWorkspace': 'सत्यापित करें और वर्कस्पेस में प्रवेश करें',
  'auth.phone.changeMobile': 'मोबाइल नंबर बदलें',
  'auth.phone.errorInvalidPhone': 'कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।',
  'auth.phone.errorUnableDispatch': 'सत्यापन SMS नहीं भेजा जा सका।',
  'auth.phone.errorSmsUnavailable':
    'संदेश सेवा कॉन्फ़िगर नहीं होने के कारण SMS साइन-इन उपलब्ध नहीं है। कृपया अपने मोबाइल नंबर और पासवर्ड से साइन-इन करें।',
  'auth.phone.errorInvalidOtpLength': 'कृपया 6-अंकीय सत्यापन कोड दर्ज करें।',
  'auth.phone.errorVerificationFailed':
    'सत्यापन कोड विफल। कृपया फिर कोशिश करें।',
};
