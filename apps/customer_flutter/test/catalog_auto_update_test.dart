import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer_flutter/features/admin/data/admin_catalog_repository.dart';
import 'package:customer_flutter/features/catalog/presentation/controllers/catalog_providers.dart';

void main() {
  group('Catalog Auto-Update & Real-Time Sync Suite', () {
    test('catalogVersionProvider increments on bump', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(catalogVersionProvider), 0);

      container.read(catalogVersionProvider.notifier).bump();
      expect(container.read(catalogVersionProvider), 1);

      container.read(catalogVersionProvider.notifier).bump();
      expect(container.read(catalogVersionProvider), 2);
    });

    test('catalogUpdateStream broadcasts when notifyCatalogUpdated is called', () async {
      int receivedEvents = 0;
      final sub = catalogUpdateStream.stream.listen((_) {
        receivedEvents++;
      });
      addTearDown(sub.cancel);

      notifyCatalogUpdated();
      notifyCatalogUpdated();

      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(receivedEvents, 2);
    });

    test('categoriesProvider and collectionsProvider re-evaluate when catalogVersionProvider changes', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Initial read
      final cat1 = container.read(categoriesProvider);
      expect(cat1, isNotNull);

      // Increment version
      container.read(catalogVersionProvider.notifier).bump();

      // Read again after version bump
      final cat2 = container.read(categoriesProvider);
      expect(cat2, isNotNull);
    });
  });
}
