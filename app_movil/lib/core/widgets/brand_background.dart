import 'package:flutter/material.dart';

class BrandBackground extends StatelessWidget {
  final Widget child;

  const BrandBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF3EEE8),
      child: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 220,
            child: IgnorePointer(
              child: CustomPaint(painter: _NetworkPainter(topHalf: true)),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 240,
            child: IgnorePointer(
              child: CustomPaint(painter: _NetworkPainter(topHalf: false)),
            ),
          ),
          SafeArea(child: child),
        ],
      ),
    );
  }
}

class _NetworkPainter extends CustomPainter {
  final bool topHalf;

  _NetworkPainter({required this.topHalf});

  @override
  void paint(Canvas canvas, Size size) {
    final points = topHalf
        ? <Offset>[
            Offset(size.width * 0.08, size.height * 0.75),
            Offset(size.width * 0.22, size.height * 0.56),
            Offset(size.width * 0.39, size.height * 0.44),
            Offset(size.width * 0.56, size.height * 0.61),
            Offset(size.width * 0.75, size.height * 0.37),
            Offset(size.width * 0.9, size.height * 0.58),
            Offset(size.width * 0.52, size.height * 0.2),
            Offset(size.width * 0.28, size.height * 0.28),
          ]
        : <Offset>[
            Offset(size.width * 0.02, size.height * 0.45),
            Offset(size.width * 0.16, size.height * 0.67),
            Offset(size.width * 0.31, size.height * 0.31),
            Offset(size.width * 0.53, size.height * 0.51),
            Offset(size.width * 0.77, size.height * 0.42),
            Offset(size.width * 0.94, size.height * 0.6),
            Offset(size.width * 0.62, size.height * 0.14),
            Offset(size.width * 0.39, size.height * 0.81),
          ];

    final linePaint = Paint()
      ..color = const Color(0x44A9A9A9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    for (var i = 0; i < points.length; i++) {
      final next = points[(i + 1) % points.length];
      canvas.drawLine(points[i], next, linePaint);
      if (i + 2 < points.length) {
        canvas.drawLine(points[i], points[i + 2], linePaint);
      }
    }

    final neutralPaint = Paint()..color = const Color(0x99B0B0B0);
    final redPaint = Paint()..color = const Color(0xCCCF1D1D);

    for (var i = 0; i < points.length; i++) {
      final paint = i % 4 == 0 ? redPaint : neutralPaint;
      canvas.drawCircle(points[i], i % 3 == 0 ? 3.5 : 2.8, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _NetworkPainter oldDelegate) {
    return oldDelegate.topHalf != topHalf;
  }
}
