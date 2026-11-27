import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:farmconnect_mobile/core/theme/app_theme.dart';
import 'package:farmconnect_mobile/features/consumer/cart_controller.dart';
import 'package:farmconnect_mobile/features/consumer/cart_page.dart';
import 'package:farmconnect_mobile/data/models/product.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Product _product({
  String id = 'p_1',
  String title = 'Native Tomatoes',
  double minOrderKg = 10,
}) {
  return Product.fromJson({
    'id': id,
    'title': title,
    'description': 'Fresh harvest',
    'farmerPrice': 28,
    'quantityAvailable': 250,
    'priceUnit': 'PER_KG',
    'quantityUnit': 'KG',
    'minOrderKg': minOrderKg,
  });
}

void main() {
  testWidgets('cart screen shows an empty state and adds products', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light(),
          home: const CartPage(),
        ),
      ),
    );

    await tester.pump();

    expect(find.text('Your Cart is Empty'), findsOneWidget);

    final container = ProviderScope.containerOf(
      tester.element(find.byType(CartPage)),
    );
    container.read(cartControllerProvider.notifier).add(_product(), quantity: 25);

    await tester.pump();

    expect(find.text('Your Cart is Empty'), findsNothing);
    expect(find.text('Native Tomatoes'), findsOneWidget);
    expect(find.textContaining('Qty'), findsNothing);
  });

  test('cart controller respects the minimum order quantity', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final controller = container.read(cartControllerProvider.notifier);
    controller.add(_product(), quantity: 2);

    final state = container.read(cartControllerProvider);
    expect(state.lines.single.quantity, 10);
    expect(state.itemsTotal, 280);

    controller.updateQuantity('p_1', 50);
    expect(container.read(cartControllerProvider).lines.single.quantity, 50);

    controller.remove('p_1');
    expect(container.read(cartControllerProvider).isEmpty, isTrue);
  });
}
