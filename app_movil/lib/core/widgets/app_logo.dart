import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class AppLogo extends StatelessWidget {
  final double size;

  const AppLogo({super.key, this.size = 72});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.32),
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x300F5F66),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: const Icon(
        Icons.warning_amber_rounded,
        color: Colors.white,
        size: 38,
      ),
    );
  }
}
