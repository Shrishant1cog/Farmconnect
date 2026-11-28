import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/product.dart';

/// A single line in the consumer cart.
class CartLine {
  const CartLine({
    required this.product,
    required this.quantity,
    this.farmerId,
  });

  final Product product;
  final double quantity;
  final String? farmerId;

  double get lineTotal => product.farmerPrice * quantity;

  CartLine copyWith({double? quantity}) => CartLine(
        product: product,
        quantity: quantity ?? this.quantity,
        farmerId: farmerId,
      );
}

/// Cart state shared by the marketplace, cart and checkout screens.
class CartState {
  const CartState({this.lines = const [], this.deliveryAddress = ''});

  final List<CartLine> lines;
  final String deliveryAddress;

  bool get isEmpty => lines.isEmpty;

  double get itemsTotal => lines.fold(0, (sum, line) => sum + line.lineTotal);

  double get totalQuantity => lines.fold(0, (sum, line) => sum + line.quantity);

  CartState copyWith({List<CartLine>? lines, String? deliveryAddress}) => CartState(
        lines: lines ?? this.lines,
        deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      );
}

/// Cart controller. All prices come from the API payload — the app never
/// recalculates the business pricing itself.
class CartController extends Notifier<CartState> {
  @override
  CartState build() => const CartState();

  void add(Product product, {double quantity = 1}) {
    final minimum = product.minOrderKg > 0 ? product.minOrderKg : 1.0;
    final safeQuantity = quantity < minimum ? minimum : quantity;

    final lines = [...state.lines];
    final index = lines.indexWhere((line) => line.product.id == product.id);

    if (index >= 0) {
      lines[index] = lines[index].copyWith(
        quantity: lines[index].quantity + safeQuantity,
      );
    } else {
      lines.add(
        CartLine(
          product: product,
          quantity: safeQuantity,
          farmerId: product.ownerFarmerProfileId,
        ),
      );
    }

    state = state.copyWith(lines: lines);
  }

  void updateQuantity(String productId, double quantity) {
    final lines = state.lines.map((line) {
      if (line.product.id != productId) {
        return line;
      }
      final minimum = line.product.minOrderKg > 0 ? line.product.minOrderKg : 1.0;
      return line.copyWith(quantity: quantity < minimum ? minimum : quantity);
    }).toList();
    state = state.copyWith(lines: lines);
  }

  void remove(String productId) {
    state = state.copyWith(
      lines: state.lines.where((line) => line.product.id != productId).toList(),
    );
  }

  void setDeliveryAddress(String address) {
    state = state.copyWith(deliveryAddress: address);
  }

  void clear() {
    state = const CartState();
  }
}

final cartControllerProvider = NotifierProvider<CartController, CartState>(
  CartController.new,
);
