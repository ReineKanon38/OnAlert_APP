import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../core/config/app_config.dart';
import 'socket_service.dart';

class AuthService {
  static const String baseUrl = AppConfig.apiBaseUrl;
  static const String _tokenKey = 'auth_token';

  static Map<String, dynamic>? _mockUser;
  static final List<Map<String, dynamic>> _mockAlerts = [];

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static String _mockToken() => 'mock-token-onalert';

  static DateTime _toDateTime(String? value) {
    if (value == null || value.isEmpty) {
      return DateTime.now();
    }
    return DateTime.tryParse(value) ?? DateTime.now();
  }

  static Map<String, dynamic> _decodeJsonBody(http.Response response) {
    final body = response.body.trim();
    if (body.isEmpty) {
      return {};
    }

    final decoded = jsonDecode(body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }

    throw const FormatException('La respuesta del servidor no es un objeto JSON valido.');
  }

  static String _extractResponseError(http.Response response, String fallback) {
    try {
      final data = _decodeJsonBody(response);
      final error = data['error']?.toString();
      if (error != null && error.isNotEmpty) {
        return error;
      }
    } catch (_) {
      if (response.statusCode >= 500) {
        return 'El servidor devolvio un error interno.';
      }
      return fallback;
    }

    return fallback;
  }

  // Registro
  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String nombre,
    required String matricula,
    String role = 'student',
  }) async {
    if (AppConfig.useMockData) {
      _mockUser = {
        'id': 1,
        'email': email,
        'nombre': nombre,
        'matricula': matricula,
        'role': role,
        'vigente': true,
        'fotoUrl': null,
        'createdAt': DateTime.now().toIso8601String(),
      };

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, _mockToken());
      return {'success': true, 'usuario': _mockUser};
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'nombre': nombre,
          'matricula': matricula,
          'role': role,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['token'];

        // Guardar token
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, token);

        return {'success': true, 'usuario': data['usuario']};
      } else {
        return {'success': false, 'error': jsonDecode(response.body)['error']};
      }
    } catch (e) {
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }

  // Login
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    if (AppConfig.useMockData) {
      _mockUser ??= {
        'id': 1,
        'email': email,
        'nombre': 'Usuario Demo',
        'matricula': 'MOCK001',
        'role': 'student',
        'vigente': true,
        'fotoUrl': null,
        'createdAt': DateTime.now().toIso8601String(),
      };

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, _mockToken());
      return {'success': true, 'usuario': _mockUser};
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['token'];

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, token);

        return {'success': true, 'usuario': data['usuario']};
      } else {
        return {'success': false, 'error': jsonDecode(response.body)['error']};
      }
    } catch (e) {
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }

  // Obtener token guardado
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<Map<String, dynamic>> getProfile() async {
    if (AppConfig.useMockData) {
      if (_mockUser == null) {
        return {'success': false, 'error': 'No hay sesion mock activa'};
      }
      return {'success': true, 'usuario': _mockUser};
    }

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me'),
        headers: await _authHeaders(),
      );

      final data = _decodeJsonBody(response);
      if (response.statusCode == 200) {
        return {'success': true, 'usuario': data['usuario']};
      }

      return {
        'success': false,
        'error': data['error'] ?? 'No se pudo obtener el perfil',
      };
    } on FormatException {
      return {
        'success': false,
        'error': 'Respuesta invalida del servidor al consultar el perfil.',
      };
    } catch (e) {
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }

  static Future<Map<String, dynamic>> updateProfile({
    String? password,
    String? fotoUrl,
  }) async {
    if (AppConfig.useMockData) {
      if (_mockUser == null) {
        return {'success': false, 'error': 'No hay sesion mock activa'};
      }

      if (fotoUrl != null && fotoUrl.isNotEmpty) {
        _mockUser = {..._mockUser!, 'fotoUrl': fotoUrl};
      }

      return {'success': true, 'usuario': _mockUser};
    }

    try {
      final payload = <String, dynamic>{};
      if (password != null && password.isNotEmpty) {
        payload['password'] = password;
      }
      if (fotoUrl != null && fotoUrl.isNotEmpty) {
        payload['fotoUrl'] = fotoUrl;
      }

      final response = await http.put(
        Uri.parse('$baseUrl/auth/me'),
        headers: await _authHeaders(),
        body: jsonEncode(payload),
      );

      final data = _decodeJsonBody(response);
      if (response.statusCode == 200) {
        return {'success': true, 'usuario': data['usuario']};
      }

      return {
        'success': false,
        'error': data['error'] ?? 'No se pudo actualizar el perfil',
      };
    } on FormatException {
      return {
        'success': false,
        'error': 'Respuesta invalida del servidor al actualizar el perfil.',
      };
    } catch (e) {
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }

  // Cerrar sesión
  static Future<void> logout() async {
    _mockUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  // Sprint 2: Emitir alerta con coordenadas
  static Future<Map<String, dynamic>> sendAlert({
    required double latitude,
    required double longitude,
    String? descripcion,
  }) async {
    if (AppConfig.useMockData) {
      final createdAt = DateTime.now().toIso8601String();
      final alert = {
        'id': _mockAlerts.length + 1,
        'userId': _mockUser?['id'] ?? 1,
        'usuario': _mockUser?['nombre'] ?? 'Usuario Demo',
        'email': _mockUser?['email'] ?? 'demo@tesch.edu.mx',
        'role': _mockUser?['role'] ?? 'student',
        'latitude': latitude,
        'longitude': longitude,
        'descripcion': descripcion,
        'estado': 'pendiente',
        'prioridad': 'alta',
        'observacion': null,
        'handledBy': null,
        'createdAt': createdAt,
        'updatedAt': createdAt,
      };

      _mockAlerts.insert(0, alert);
      return {'success': true, 'alerta': alert};
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/alerts'),
        headers: await _authHeaders(),
        body: jsonEncode({
          'latitude': latitude,
          'longitude': longitude,
          'descripcion': descripcion,
        }),
      );

      final data = _decodeJsonBody(response);
      if (response.statusCode == 200) {
        final alerta = data['alerta'];

        // 🚨 TRANSMITIR ALERTA A TRAVÉS DE WEBSOCKET A TODOS LOS GUARDIAS
        try {
          final socketService = SocketService();
          if (socketService.isConnected) {
            await socketService.sendAlert(
              alertId: alerta['id'] ?? 0,
              usuario: _mockUser?['nombre'] ?? 'Usuario',
              email: _mockUser?['email'] ?? 'email@tesch.edu.mx',
              role: _mockUser?['role'] ?? 'student',
              latitude: latitude,
              longitude: longitude,
              descripcion: descripcion ?? 'Alerta emitida desde app móvil',
              fotoUrl: _mockUser?['fotoUrl'],
            );
            print('[Alert] Alerta ${alerta['id']} transmitida vía WebSocket');
          }
        } catch (e) {
          print('[Alert] Error transmitiendo por WebSocket: $e');
        }

        return {'success': true, 'alerta': alerta};
      }

      return {
        'success': false,
        'error': data['error'] ?? _extractResponseError(response, 'Error al emitir alerta'),
      };
    } on FormatException {
      return {
        'success': false,
        'error': 'Respuesta invalida del servidor al emitir la alerta.',
      };
    } catch (e) {
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }

  // Sprint 2: Consultar alertas (vista tipo dashboard básico)
  static Future<Map<String, dynamic>> getAlerts() async {
    if (AppConfig.useMockData) {
      final sorted = [..._mockAlerts]
        ..sort(
          (a, b) => _toDateTime(
            b['createdAt']?.toString(),
          ).compareTo(_toDateTime(a['createdAt']?.toString())),
        );
      return {'success': true, 'total': sorted.length, 'alertas': sorted};
    }

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/alerts'),
        headers: await _authHeaders(),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {
          'success': true,
          'total': data['total'] ?? 0,
          'alertas': data['alertas'] ?? [],
        };
      }

      return {
        'success': false,
        'error': data['error'] ?? 'Error al consultar alertas',
      };
    } catch (e) {
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }
}
