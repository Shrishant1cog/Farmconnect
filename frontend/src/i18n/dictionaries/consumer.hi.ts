// Consumer experience strings — Hindi (हिन्दी).
import type { TranslationMap } from '../types';

export const consumerHi: TranslationMap = {
  // Consumer layout
  'consumer.layout.syncingWorkspace': 'खरीदार कार्यक्षेत्र सिंक हो रहा है',
  'consumer.layout.fetchingWorkspace': 'आपके ऑर्डर और व्यापार चर्चाएँ लाई जा रही हैं…',
  'consumer.layout.signInTitle': 'अपने ऑर्डर देखने के लिए साइन इन करें',
  'consumer.layout.signInBody':
    'सक्रिय रवाने, फसल पूछताछ और सीधे ऑर्डर आपके व्यक्तिगत खरीदार प्रोफ़ाइल से जुड़े होते हैं।',
  'consumer.layout.signInContinue': 'जारी रखने के लिए साइन इन करें',
  'consumer.layout.backMarketplace': 'मार्केटप्लेस पर वापस जाएँ',
  'consumer.layout.loadingLots': 'फसल के लॉट लोड हो रहे हैं…',

  // Explore / marketplace
  'consumer.explore.directMarketplace': 'सीधा खेत मार्केटप्लेस',
  'consumer.explore.verifiedCultivators': 'सत्यापित किसान',
  'consumer.explore.heading': 'कर्नाटक के ताज़ा फसल लॉट',
  'consumer.explore.subtitle':
    'पारदर्शी मंडी बेंचमार्क दरों के साथ स्थानीय किसानों से सीधे प्रामाणिक कृषि उपज खरीदें।',
  'consumer.explore.refreshProduce': 'उपज ताज़ा करें',
  'consumer.explore.searchPlaceholder': 'फसल, किस्म, ज़िला या खेत खोजें…',
  'consumer.explore.organicOnly': 'केवल प्रमाणित जैविक',
  'consumer.explore.categoriesLabel': 'फसल श्रेणियाँ देखें',
  'consumer.explore.allCategories': 'सभी',
  'consumer.explore.loading': 'कर्नाटक के खेत बाज़ार से जुड़ रहे हैं…',
  'consumer.explore.noListings': 'कोई उपज लिस्टिंग नहीं मिली',
  'consumer.explore.noListingsBody':
    '“{search}” से कोई फसल मेल नहीं खाई। कोई दूसरा ज़िला आज़माएँ या जैविक फ़िल्टर हटाएँ।',
  'consumer.explore.organic': 'जैविक',
  'consumer.explore.quantityAvailable': '{quantity} {unit} उपलब्ध',
  'consumer.explore.directFarmRate': 'सीधी खेत दर',
  'consumer.explore.added': 'जोड़ा गया',
  'consumer.explore.addLot': 'लॉट जोड़ें',
  'consumer.explore.replaceCartTitle': 'कार्ट की वस्तुएँ बदलें?',
  'consumer.explore.replaceCartBody':
    'आपके कार्ट में “{farm}” की उपज है। सीधी किसान लॉजिस्टिक्स में प्रति रवाना एक ही खेत से ऑर्डर करना होता है। क्या आप कार्ट खाली करके “{targetFarm}” का यह लॉट जोड़ना चाहेंगे?',
  'consumer.explore.replaceAndAdd': 'बदलें और जोड़ें',
  'consumer.explore.keepExistingCart': 'मौजूदा कार्ट रखें',
  'consumer.explore.stockLimitTitle': 'स्टॉक सीमा पूरी हुई',
  'consumer.explore.stockLimitBody':
    'इस फसल लॉट की अधिक मात्रा जोड़ी नहीं जा सकी। उपलब्ध अधिकतम मात्रा आवंटित की जा चुकी है।',
  'consumer.explore.currentFarm': 'वर्तमान खेत',
  'consumer.explore.genericFarm': 'किसान का खेत',
  'consumer.explore.karnatakaCultivator': 'कर्नाटक किसान',
  'consumer.explore.loadError': 'उपज सूची लोड नहीं हो सकी। कृपया फिर कोशिश करें।',

  // पसंदीदा — साझा बैकएंड ही खाते की सूची तय करता है।
  'consumer.favorites.title': 'मेरे पसंदीदा',
  'consumer.favorites.subtitle': 'आपके द्वारा सहेजी गई फसल की लॉट और किसान।',
  'consumer.favorites.refresh': 'पसंदीदा ताज़ा करें',
  'consumer.favorites.loading': 'आपके पसंदीदा पढ़े जा रहे हैं…',
  'consumer.favorites.loadError': 'आपके पसंदीदा पढ़े नहीं जा सके। कृपया फिर कोशिश करें।',
  'consumer.favorites.emptyTitle': 'अभी तक कोई पसंदीदा लॉट नहीं',
  'consumer.favorites.emptyBody':
    'मार्केटप्लेस पर दिल के निशान से फसल की लॉट या किसान को सहेजें, वह यहाँ दिखेगा।',
  'consumer.favorites.exploreMarketplace': 'मार्केटप्लेस देखें',
  'consumer.favorites.listingsTitle': 'पसंदीदा फसल की लॉट',
  'consumer.favorites.farmersTitle': 'पसंदीदा किसान',
  'consumer.favorites.activeLots': '{count} सक्रिय लॉट',
  'consumer.favorites.activeLots.one': '{count} सक्रिय लॉट',
  'consumer.favorites.activeLots.other': '{count} सक्रिय लॉट',
  'consumer.favorites.add': 'पसंदीदा में जोड़ें',
  'consumer.favorites.remove': 'पसंदीदा से हटाएँ',
  'consumer.explore.errorTitle': 'उपज लोड नहीं हो सकी',
  'consumer.explore.retry': 'पुनः प्रयास करें',

  // Orders
  'consumer.orders.stepPending': 'ऑर्डर दिया गया',
  'consumer.orders.stepPacked': 'फसल पैक हुई',
  'consumer.orders.stepDispatched': 'रास्ते में है',
  'consumer.orders.stepDelivered': 'पहुँचाया गया',
  'consumer.orders.loading': 'आपके ऑर्डर और शिपमेंट लोड हो रहे हैं…',
  'consumer.orders.title': 'मेरे ऑर्डर और रवाना ट्रैकिंग',
  'consumer.orders.subtitle':
    'कर्नाटक के खेतों से आपके रसोघर तक सीधी फसल और लॉजिस्टिक्स की प्रगति देखें।',
  'consumer.orders.refresh': 'ऑर्डर ताज़ा करें',
  'consumer.orders.searchPlaceholder': 'ऑर्डर आईडी, खेत या उपज से खोजें…',
  'consumer.orders.statusAll': 'सभी',
  'consumer.orders.statusPending': 'लंबित',
  'consumer.orders.statusPacked': 'पैक हुआ',
  'consumer.orders.statusDispatched': 'रवाना हुआ',
  'consumer.orders.statusDelivered': 'पहुँचाया गया',
  'consumer.orders.emptyTitle': 'अभी तक कोई ऑर्डर नहीं दिया',
  'consumer.orders.emptyBody':
    'रीयल-टाइम रवाना ट्रैक करना शुरू करने के लिए स्थानीय किसानों से सीधे ताज़ी फसल खरीदें।',
  'consumer.orders.exploreMarketplace': 'मार्केटप्लेस देखें',
  'consumer.orders.noMatches': 'आपकी खोज या फ़िल्टर चयन से कोई ऑर्डर मेल नहीं खाता।',
  'consumer.orders.orderNumber': 'ऑर्डर #{id}',
  'consumer.orders.recent': 'हाल ही में',
  'consumer.orders.cultivatorFarm': 'किसान का खेत',
  'consumer.orders.totalAmount': 'कुल राशि',
  'consumer.orders.cancelled': 'यह ऑर्डर रद्द कर दिया गया था।',
  'consumer.orders.procuredItems': 'खरीदी गई वस्तुएँ',
  'consumer.orders.harvestProduce': 'फसल उपज',
  'consumer.orders.deliveryFreight': 'डिलीवरी स्थान और भाड़ा',
  'consumer.orders.directDestination': 'सीधे गंतव्य स्थान पर डिलीवरी',
  'consumer.orders.logisticsFreight': 'लॉजिस्टिक्स भाड़ा:',
  'consumer.orders.inTransit':
    'उपज रास्ते में है! पहुँचने के बाद पैकिंग जाँचें और नीचे पुष्टि करें।',
  'consumer.orders.receivedOrder': 'ऑर्डर प्राप्त हुआ',
  'consumer.orders.orderReceived': 'ऑर्डर प्राप्त और सत्यापित हुआ',
  'consumer.orders.procurementCompleted': 'सीधी खरीद पूरी हुई',
  'consumer.orders.confirmDeliveryTitle': 'डिलीवरी रसीद की पुष्टि करें',
  'consumer.orders.itemsInShipment': 'इस शिपमेंट की वस्तुएँ',
  'consumer.orders.expectedAmount': 'अपेक्षित राशि',
  'consumer.orders.cropYield': 'फसल उपज',
  'consumer.orders.settlementAuthorization': 'भुगतान प्राधिकरण',
  'consumer.orders.settlementBody':
    'रसीद की पुष्टि करने पर {farm} को सूचित किया जाएगा और इस थोक शिपमेंट को पूरी तरह डिलीवर तथा स्वीकार किया हुआ चिह्नित किया जाएगा।',
  'consumer.orders.inspection':
    'मैंने सभी वस्तुएँ खोलकर जाँच ली हैं। फसल की मात्रा और गुणवत्ता मेरे ऑर्डर से मेल खाती है।',
  'consumer.orders.notYet': 'अभी नहीं / रद्द करें',
  'consumer.orders.verifying': 'सत्यापित किया जा रहा है…',
  'consumer.orders.confirmAccept': 'डिलीवरी की पुष्टि करें और स्वीकार करें',
  'consumer.orders.loadError': 'आपके ऑर्डर लोड नहीं हो सके। कृपया फिर कोशिश करें।',
  'consumer.orders.deliveryNotConfirmed':
    'साझा बैकएंड ने डिलीवरी की पुष्टि नहीं की, इसलिए ऑर्डर अभी भी अपनी असली स्थिति में है। कृपया फिर कोशिश करें।',

  // Chats
  'consumer.chat.directChats': 'सीधी किसान चैट',
  'consumer.chat.buyerPortal': 'खरीदार पोर्टल',
  'consumer.chat.title': 'सीधे व्यापार संदेश और दरें',
  'consumer.chat.subtitle':
    'सत्यापित उत्पादकों के साथ लॉट रवाना, पैकिंग विशेषताएँ और थोक दरों का सीधा समन्वय करें।',
  'consumer.chat.marketplace': 'मार्केटप्लेस',
  'consumer.chat.searchGrower': 'उत्पादक, फसल या स्थान खोजें…',
  'consumer.chat.searchMandi': 'उत्पादक, फसल या मंडी खोजें…',
  'consumer.chat.noChats': 'आपकी खोज से मेल खाती कोई चैट नहीं है',
  'consumer.chat.youPrefix': 'आप: ',
  'consumer.chat.noMessages': 'अभी तक कोई संदेश नहीं',
  'consumer.chat.yesterday': 'कल',
  'consumer.chat.backContacts': 'संपर्कों पर वापस जाएँ',
  'consumer.chat.verified': 'सत्यापित',
  'consumer.chat.lot': 'लॉट',
  'consumer.chat.callGrower': 'उत्पादक को कॉल करें',
  'consumer.chat.escrowTitle': 'एस्क्रो-सुरक्षित वार्ता',
  'consumer.chat.escrowBody':
    'FarmConnect धन को सुरक्षित रखता है और सत्यापित उपज डिलीवरी के बाद ही भुगतान जारी करता है।',
  'consumer.chat.farmGateQuote': 'खेत की दर',
  'consumer.chat.orderLot': 'लॉट ऑर्डर करें',
  'consumer.chat.quickReplies': 'त्वरित उत्तर:',
  'consumer.chat.chipDispatch': 'क्या आप कल सुबह तक रवाना कर सकते हैं?',
  'consumer.chat.chipWholesale': 'क्या हम 500 किलो के थोक लॉट पर दर तय कर सकते हैं?',
  'consumer.chat.chipPackaging': 'कृपया क्रेट पैकिंग मानक की पुष्टि करें।',
  'consumer.chat.chipGrading': 'क्या छँटाई और ग्रेडिंग की तस्वीरें उपलब्ध हैं?',
  'consumer.chat.messagePlaceholder': '{name} को संदेश भेजें…',
  'consumer.chat.send': 'भेजें',
  'consumer.chat.loadError': 'आपकी बातचीत लोड नहीं हो सकीं। कृपया पुनः प्रयास करें।',
  'consumer.chat.sendFailed': 'संदेश भेजने में विफल',
  'consumer.chat.loadingThreads': 'बातचीतें लोड हो रही हैं…',
  'consumer.chat.replyThanks':
    'धन्यवाद! मैं फसल लॉट तैयार करके वाहन की डिलीवरी की जानकारी पुष्टि करूँगा।',
  'consumer.chat.replyWholesale':
    '500 किलो से अधिक के थोक शिपमेंट के लिए मैं खेत पर अतिरिक्त ₹1.5/किलो की छूट दे सकता हूँ।',
  'consumer.chat.replyDispatch':
    'समझ गया! लोडिंग सुबह 5:00 बजे शुरू होगी। क्रेट रखने के बाद आपको बैच सत्यापन की तस्वीरें मिलेंगी।',
  'consumer.chat.replyQuality':
    'हमारी फसल की मौके पर हाथ से ग्रेडिंग होती है। केवल बिना दाग वाले ग्रेड-ए लॉट ही पैक होते हैं।',

  // Enquiry conversation
  'consumer.enquiry.loadingConversation': 'बातचीत लोड हो रही है…',
  'consumer.enquiry.directConversation': 'उत्पादक से सीधी बातचीत',
  'consumer.enquiry.threadNumber': 'पूछताछ थ्रेड #{id}',
  'consumer.enquiry.socketConnected': 'लाइव कनेक्शन सक्रिय',
  'consumer.enquiry.noMessages': 'अभी तक कोई संदेश नहीं। नमस्ते कहिए!',
  'consumer.enquiry.user': 'उपयोगकर्ता',
  'consumer.enquiry.typeMessage': 'किसान को अपना संदेश लिखें…',
  'consumer.enquiry.send': 'भेजें',
  'consumer.enquiry.failedSend': 'संदेश भेजने में विफल',

  // Farmer profile
  'consumer.farmer.loadingProfile': 'किसान प्रोफ़ाइल और खेत का स्टॉक लोड हो रहा है…',
  'consumer.farmer.notFoundTitle': 'किसान नहीं मिला',
  'consumer.farmer.notFoundBody':
    'यह फसल लॉट प्रोफ़ाइल निष्क्रिय, निजी या क्षेत्रीय एक्सचेंज से अस्थायी रूप से हटा दी गई है।',
  'consumer.farmer.returnMarketplace': 'मार्केटप्लेस पर वापस जाएँ',
  'consumer.farmer.verifiedCultivator': 'सत्यापित किसान',
  'consumer.farmer.registeredCultivator': 'पंजीकृत किसान: {name}',
  'consumer.farmer.totalValuation': 'कुल उपलब्ध फसल मूल्य',
  'consumer.farmer.acrossLots': '{lots} फसल लॉटों में ({units} इकाइयाँ कुल)',
  'consumer.farmer.procureEntire': 'पूरा फसल लॉट खरीदें',
  'consumer.farmer.directChat': 'सीधी चैट',
  'consumer.farmer.whatsappTitle': 'WhatsApp वार्ता खोलें',
  'consumer.farmer.catalogTitle': 'कटी फसल उपज सूची',
  'consumer.farmer.catalogBody':
    '{farm} से सीधे ताज़ी खेत की फसल खरीदें, बिना किसी बिचौलिया के अतिरिक्त लागत।',
  'consumer.farmer.lotAvailable': '{count} लॉट उपलब्ध',
  'consumer.farmer.lotsAvailable': '{count} लॉट उपलब्ध',
  'consumer.farmer.noHarvestTitle': 'कोई सक्रिय फसल लॉट तैयार नहीं है',
  'consumer.farmer.noHarvestBody':
    'इस खेत की अभी कटी सभी फसलें रवाना कर दी गई हैं। मौसमी फसलों के लिए थोड़ी देर बाद देखें।',
  'consumer.farmer.organic': 'जैविक',
  'consumer.farmer.stock': 'स्टॉक: {stock} {unit}',
  'consumer.farmer.directFarmRate': 'सीधी खेत दर',
  'consumer.farmer.lotStock': 'लॉट स्टॉक',
  'consumer.farmer.available': '{stock} {unit} उपलब्ध',
  'consumer.farmer.procurementVolume': 'खरीद मात्रा ({unit})',
  'consumer.farmer.decrease10': '10 कम करें',
  'consumer.farmer.increase10': '10 बढ़ाएँ',
  'consumer.farmer.lot25': '25% लॉट',
  'consumer.farmer.lot50': '50% लॉट',
  'consumer.farmer.stock100': '100% स्टॉक',
  'consumer.farmer.estimatedSubtotal': 'अनुमानित लॉट उप-योग:',
  'consumer.farmer.added': 'जोड़ा गया',
  'consumer.farmer.addCart': 'कार्ट में जोड़ें',
  'consumer.farmer.checkout': 'चेकआउट',
  'consumer.farmer.unableChat': 'चैट रूम स्थापित नहीं हो सका।',
  'consumer.farmer.networkError': 'वार्ता थ्रेड से जुड़ने में नेटवर्क त्रुटि हुई।',
  'consumer.farmer.whatsappMessage':
    'नमस्ते {name}! मैं FarmConnect पर आपके खेत “{farm}” की सूची देख रहा हूँ और पूरी फसल की रवानी पर बात करना चाहता हूँ।',
  'consumer.farmer.enquirySubject': '{farm} के साथ थोक व्यापार पूछताछ',
  'consumer.farmer.enquiryMessage':
    'नमस्ते! मैं FarmConnect पर आपकी फसल सूची देख रहा हूँ और भाड़ा डिलीवरी का समन्वय करना चाहता हूँ।',

  // Farm map
  'consumer.map.loadingMapEngine': 'इंटरैक्टिव मैप इंजन लोड हो रहा है…',
  'consumer.map.registry': 'भू-स्थानिक कृषि पंजी',
  'consumer.map.heading': 'कर्नाटक किसान भूमि मानचित्र',
  'consumer.map.subtitle':
    'पंजीकृत खेत खोजें, फसल स्थान सत्यापित करें और सड़क परिवहन की दूरी का आकलन करें।',
  'consumer.map.plotting': 'कर्नाटक के खेतों के निर्देशांक मानचित्र पर दर्ज किए जा रहे हैं…',
  'consumer.map.activeFarms': 'सक्रिय क्षेत्रीय खेत ({count})',
  'consumer.map.designatedYard': 'निर्धारित मूल भंडार',
  'consumer.map.latitude': 'अक्षांश',
  'consumer.map.longitude': 'देशांतर',
  'consumer.map.viewHarvests': 'सक्रिय फसलें देखें',
  'consumer.map.cultivatorFallback': 'किसान',
  'consumer.map.farmFallback': '{name} का खेत',
  'consumer.map.karnatakaFallback': 'कर्नाटक',
  'consumer.map.organicHarvest': 'जैविक फसल',
  'consumer.map.loadError': 'किसान लोड नहीं हो सके। कृपया फिर कोशिश करें।',

  // Product details
  'consumer.product.loadingDetails': 'उपज का विवरण लोड हो रहा है…',
  'consumer.product.notFound': 'उपज नहीं मिली।',
  'consumer.product.organicCertified': '100% प्रमाणित जैविक',
  'consumer.product.priceHistory': 'दर का इतिहास (ऑडिट ट्रेल)',
  'consumer.product.adjustedPrice': '{date} को {oldPrice} से {newPrice} में समायोजित',
  'consumer.product.farmerPrice': 'किसान द्वारा तय दर',
  'consumer.product.stockOnFarm': 'खेत पर उपलब्ध स्टॉक',
  'consumer.product.farmerLabel': 'किसान: {name}',
  'consumer.product.locationLabel': 'स्थान: {location}',
  'consumer.product.enquiryTitle': 'किसान को सीधी फसल पूछताछ भेजें',
  'consumer.product.enquirySuccess':
    'पूछताछ सफलतापूर्वक भेज दी गई! किसान को तुरंत सूचना दी जाएगी।',
  'consumer.product.enquiryError': 'पूछताछ नहीं भेजी जा सकी: {message}',
  'consumer.product.requirementPlaceholder':
    'आवश्यकता का सारांश (उदाहरण के लिए, शनिवार की पिकअप के लिए 40 किलो चाहिए)',
  'consumer.product.detailPlaceholder':
    'मात्रा, फसल की समय-सीमा या परिवहन के बारे में विस्तृत संदेश…',
  'consumer.product.transmitting': 'भेजा जा रहा है…',
  'consumer.product.transmit': 'पूछताछ भेजें',

  // Checkout
  'consumer.checkout.dismiss': 'बंद करें',
  'consumer.checkout.orderConfirmed': 'ऑर्डर पुष्ट',
  'consumer.checkout.dispatchedPacking': 'फसल पैकिंग के लिए रवाना की गई',
  'consumer.checkout.orderRef': 'ऑर्डर संदर्भ: {id}',
  'consumer.checkout.confirmationBody':
    'किसान को आपका ऑर्डर और क्रेट विशेषताएँ मिल गई हैं। आप ऑर्डर ट्रैकर में पूर्ति के चरण देख सकते हैं।',
  'consumer.checkout.trackOrder': 'ऑर्डर ट्रैक करें',
  'consumer.checkout.browseMarketplace': 'मार्केटप्लेस देखें',
  'consumer.checkout.cartEmptyTitle': 'आपका कार्ट खाली है',
  'consumer.checkout.cartEmptyBody':
    'प्रमाणित उत्पादकों से सीधे उपज चुनने के लिए खेत देखें।',
  'consumer.checkout.exploreHarvests': 'फसलें देखें',
  'consumer.checkout.backMarketplace': 'मार्केटप्लेस पर वापस जाएँ',
  'consumer.checkout.cultivatorMode': 'किसान खरीद मोड',
  'consumer.checkout.wholesaleCheckout': 'सीधा थोक चेकआउट',
  'consumer.checkout.orderingDirect': '{farm} से सीधे फसल का ऑर्डर किया जा रहा है',
  'consumer.checkout.directFarmProducer': 'सीधे खेत उत्पादक',
  'consumer.checkout.manifest': 'फसल मैनिफ़ेस्ट ({count} वस्तुएँ)',
  'consumer.checkout.deliveryAddress': 'डिलीवरी पता',
  'consumer.checkout.addressPlaceholder':
    'पूरा डिलीवरी पता लिखें (सड़क, गाँव, पहचान स्थल, ज़िला, पिन)…',
  'consumer.checkout.settlement': 'भुगतान विवरण',
  'consumer.checkout.produceSubtotal': 'उपज उप-योग:',
  'consumer.checkout.crateDeposit': 'मानक क्रेट जमा राशि:',
  'consumer.checkout.freight': 'अंतर-ज़िला भाड़ा:',
  'consumer.checkout.totalAmount': 'कुल राशि:',
  'consumer.checkout.verifyingOrder': 'ऑर्डर सत्यापित किया जा रहा है…',
  'consumer.checkout.confirmDispatch': 'पुष्टि करें और ऑर्डर रवाना करें',
  'consumer.checkout.escrow':
    'सीधे खेत से एस्क्रो: भौतिक निरीक्षण सत्यापित होने के बाद ही भुगतान जारी होता है।',
  'consumer.checkout.removeProduce': 'उपज हटाएँ',
  'consumer.checkout.cartIsEmptyTitle': 'कार्ट खाली है',
  'consumer.checkout.cartIsEmptyBody':
    'चेकआउट से पहले मार्केटप्लेस से फसल लॉट जोड़ें।',
  'consumer.checkout.addressRequiredTitle': 'डिलीवरी पता आवश्यक है',
  'consumer.checkout.addressRequiredBody':
    'परिवहन मार्ग तय करने के लिए डिलीवरी गंतव्य या गाँव का पहचान स्थान दें।',
  'consumer.checkout.submissionFailedTitle': 'ऑर्डर जमा करना विफल',
  'consumer.checkout.submissionFailedBody':
    'ऑर्डर नहीं दिया जा सका। कृपया शिपमेंट का विवरण दोबारा देखें।',
  'consumer.checkout.processingErrorTitle': 'ऑर्डर प्रोसेसिंग में त्रुटि',
  'consumer.checkout.processingErrorBody':
    'आपका ऑर्डर जमा करते समय नेटवर्क त्रुटि हुई।',

  // Buy portal
  'consumer.buy.heading': 'भू-लॉजिस्टिक्स और लाइव ट्रेड हब',
  'consumer.buy.subtitle':
    'कर्नाटक भर में खरीद स्थानों को फ़िल्टर करें और मानचित्र के साथ किसानों से सीधे बात करें।',
  'consumer.buy.checkout': 'चेकआउट पर जाएँ',

  // Shared product card
  'consumer.card.organic': '100% जैविक',
  'consumer.card.distanceAway': '{distance} किमी दूर',
  'consumer.card.farmerPrice': 'किसान द्वारा तय दर',
  'consumer.card.stockAvailable': 'उपलब्ध स्टॉक',
  'consumer.card.buyWholesale': 'थोक लॉट खरीदें',
};
