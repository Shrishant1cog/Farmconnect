import 'package:flutter_test/flutter_test.dart';

import 'package:farmconnect_mobile/data/models/order.dart';
import 'package:farmconnect_mobile/data/models/product.dart';
import 'package:farmconnect_mobile/data/models/user.dart';
import 'package:farmconnect_mobile/core/network/api_client.dart';

void main() {
  group('AppUser', () {
    test('parses the payload returned by /api/auth/login', () {
      final user = AppUser.fromJson({
        'id': 'usr_1',
        'name': 'Ramesh Kumar',
        'email': 'ramesh@example.com',
        'phone': '9448123456',
        'role': 'FARMER',
        'district': 'Mandya',
        'state': 'Karnataka',
        'farmerProfile': {
          'id': 'fp_1',
          'farmName': 'Ramesh Organic Fields',
          'district': 'Mandya',
          'isVerified': true,
          'latitude': 12.5218,
          'longitude': 76.8951,
        },
      });

      expect(user.id, 'usr_1');
      expect(user.role, UserRole.farmer);
      expect(user.isFarmer, isTrue);
      expect(user.farmerProfile?.farmName, 'Ramesh Organic Fields');
      expect(user.farmerProfile?.latitude, 12.5218);
      expect(user.farmerProfile?.isVerified, isTrue);
    });

    test('defaults unknown roles to CONSUMER', () {
      final user = AppUser.fromJson({'id': 'x', 'role': 'SOMETHING_ELSE'});
      expect(user.role, UserRole.consumer);
      expect(user.isConsumer, isTrue);
    });
  });

  group('Product', () {
    test('reads numeric fields sent as strings', () {
      final product = Product.fromJson({
        'id': 'p_1',
        'title': 'Native Tomatoes',
        'description': 'Fresh',
        'farmerPrice': '28.5',
        'quantityAvailable': '250',
        'priceUnit': 'PER_KG',
        'quantityUnit': 'KG',
        'minOrderKg': '10',
        'isOrganic': true,
        'isAvailable': true,
        'farmerPriceNotice': 'Farmer Listed Price',
        'farmer': {
          'id': 'fp_1',
          'farmName': 'Mandya Agro Farm',
          'user': {'name': 'Ramesh Kumar'},
        },
      });

      expect(product.farmerPrice, 28.5);
      expect(product.quantityAvailable, 250);
      expect(product.minOrderKg, 10);
      expect(product.isOrganic, isTrue);
      expect(product.farmerName, 'Ramesh Kumar');
      expect(product.farmName, 'Mandya Agro Farm');
      expect(product.farmerPriceNotice, 'Farmer Listed Price');
    });
  });

  group('Order', () {
    test('maps the order status aliases used by the backend', () {
      expect(OrderStatus.fromString('IN_TRANSIT'), OrderStatus.dispatched);
      expect(OrderStatus.fromString('DELIVERED'), OrderStatus.delivered);
      expect(OrderStatus.fromString(null), OrderStatus.pending);
    });

    test('keeps "packed" apart from "confirmed"', () {
      // The backend used to rewrite `PACKED` into `CONFIRMED`, so the
      // phone showed "packed" for an order that the shared database
      // still called "confirmed". The harvest can now really be packed,
      // and the two states are two states.
      expect(OrderStatus.fromString('PACKED'), OrderStatus.packed);
      expect(OrderStatus.fromString('CONFIRMED'), OrderStatus.confirmed);
      expect(OrderStatus.packed.wireValue, 'PACKED');
      expect(OrderStatus.confirmed.wireValue, 'CONFIRMED');
      expect(OrderStatus.packed.label, 'Packed');
      expect(OrderStatus.confirmed.label, 'Confirmed');
    });

    test('every status survives the round trip through the wire', () {
      for (final status in OrderStatus.values) {
        expect(OrderStatus.fromString(status.wireValue), status);
      }
    });

    test('parses an order with items', () {
      final order = Order.fromJson({
        'id': 'ord_1',
        'status': 'DISPATCHED',
        'totalItemsCost': 2800,
        'transportCost': 150,
        'containerCost': 45,
        'grandTotal': 2995,
        'deliveryAddress': 'Indiranagar, Bengaluru',
        'items': [
          {
            'id': 'oi_1',
            'productId': 'p_1',
            'quantity': 100,
            'unitPrice': 28,
            'product': {'title': 'Native Tomatoes'},
          },
        ],
        'farmer': {
          'farmName': 'Mandya Agro Farm',
          'user': {'name': 'Ramesh Kumar', 'phone': '9448123456'},
        },
        'consumer': {'name': 'Priya Narayanan', 'phone': '9900456789'},
      });

      expect(order.status, OrderStatus.dispatched);
      expect(order.items.single.productTitle, 'Native Tomatoes');
      expect(order.farmerName, 'Ramesh Kumar');
      expect(order.consumerName, 'Priya Narayanan');
      expect(order.grandTotal, 2995);
    });
  });

  group('ApiClient.extractList', () {
    test('supports the different backend envelopes', () {
      expect(ApiClient.extractList({'data': [1, 2]}), [1, 2]);
      expect(ApiClient.extractList({'products': [3]}), [3]);
      expect(ApiClient.extractList({'data': {'orders': [4]}}), [4]);
      expect(ApiClient.extractList([5]), [5]);
      expect(ApiClient.extractList({'unexpected': 'shape'}), isEmpty);
    });
  });
}
