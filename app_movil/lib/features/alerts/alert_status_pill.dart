import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class AlertStatusPill extends StatelessWidget {
  final String status;

  const AlertStatusPill({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase();
    final color = switch (normalized) {
      'en_proceso' => const Color(0xFFF59E0B),
      'cerrada' => AppColors.success,
      'falsa_alarma' => AppColors.textSecondary,
      _ => AppColors.danger,
    };

    final label = normalized.replaceAll('_', ' ');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }
}
