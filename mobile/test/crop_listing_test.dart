import 'package:flutter_test/flutter_test.dart';

import 'package:farmconnect_mobile/data/models/product.dart';

void main() {
  group('Product crop fields', () {
    test('parses the crop name, variety and category of a listing', () {
      final product = Product.fromJson({
        'id': 'lot-1',
        'title': 'Fresh Tomato',
        'description': 'Harvested this morning',
        'farmerPrice': 27.5,
        'quantityAvailable': 150,
        'cropName': 'Tomato',
        'variety': 'Hybrid',
        'category': {
          'id': 'cat-1',
          'name': 'Vegetables',
          'slug': 'vegetables',
        },
      });

      expect(product.cropName, 'Tomato');
      expect(product.variety, 'Hybrid');
      expect(product.category?.name, 'Vegetables');
      expect(product.category?.slug, 'vegetables');
    });

    test('keeps older listings (without crop fields) readable', () {
      final product = Product.fromJson({
        'id': 'lot-2',
        'title': 'Legacy lot',
        'description': 'Created before the crop fields existed',
        'farmerPrice': 10,
        'quantityAvailable': 20,
      });

      expect(product.cropName, isNull);
      expect(product.variety, isNull);
      expect(product.category, isNull);
    });

    test('every listing keeps its own quantity and price', () {
      final tomato = Product.fromJson({
        'id': 'lot-a',
        'title': 'Tomato',
        'description': '',
        'farmerPrice': 20,
        'quantityAvailable': 100,
        'cropName': 'Tomato',
      });
      final ragi = Product.fromJson({
        'id': 'lot-b',
        'title': 'Ragi',
        'description': '',
        'farmerPrice': 45,
        'quantityAvailable': 60,
        'cropName': 'Ragi',
      });

      expect(tomato.cropName, isNot(ragi.cropName));
      expect(tomato.farmerPrice, isNot(ragi.farmerPrice));
      expect(tomato.quantityAvailable, isNot(ragi.quantityAvailable));
    });
  });

  group('Crop catalogue models', () {
    test('parses a crop suggestion with its aliases', () {
      final crop = CropSuggestion.fromJson({
        'name': 'Tomato',
        'category': 'vegetables',
        'aliases': ['tomatoes', 'ಟೊಮೇಟೊ', 'टमाटर'],
      });

      expect(crop.name, 'Tomato');
      expect(crop.category, 'vegetables');
      expect(crop.aliases, contains('ಟೊಮೇಟೊ'));
      expect(crop.aliases, contains('टमाटर'));
    });

    test('parses a crop category with its listing count', () {
      final category = CropCategory.fromJson({
        'id': 'cat-1',
        'name': 'Vegetables',
        'slug': 'vegetables',
        'productCount': 3,
      });

      expect(category.name, 'Vegetables');
      expect(category.slug, 'vegetables');
      expect(category.productCount, 3);
    });
  });
}
