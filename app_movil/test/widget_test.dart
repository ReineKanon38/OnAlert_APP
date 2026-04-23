import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:app_movil/app_shell.dart';

void main() {
  testWidgets('Shows splash loader', (WidgetTester tester) async {
    await tester.pumpWidget(const OnAlertApp());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
  });
}
