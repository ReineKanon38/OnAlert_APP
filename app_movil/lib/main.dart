import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app_shell.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  NotificationService.registerBackgroundHandler();
  runApp(const OnAlertApp());
}
