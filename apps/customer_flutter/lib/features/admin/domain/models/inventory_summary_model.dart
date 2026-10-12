import 'stock_movement_model.dart';

class InventorySummaryModel {
  final int totalProducts;
  final int inStockCount;
  final int lowStockCount;
  final int outOfStockCount;
  final int expiringSoonCount;
  final int activeAlertsCount;
  final List<StockMovementModel> recentMovements;

  const InventorySummaryModel({
    required this.totalProducts,
    required this.inStockCount,
    required this.lowStockCount,
    required this.outOfStockCount,
    required this.expiringSoonCount,
    required this.activeAlertsCount,
    required this.recentMovements,
  });

  factory InventorySummaryModel.fromJson(Map<String, dynamic> json) {
    final movementsList = (json['recentMovements'] as List<dynamic>? ?? [])
        .map((m) => StockMovementModel.fromJson(m as Map<String, dynamic>))
        .toList();

    return InventorySummaryModel(
      totalProducts: (json['totalProducts'] as num?)?.toInt() ?? 0,
      inStockCount: (json['inStockCount'] as num?)?.toInt() ?? 0,
      lowStockCount: (json['lowStockCount'] as num?)?.toInt() ?? 0,
      outOfStockCount: (json['outOfStockCount'] as num?)?.toInt() ?? 0,
      expiringSoonCount: (json['expiringSoonCount'] as num?)?.toInt() ?? 0,
      activeAlertsCount: (json['activeAlertsCount'] as num?)?.toInt() ?? 0,
      recentMovements: movementsList,
    );
  }
}
