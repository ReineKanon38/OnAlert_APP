class Validators {
  static String? institutionalEmail(String value) {
    final email = value.trim();
    if (email.isEmpty) {
      return 'Escribe tu correo institucional';
    }
    if (!email.toLowerCase().endsWith('@tesch.edu.mx')) {
      return 'Debe terminar en @tesch.edu.mx';
    }
    return null;
  }

  static String? requiredText(String value, String label) {
    if (value.trim().isEmpty) {
      return 'El campo $label es obligatorio';
    }
    return null;
  }
}
