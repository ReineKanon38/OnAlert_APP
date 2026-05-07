class Validators {
  static const _allowedDomains = ['tesch.edu.mx', 'onalert.local'];

  static String? institutionalEmail(String value) {
    final email = value.trim().toLowerCase();
    if (email.isEmpty) {
      return 'Escribe tu correo institucional';
    }
    final allowed = _allowedDomains.any((d) => email.endsWith('@$d'));
    if (!allowed) {
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
