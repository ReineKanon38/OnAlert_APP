import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../core/config/app_config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  late IO.Socket socket;
  bool _connected = false;

  SocketService._internal();

  factory SocketService() {
    return _instance;
  }

  bool get isConnected => _connected;

  Future<void> connect({required int userId}) async {
    if (_connected) {
      return;
    }

    try {
      socket = IO.io(
        AppConfig.apiBaseUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .build(),
      );

      socket.onConnect((_) {
        print('[Socket] Conectado al servidor');
        _connected = true;

        // Registrar guardia cuando se conecta
        socket.emit('guard-join', userId);
        print('[Socket] Usuario $userId registrado');
      });

      socket.onDisconnect((_) {
        print('[Socket] Desconectado del servidor');
        _connected = false;
      });

      socket.onError((error) {
        print('[Socket] Error: $error');
      });

      socket.connect();
    } catch (e) {
      print('[Socket] Error al conectar: $e');
    }
  }

  Future<void> sendAlert({
    required int alertId,
    required String usuario,
    required String email,
    required String role,
    required double latitude,
    required double longitude,
    required String descripcion,
    String? fotoUrl,
  }) async {
    if (!_connected) {
      print('[Socket] No conectado, intentando conectar...');
      return;
    }

    try {
      socket.emit('alert-triggered', {
        'alertId': alertId,
        'usuario': usuario,
        'email': email,
        'role': role,
        'latitude': latitude,
        'longitude': longitude,
        'descripcion': descripcion,
        'fotoUrl': fotoUrl,
        'timestamp': DateTime.now().toIso8601String(),
      });
      print('[Socket] Alerta $alertId transmitida a guardias');
    } catch (e) {
      print('[Socket] Error enviando alerta: $e');
    }
  }

  Future<void> updateAlertStatus({
    required int alertId,
    required String estado,
    String? observacion,
  }) async {
    if (!_connected) return;

    try {
      socket.emit('alert-status-changed', {
        'id': alertId,
        'estado': estado,
        'observacion': observacion,
      });
      print('[Socket] Estado de alerta $alertId actualizado');
    } catch (e) {
      print('[Socket] Error actualizando estado: $e');
    }
  }

  void disconnect() {
    if (_connected && socket.connected) {
      socket.disconnect();
      _connected = false;
      print('[Socket] Desconexión manual');
    }
  }
}
