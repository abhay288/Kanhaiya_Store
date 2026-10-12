import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer_flutter/app/app.dart';

void main() {
  testWidgets('Kanhaiya Store App launches and displays splash branding', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: KanhaiyaStoreApp(),
      ),
    );

    // Verify splash screen renders branding
    expect(find.text('Kanhaiya General Store'), findsOneWidget);
    expect(find.text('In-Store Purchase & Pickup Only'), findsOneWidget);

    // Let the splash navigation timer settle
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    // Verify it navigated to Home screen
    expect(find.text('Kanhaiya General Store'), findsOneWidget);
  });
}
