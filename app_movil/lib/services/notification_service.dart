import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Maneja Firebase Cloud Messaging para notificaciones push.
/// Solo activo en Android (no en web/desktop en este proyecto).
class NotificationService {
  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  /// Inicializa FCM, solicita permisos y retorna el token del dispositivo.
  /// Llama esto una vez después de inicializar Firebase en main().
  static Future<String?> init() async {
    try {
      final settings = await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        debugPrint('[FCM] Permisos denegados por el usuario');
        return null;
      }

      // Foreground: mostrar notificaciones aunque la app esté abierta
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
            alert: true,
            badge: true,
            sound: true,
          );

      final token = await _fcm.getToken();
      debugPrint('[FCM] Token: $token');
      return token;
    } catch (e) {
      debugPrint('[FCM] Error al inicializar: $e');
      return null;
    }
  }

  /// Suscribe a un tema (ej. "security_alerts") para recibir broadcasts.
  static Future<void> subscribeToTopic(String topic) async {
    await _fcm.subscribeToTopic(topic);
    debugPrint('[FCM] Suscrito a topic: $topic');
  }

  /// Cancela suscripción a un tema.
  static Future<void> unsubscribeFromTopic(String topic) async {
    await _fcm.unsubscribeFromTopic(topic);
    debugPrint('[FCM] Desuscrito de topic: $topic');
  }

  /// Registra el handler para mensajes en background/terminated.
  /// Debe llamarse en el top-level de main() (fuera de widgets).
  static void registerBackgroundHandler() {
    FirebaseMessaging.onBackgroundMessage(_backgroundHandler);
  }
}

/// Handler top-level (requerido por FCM para background).
@pragma('vm:entry-point')
Future<void> _backgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM Background] ${message.notification?.title}');
}
