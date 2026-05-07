import 'dart:async';

import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../services/auth_service.dart';
import '../alerts/alert_status_pill.dart';

class GuardHomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const GuardHomeScreen({super.key, required this.user});

  @override
  State<GuardHomeScreen> createState() => _GuardHomeScreenState();
}

class _GuardHomeScreenState extends State<GuardHomeScreen>
    with SingleTickerProviderStateMixin {
  final List<Map<String, dynamic>> _alerts = [];
  late io.Socket _socket;
  bool _connected = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _connectSocket();
  }

  void _connectSocket() {
    _socket = io.io(
      AppConfig.apiBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .build(),
    );

    _socket.onConnect((_) {
      if (!mounted) return;
      setState(() => _connected = true);
      final userId = widget.user['id'];
      if (userId != null) {
        _socket.emit('guard-join', userId);
      }
    });

    _socket.onDisconnect((_) {
      if (!mounted) return;
      setState(() => _connected = false);
      // Reconectar tras 3s
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) _socket.connect();
      });
    });

    _socket.on('new-alert', (data) {
      if (!mounted) return;
      final alert = Map<String, dynamic>.from(data as Map);
      setState(() {
        _alerts.insert(0, alert);
      });
      _triggerAlertVibration();
    });

    // Actualizar alerta existente cuando el dashboard cambia su estado
    _socket.on('alert-updated', (data) {
      if (!mounted) return;
      final updated = Map<String, dynamic>.from(data as Map);
      setState(() {
        final idx = _alerts.indexWhere((a) => a['id'] == updated['id']);
        if (idx >= 0) {
          _alerts[idx] = updated;
        }
      });
    });

    _socket.connect();
  }

  void _triggerAlertVibration() {
    // Feedback visual — el pulso ya maneja la animación
    _pulseController.forward(from: 0);
  }

  String _timeAgo(dynamic createdAt) {
    try {
      final dt = DateTime.parse(createdAt.toString()).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inSeconds < 60) return 'hace ${diff.inSeconds}s';
      if (diff.inMinutes < 60) return 'hace ${diff.inMinutes}min';
      return 'hace ${diff.inHours}h';
    } catch (_) {
      return '';
    }
  }

  Color _prioridadColor(String? p) => switch (p?.toLowerCase()) {
    'urgente' => const Color(0xFFDC2626),
    'alta' => const Color(0xFFEA580C),
    'media' => const Color(0xFFF59E0B),
    'baja' => AppColors.success,
    _ => AppColors.textSecondary,
  };

  @override
  void dispose() {
    _pulseController.dispose();
    _socket.dispose();
    super.dispose();
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    final nombre = widget.user['nombre']?.toString() ?? 'Guardia';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: Row(
          children: [
            const Text(
              'OnAlert',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                'GUARDIA',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
            ),
          ],
        ),
        actions: [
          // Indicador de conexión
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Center(
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (_, __) => Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _connected ? Colors.greenAccent : Colors.grey,
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: _logout,
          ),
        ],
      ),
      body: Column(
        children: [
          // Header con nombre y estado
          Container(
            width: double.infinity,
            color: AppColors.primary,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bienvenido, $nombre',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _connected ? Colors.greenAccent : Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _connected
                          ? 'En línea — recibiendo alertas'
                          : 'Reconectando...',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Lista de alertas
          Expanded(
            child: _alerts.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.shield_outlined,
                          size: 72,
                          color: AppColors.textSecondary.withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Sin alertas activas',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Las alertas aparecerán aquí en tiempo real',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () async {},
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _alerts.length,
                      itemBuilder: (context, index) {
                        final alert = _alerts[index];
                        final prioridad =
                            alert['prioridad']?.toString() ?? 'media';
                        final isNew = index == 0;

                        return AnimatedBuilder(
                          animation: _pulseAnimation,
                          builder: (_, child) => Transform.scale(
                            scale: isNew && _alerts.isNotEmpty ? 1.0 : 1.0,
                            child: child,
                          ),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: isNew
                                  ? Border.all(
                                      color: _prioridadColor(prioridad),
                                      width: 2,
                                    )
                                  : null,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.06),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Fila superior: nombre + estado + tiempo
                                  Row(
                                    children: [
                                      // Avatar
                                      CircleAvatar(
                                        radius: 22,
                                        backgroundColor: _prioridadColor(
                                          prioridad,
                                        ).withValues(alpha: 0.15),
                                        backgroundImage:
                                            alert['fotoUrl'] != null &&
                                                (alert['fotoUrl'] as String)
                                                    .isNotEmpty
                                            ? NetworkImage(
                                                alert['fotoUrl'] as String,
                                              )
                                            : null,
                                        child:
                                            alert['fotoUrl'] == null ||
                                                (alert['fotoUrl'] as String)
                                                    .isEmpty
                                            ? Icon(
                                                Icons.person,
                                                color: _prioridadColor(
                                                  prioridad,
                                                ),
                                                size: 22,
                                              )
                                            : null,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              alert['usuario']?.toString() ??
                                                  'Desconocido',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 15,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                            Text(
                                              alert['email']?.toString() ?? '',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          AlertStatusPill(
                                            status:
                                                alert['estado']?.toString() ??
                                                'pendiente',
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _timeAgo(alert['createdAt']),
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),

                                  const SizedBox(height: 12),

                                  // Descripción
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.bg,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.warning_amber_rounded,
                                          color: _prioridadColor(prioridad),
                                          size: 18,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            alert['descripcion']?.toString() ??
                                                'Alerta de emergencia',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  const SizedBox(height: 10),

                                  // Ubicación y prioridad
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.location_on_outlined,
                                        size: 15,
                                        color: AppColors.textSecondary,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${(alert['latitude'] as num?)?.toStringAsFixed(5) ?? '-'}, '
                                        '${(alert['longitude'] as num?)?.toStringAsFixed(5) ?? '-'}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                      const Spacer(),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: _prioridadColor(
                                            prioridad,
                                          ).withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                        child: Text(
                                          prioridad.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: _prioridadColor(prioridad),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
