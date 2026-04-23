class AppConfig {
  // Sobrescribe segun entorno:
  // Android emulador: --dart-define=API_BASE_URL=http://10.0.2.2:3000
  // Dispositivo fisico (misma Wi-Fi): --dart-define=API_BASE_URL=http://192.168.1.68:3000
  // Dispositivo fisico por USB: adb reverse tcp:3000 tcp:3000 (usa localhost)
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );

  // Modo sin backend para avanzar UI/QA mientras se trabaja BD/API.
  static const useMockData = bool.fromEnvironment(
    'USE_MOCK_DATA',
    defaultValue: false,
  );

  // En QA permite cancelar alerta antes de enviarla.
  // Para produccion se puede desactivar con:
  // --dart-define=ALLOW_ALERT_CANCEL=false
  static const allowAlertCancel = bool.fromEnvironment(
    'ALLOW_ALERT_CANCEL',
    defaultValue: true,
  );
}
