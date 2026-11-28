// Consumer experience strings — English (reference).
//
// Keys use the `consumer.<section>.<key>` convention. Every key added here
// must also be added to the Kannada and Hindi tables.
import type { TranslationMap } from '../types';

export const consumerEn: TranslationMap = {
  // Consumer layout
  'consumer.layout.syncingWorkspace': 'Syncing buyer workspace',
  'consumer.layout.fetchingWorkspace': 'Fetching your orders and trade discussions…',
  'consumer.layout.signInTitle': 'Sign in to view your orders',
  'consumer.layout.signInBody':
    'Active dispatches, harvest inquiries, and direct orders are tied to your personal buyer profile.',
  'consumer.layout.signInContinue': 'Sign in to continue',
  'consumer.layout.backMarketplace': 'Back to marketplace',
  'consumer.layout.loadingLots': 'Loading harvest lots…',

  // Explore / marketplace
  'consumer.explore.directMarketplace': 'Direct farm marketplace',
  'consumer.explore.verifiedCultivators': 'Verified cultivators',
  'consumer.explore.heading': 'Karnataka fresh harvest lots',
  'consumer.explore.subtitle':
    'Procure authentic agricultural commodities directly from local cultivators with transparent mandi benchmark pricing.',
  'consumer.explore.refreshProduce': 'Refresh produce',
  'consumer.explore.searchPlaceholder': 'Search crop, variety, district, or farm…',
  'consumer.explore.organicOnly': 'Certified organic only',
  'consumer.explore.categoriesLabel': 'Browse crop categories',
  'consumer.explore.allCategories': 'All',
  'consumer.explore.loading': 'Connecting to Karnataka farm yards…',
  'consumer.explore.noListings': 'No produce listings found',
  'consumer.explore.noListingsBody':
    'No crops matched “{search}”. Try another district or reset the organic filter.',
  'consumer.explore.organic': 'Organic',
  'consumer.explore.quantityAvailable': '{quantity} {unit} available',
  'consumer.explore.directFarmRate': 'Direct farm rate',
  'consumer.explore.added': 'Added',
  'consumer.explore.addLot': 'Add lot',
  'consumer.explore.replaceCartTitle': 'Replace cart items?',
  'consumer.explore.replaceCartBody':
    'Your cart contains produce from “{farm}”. Direct farmer logistics allows ordering from one farm per dispatch. Would you like to empty your cart and add this lot from “{targetFarm}”?',
  'consumer.explore.replaceAndAdd': 'Replace and add',
  'consumer.explore.keepExistingCart': 'Keep existing cart',
  'consumer.explore.stockLimitTitle': 'Stock limit reached',
  'consumer.explore.stockLimitBody':
    'Could not add more of this harvest lot. Maximum available quantity has been allocated.',
  'consumer.explore.currentFarm': 'Current farm',
  'consumer.explore.genericFarm': 'Cultivator farm',
  'consumer.explore.karnatakaCultivator': 'Karnataka cultivator',
  'consumer.explore.loadError': 'We could not load the produce catalogue. Please try again.',

  // Favourites — the shared backend owns the list of the account.
  'consumer.favorites.title': 'My favourites',
  'consumer.favorites.subtitle': 'The harvest lots and the cultivators you have kept.',
  'consumer.favorites.refresh': 'Refresh favourites',
  'consumer.favorites.loading': 'Reading your favourites…',
  'consumer.favorites.loadError': 'We could not read your favourites. Please try again.',
  'consumer.favorites.emptyTitle': 'No favourites yet',
  'consumer.favorites.emptyBody':
    'Keep a harvest lot or a cultivator with the heart on the marketplace and it will appear here.',
  'consumer.favorites.exploreMarketplace': 'Explore marketplace',
  'consumer.favorites.listingsTitle': 'Favourite harvest lots',
  'consumer.favorites.farmersTitle': 'Favourite cultivators',
  'consumer.favorites.activeLots': '{count} active lots',
  'consumer.favorites.add': 'Add to favourites',
  'consumer.favorites.remove': 'Remove from favourites',
  'consumer.explore.errorTitle': 'Unable to load produce',
  'consumer.explore.retry': 'Retry',

  // Orders
  'consumer.orders.stepPending': 'Order placed',
  'consumer.orders.stepPacked': 'Harvest packed',
  'consumer.orders.stepDispatched': 'In transit',
  'consumer.orders.stepDelivered': 'Delivered',
  'consumer.orders.loading': 'Loading your orders and shipments…',
  'consumer.orders.title': 'My orders and dispatch tracking',
  'consumer.orders.subtitle':
    'Monitor your active farm-direct harvests and logistics progress from Karnataka fields to your kitchen.',
  'consumer.orders.refresh': 'Refresh orders',
  'consumer.orders.searchPlaceholder': 'Search by order ID, farm, or produce…',
  'consumer.orders.statusAll': 'All',
  'consumer.orders.statusPending': 'Pending',
  'consumer.orders.statusPacked': 'Packed',
  'consumer.orders.statusDispatched': 'Dispatched',
  'consumer.orders.statusDelivered': 'Delivered',
  'consumer.orders.emptyTitle': 'No orders placed yet',
  'consumer.orders.emptyBody':
    'Procure fresh harvest yields directly from local cultivators to start tracking real-time dispatch.',
  'consumer.orders.exploreMarketplace': 'Explore marketplace',
  'consumer.orders.noMatches': 'No orders match your search or filter selection.',
  'consumer.orders.orderNumber': 'Order #{id}',
  'consumer.orders.recent': 'Recent',
  'consumer.orders.cultivatorFarm': 'Cultivator farm',
  'consumer.orders.totalAmount': 'Total amount',
  'consumer.orders.cancelled': 'This order was cancelled.',
  'consumer.orders.procuredItems': 'Procured items',
  'consumer.orders.harvestProduce': 'Harvest produce',
  'consumer.orders.deliveryFreight': 'Delivery location and freight',
  'consumer.orders.directDestination': 'Direct destination delivery',
  'consumer.orders.logisticsFreight': 'Logistics freight:',
  'consumer.orders.inTransit':
    'Produce is in transit! Inspect the packaging and confirm below once delivered.',
  'consumer.orders.receivedOrder': 'Received order',
  'consumer.orders.orderReceived': 'Order received and verified',
  'consumer.orders.procurementCompleted': 'Direct procurement completed',
  'consumer.orders.confirmDeliveryTitle': 'Confirm delivery receipt',
  'consumer.orders.itemsInShipment': 'Items in this shipment',
  'consumer.orders.expectedAmount': 'Expected amount',
  'consumer.orders.cropYield': 'Crop yield',
  'consumer.orders.settlementAuthorization': 'Settlement authorization',
  'consumer.orders.settlementBody':
    'Confirming receipt notifies {farm} and marks this wholesale consignment as fully delivered and accepted.',
  'consumer.orders.inspection':
    'I have unpacked and inspected all items. The harvest quantity and quality match my order.',
  'consumer.orders.notYet': 'Not yet / Cancel',
  'consumer.orders.verifying': 'Verifying…',
  'consumer.orders.confirmAccept': 'Confirm and accept delivery',
  'consumer.orders.loadError': 'We could not load your orders. Please try again.',
  'consumer.orders.deliveryNotConfirmed':
    'The shared backend did not confirm the delivery, so the order still carries its real status. Please try again.',

  // Chats
  'consumer.chat.directChats': 'Direct farmer chats',
  'consumer.chat.buyerPortal': 'Buyer portal',
  'consumer.chat.title': 'Direct trade messages and quotes',
  'consumer.chat.subtitle':
    'Coordinate lot dispatches, packaging specifications, and wholesale price quotes directly with verified growers.',
  'consumer.chat.marketplace': 'Marketplace',
  'consumer.chat.searchGrower': 'Search grower, crop, or location…',
  'consumer.chat.searchMandi': 'Search grower, crop, or mandi…',
  'consumer.chat.noChats': 'No chats match your search',
  'consumer.chat.youPrefix': 'You: ',
  'consumer.chat.noMessages': 'No messages yet',
  'consumer.chat.yesterday': 'Yesterday',
  'consumer.chat.backContacts': 'Back to contacts',
  'consumer.chat.verified': 'Verified',
  'consumer.chat.lot': 'Lot',
  'consumer.chat.callGrower': 'Call grower',
  'consumer.chat.escrowTitle': 'Escrow-protected negotiations',
  'consumer.chat.escrowBody':
    'Funds are held securely by FarmConnect and released only after verified produce delivery.',
  'consumer.chat.farmGateQuote': 'Farm-gate quote',
  'consumer.chat.orderLot': 'Order lot',
  'consumer.chat.quickReplies': 'Quick replies:',
  'consumer.chat.chipDispatch': 'Can you dispatch by tomorrow morning?',
  'consumer.chat.chipWholesale': 'Can we negotiate for a 500 kg wholesale lot?',
  'consumer.chat.chipPackaging': 'Please confirm the crate packaging standard.',
  'consumer.chat.chipGrading': 'Are sorting and grading photos available?',
  'consumer.chat.messagePlaceholder': 'Message {name}…',
  'consumer.chat.send': 'Send',
  'consumer.chat.loadError': 'Could not load your conversations. Please try again.',
  'consumer.chat.sendFailed': 'Failed to send message',
  'consumer.chat.loadingThreads': 'Loading conversations…',
  'consumer.chat.replyThanks':
    'Thank you! I will prepare the harvest lot and confirm the vehicle pickup details.',
  'consumer.chat.replyWholesale':
    'For wholesale consignments over 500 kg, I can offer an additional ₹1.5/kg concession at the farm gate.',
  'consumer.chat.replyDispatch':
    'Understood! Loading starts at 5:00 AM. You will receive crate batch verification photos once stacked.',
  'consumer.chat.replyQuality':
    'Our harvest is hand-graded on site. Only Grade-A lots without blemishes are packed.',

  // Enquiry conversation
  'consumer.enquiry.loadingConversation': 'Loading conversation…',
  'consumer.enquiry.directConversation': 'Direct producer conversation',
  'consumer.enquiry.threadNumber': 'Enquiry thread #{id}',
  'consumer.enquiry.socketConnected': 'Live connection active',
  'consumer.enquiry.noMessages': 'No messages yet. Say hello!',
  'consumer.enquiry.user': 'User',
  'consumer.enquiry.typeMessage': 'Type your message to the farmer…',
  'consumer.enquiry.send': 'Send',
  'consumer.enquiry.failedSend': 'Failed to send message',

  // Farmer profile
  'consumer.farmer.loadingProfile': 'Loading cultivator profile and field stock…',
  'consumer.farmer.notFoundTitle': 'Cultivator not found',
  'consumer.farmer.notFoundBody':
    'This cultivation lot profile is inactive, private, or has been temporarily delisted from the regional exchange.',
  'consumer.farmer.returnMarketplace': 'Return to marketplace',
  'consumer.farmer.verifiedCultivator': 'Verified cultivator',
  'consumer.farmer.registeredCultivator': 'Registered cultivator: {name}',
  'consumer.farmer.totalValuation': 'Total available harvest valuation',
  'consumer.farmer.acrossLots': 'Across {lots} harvest lots ({units} units total)',
  'consumer.farmer.procureEntire': 'Procure entire harvest lot',
  'consumer.farmer.directChat': 'Direct chat',
  'consumer.farmer.whatsappTitle': 'Open WhatsApp negotiation',
  'consumer.farmer.catalogTitle': 'Harvested produce catalog',
  'consumer.farmer.catalogBody':
    'Source farm-fresh harvests directly from {farm} with no middleman markups.',
  'consumer.farmer.lotAvailable': '{count} lot available',
  'consumer.farmer.lotsAvailable': '{count} lots available',
  'consumer.farmer.noHarvestTitle': 'No active harvest lots ready',
  'consumer.farmer.noHarvestBody':
    'This farm has dispatched all currently harvested crops. Check back shortly for seasonal harvests.',
  'consumer.farmer.organic': 'Organic',
  'consumer.farmer.stock': 'Stock: {stock} {unit}',
  'consumer.farmer.directFarmRate': 'Direct farm rate',
  'consumer.farmer.lotStock': 'Lot stock',
  'consumer.farmer.available': '{stock} {unit} available',
  'consumer.farmer.procurementVolume': 'Procurement volume ({unit})',
  'consumer.farmer.decrease10': 'Decrease by 10',
  'consumer.farmer.increase10': 'Increase by 10',
  'consumer.farmer.lot25': '25% lot',
  'consumer.farmer.lot50': '50% lot',
  'consumer.farmer.stock100': '100% stock',
  'consumer.farmer.estimatedSubtotal': 'Estimated lot subtotal:',
  'consumer.farmer.added': 'Added',
  'consumer.farmer.addCart': 'Add to cart',
  'consumer.farmer.checkout': 'Checkout',
  'consumer.farmer.unableChat': 'Unable to establish chat room.',
  'consumer.farmer.networkError': 'Network error connecting to the negotiation thread.',
  'consumer.farmer.whatsappMessage':
    'Namaskara {name}! I am looking at your farm catalogue for “{farm}” on FarmConnect and would like to negotiate dispatch of the whole harvest.',
  'consumer.farmer.enquirySubject': 'Bulk trade inquiry with {farm}',
  'consumer.farmer.enquiryMessage':
    'Namaskara! I am reviewing your harvest catalogue on FarmConnect and would like to coordinate freight delivery.',

  // Farm map
  'consumer.map.loadingMapEngine': 'Loading interactive map engine…',
  'consumer.map.registry': 'Geospatial agricultural registry',
  'consumer.map.heading': 'Karnataka cultivator plot map',
  'consumer.map.subtitle':
    'Locate registered farms, verify harvest locations, and evaluate road transport distances.',
  'consumer.map.plotting': 'Plotting Karnataka farm coordinates…',
  'consumer.map.activeFarms': 'Active regional farms ({count})',
  'consumer.map.designatedYard': 'Designated origin yard',
  'consumer.map.latitude': 'Lat',
  'consumer.map.longitude': 'Lon',
  'consumer.map.viewHarvests': 'View active harvests',
  'consumer.map.cultivatorFallback': 'Cultivator',
  'consumer.map.farmFallback': '{name}’s farm',
  'consumer.map.karnatakaFallback': 'Karnataka',
  'consumer.map.organicHarvest': 'Organic harvest',
  'consumer.map.loadError': 'We could not load cultivators. Please try again.',

  // Product details
  'consumer.product.loadingDetails': 'Loading produce details…',
  'consumer.product.notFound': 'Product not found.',
  'consumer.product.organicCertified': '100% certified organic',
  'consumer.product.priceHistory': 'Price history (audit trail)',
  'consumer.product.adjustedPrice': 'Adjusted from {oldPrice} to {newPrice} on {date}',
  'consumer.product.farmerPrice': 'Farmer listed price',
  'consumer.product.stockOnFarm': 'Stock on farm',
  'consumer.product.farmerLabel': 'Farmer: {name}',
  'consumer.product.locationLabel': 'Location: {location}',
  'consumer.product.enquiryTitle': 'Send direct crop enquiry to farmer',
  'consumer.product.enquirySuccess':
    'Enquiry sent successfully! The farmer will be notified immediately.',
  'consumer.product.enquiryError': 'Unable to send enquiry: {message}',
  'consumer.product.requirementPlaceholder':
    'Requirement summary (for example, 40 kg needed for Saturday pickup)',
  'consumer.product.detailPlaceholder':
    'Detailed message about quantity, harvest timing, or transit…',
  'consumer.product.transmitting': 'Transmitting…',
  'consumer.product.transmit': 'Transmit enquiry',

  // Checkout
  'consumer.checkout.dismiss': 'Dismiss',
  'consumer.checkout.orderConfirmed': 'Order confirmed',
  'consumer.checkout.dispatchedPacking': 'Harvest dispatched for packing',
  'consumer.checkout.orderRef': 'Order reference: {id}',
  'consumer.checkout.confirmationBody':
    'The cultivator has received your order and crate specifications. You can monitor fulfilment stages in your order tracker.',
  'consumer.checkout.trackOrder': 'Track order',
  'consumer.checkout.browseMarketplace': 'Browse marketplace',
  'consumer.checkout.cartEmptyTitle': 'Your cart is empty',
  'consumer.checkout.cartEmptyBody':
    'Browse farmlands to select produce directly from certified growers.',
  'consumer.checkout.exploreHarvests': 'Explore harvests',
  'consumer.checkout.backMarketplace': 'Back to marketplace',
  'consumer.checkout.cultivatorMode': 'Cultivator purchase mode',
  'consumer.checkout.wholesaleCheckout': 'Direct wholesale checkout',
  'consumer.checkout.orderingDirect': 'Ordering harvest directly from {farm}',
  'consumer.checkout.directFarmProducer': 'Direct farm producer',
  'consumer.checkout.manifest': 'Harvest manifest ({count} items)',
  'consumer.checkout.deliveryAddress': 'Delivery address',
  'consumer.checkout.addressPlaceholder':
    'Enter a complete delivery address (street, village, landmark, district, PIN)…',
  'consumer.checkout.settlement': 'Settlement breakdown',
  'consumer.checkout.produceSubtotal': 'Produce subtotal:',
  'consumer.checkout.crateDeposit': 'Standardized crate deposit:',
  'consumer.checkout.freight': 'Inter-district freight:',
  'consumer.checkout.totalAmount': 'Total amount:',
  'consumer.checkout.verifyingOrder': 'Verifying order…',
  'consumer.checkout.confirmDispatch': 'Confirm and dispatch order',
  'consumer.checkout.escrow':
    'Direct-from-farm escrow: Payment is released after verified physical inspection.',
  'consumer.checkout.removeProduce': 'Remove produce',
  'consumer.checkout.cartIsEmptyTitle': 'Cart is empty',
  'consumer.checkout.cartIsEmptyBody':
    'Please add produce lots from the marketplace before checking out.',
  'consumer.checkout.addressRequiredTitle': 'Delivery address required',
  'consumer.checkout.addressRequiredBody':
    'Please provide a delivery destination or village landmark for transport routing.',
  'consumer.checkout.submissionFailedTitle': 'Order submission failed',
  'consumer.checkout.submissionFailedBody':
    'Could not place the order. Please review the consignment details.',
  'consumer.checkout.processingErrorTitle': 'Order processing error',
  'consumer.checkout.processingErrorBody':
    'A network error occurred while submitting your order.',

  // Buy portal
  'consumer.buy.heading': 'Geo-logistics and live trade hub',
  'consumer.buy.subtitle':
    'Filter procurement locations across Karnataka and negotiate directly with farmers beside the map.',
  'consumer.buy.checkout': 'Go to checkout',

  // Shared product card
  'consumer.card.organic': '100% organic',
  'consumer.card.distanceAway': '{distance} km away',
  'consumer.card.farmerPrice': 'Farmer listed price',
  'consumer.card.stockAvailable': 'Stock available',
  'consumer.card.buyWholesale': 'Buy wholesale lot',
};
