import 'dart:convert';

import 'package:flutter/material.dart';

ImageProvider<Object>? profileImageProvider(String? imageValue) {
  if (imageValue == null || imageValue.isEmpty) {
    return null;
  }

  if (imageValue.startsWith('data:image/')) {
    final separator = imageValue.indexOf(',');
    if (separator == -1) {
      return null;
    }

    try {
      return MemoryImage(base64Decode(imageValue.substring(separator + 1)));
    } catch (_) {
      return null;
    }
  }

  if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
    return NetworkImage(imageValue);
  }

  return null;
}

Widget profileAvatar(
  String? imageValue, {
  double radius = 28,
  double iconSize = 30,
  Color backgroundColor = const Color(0x22000000),
  Color iconColor = Colors.white,
}) {
  final provider = profileImageProvider(imageValue);
  return CircleAvatar(
    radius: radius,
    backgroundColor: backgroundColor,
    backgroundImage: provider,
    child: provider == null
        ? Icon(Icons.account_circle, size: iconSize, color: iconColor)
        : null,
  );
}

String guessMimeType(String path) {
  final lowerPath = path.toLowerCase();
  if (lowerPath.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerPath.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}
