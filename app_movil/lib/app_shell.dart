import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import 'core/config/app_config.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/profile_image.dart';
import 'core/utils/validators.dart';
import 'core/widgets/app_logo.dart';
import 'core/widgets/brand_background.dart';
import 'core/widgets/oa_primary_button.dart';
import 'features/alerts/alert_status_pill.dart';
import 'services/auth_service.dart';
import 'services/socket_service.dart';

const _supportContactsStorageKey = 'support_contacts';

class OnAlertApp extends StatelessWidget {
  const OnAlertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OnAlert',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await Future.delayed(const Duration(seconds: 2));
    final token = await AuthService.getToken();

    if (!mounted) {
      return;
    }

    if (token == null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      );
      return;
    }

    final profile = await AuthService.getProfile();
    if (!mounted) {
      return;
    }

    if (profile['success'] == true) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      await AuthService.logout();
      if (!mounted) {
        return;
      }
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: BrandBackground(
        child: Center(
          child: CircularProgressIndicator(color: AppColors.danger),
        ),
      ),
    );
  }
}

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BrandBackground(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
          child: Column(
            children: [
              const Spacer(flex: 2),
              const AppLogo(size: 76),
              const SizedBox(height: 16),
              const Text(
                'OnAlert',
                style: TextStyle(fontSize: 42, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sistema de Respuesta de Emergencia',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 18),
              ),
              const Spacer(flex: 3),
              Center(
                child: OaPrimaryButton(
                  label: 'Ingresar',
                  width: 210,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  },
                ),
              ),
              const SizedBox(height: 18),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const RegisterScreen()),
                  );
                },
                child: const Text(
                  'No tienes una cuenta?\nRegistrate',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    decoration: TextDecoration.underline,
                    decorationColor: AppColors.danger,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                '© 2026 OnAlert. Sistema protegido y encriptado.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailCtrl = TextEditingController();
  final passwordCtrl = TextEditingController();
  bool isLoading = false;
  String? errorMsg;

  @override
  void dispose() {
    emailCtrl.dispose();
    passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final emailError = Validators.institutionalEmail(emailCtrl.text);
    final pwdError = Validators.requiredText(passwordCtrl.text, 'contrasena');

    if (emailError != null || pwdError != null) {
      setState(() {
        errorMsg = emailError ?? pwdError;
      });
      return;
    }

    setState(() {
      isLoading = true;
      errorMsg = null;
    });

    final result = await AuthService.login(
      email: emailCtrl.text.trim(),
      password: passwordCtrl.text,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      isLoading = false;
    });

    if (result['success'] != true) {
      setState(() {
        errorMsg = result['error'] ?? 'Error desconocido';
      });
      return;
    }

    final user = result['usuario'] as Map<String, dynamic>;
    final role = user['role']?.toString() ?? '';
    if (role != 'student' && role != 'professor') {
      await AuthService.logout();
      setState(() {
        errorMsg = 'La app movil es solo para alumnado/profesorado.';
      });
      return;
    }

    if (!mounted) {
      return;
    }

    // 📡 CONECTAR A WEBSOCKET CUANDO INICIA SESIÓN
    try {
      final userId = user['id'] as int?;
      if (userId != null) {
        final socketService = SocketService();
        await socketService.connect(userId: userId);
        print('[Login] WebSocket conectado para usuario $userId');
      }
    } catch (e) {
      print('[Login] Error conectando WebSocket: $e');
    }

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const HomeScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return _AuthScreenScaffold(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextField(
            controller: emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(fontSize: 16),
            decoration: const InputDecoration(
              labelText: 'Correo institucional:',
            ),
          ),
          const SizedBox(height: 18),
          TextField(
            controller: passwordCtrl,
            obscureText: true,
            style: const TextStyle(fontSize: 16),
            decoration: const InputDecoration(labelText: 'Contrasena:'),
          ),
          const SizedBox(height: 18),
          if (errorMsg != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                errorMsg!,
                style: const TextStyle(color: AppColors.danger),
              ),
            ),
          OaPrimaryButton(
            label: 'Ingresar',
            width: 220,
            loading: isLoading,
            onPressed: _login,
          ),
        ],
      ),
    );
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final nombreCtrl = TextEditingController();
  final matriculaCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final passwordCtrl = TextEditingController();
  bool isLoading = false;
  String? errorMsg;

  @override
  void dispose() {
    nombreCtrl.dispose();
    matriculaCtrl.dispose();
    emailCtrl.dispose();
    passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final nameError = Validators.requiredText(nombreCtrl.text, 'nombre');
    final matError = Validators.requiredText(matriculaCtrl.text, 'matricula');
    final emailError = Validators.institutionalEmail(emailCtrl.text);
    final pwdError = Validators.requiredText(passwordCtrl.text, 'contrasena');

    if (nameError != null ||
        matError != null ||
        emailError != null ||
        pwdError != null) {
      setState(() {
        errorMsg = nameError ?? matError ?? emailError ?? pwdError;
      });
      return;
    }

    setState(() {
      isLoading = true;
      errorMsg = null;
    });

    final result = await AuthService.register(
      email: emailCtrl.text.trim(),
      password: passwordCtrl.text,
      nombre: nombreCtrl.text.trim(),
      matricula: matriculaCtrl.text.trim(),
    );

    if (!mounted) {
      return;
    }

    setState(() {
      isLoading = false;
    });

    if (result['success'] != true) {
      setState(() {
        errorMsg = result['error'] ?? 'Error en registro';
      });
      return;
    }

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const HomeScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return _AuthScreenScaffold(
      child: SingleChildScrollView(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: matriculaCtrl,
              style: const TextStyle(fontSize: 16),
              decoration: const InputDecoration(labelText: 'Matricula:'),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: nombreCtrl,
              style: const TextStyle(fontSize: 16),
              decoration: const InputDecoration(labelText: 'Nombre:'),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(fontSize: 16),
              decoration: const InputDecoration(
                labelText: 'Correo institucional:',
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: passwordCtrl,
              obscureText: true,
              style: const TextStyle(fontSize: 16),
              decoration: const InputDecoration(labelText: 'Contrasena:'),
            ),
            const SizedBox(height: 14),
            if (errorMsg != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  errorMsg!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            OaPrimaryButton(
              label: 'Ingresar',
              width: 220,
              loading: isLoading,
              onPressed: _register,
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthScreenScaffold extends StatelessWidget {
  final Widget child;

  const _AuthScreenScaffold({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BrandBackground(
        child: Column(
          children: [
            Expanded(
              child: Container(
                margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                padding: const EdgeInsets.fromLTRB(20, 34, 20, 18),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F5F6),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Center(child: child),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? userName;
  String? userPhoto;
  bool loadingProfile = true;
  int totalAlertas = 0;
  int supportContactsCount = 0;

  @override
  void initState() {
    super.initState();
    _loadProfileAndStats();
  }

  Future<void> _loadProfileAndStats() async {
    setState(() {
      loadingProfile = true;
    });

    final profile = await AuthService.getProfile();
    final alerts = await AuthService.getAlerts();
    final prefs = await SharedPreferences.getInstance();
    final rawContacts = prefs.getString(_supportContactsStorageKey);

    int contactsCount = 0;
    if (rawContacts != null && rawContacts.isNotEmpty) {
      try {
        final list = jsonDecode(rawContacts) as List<dynamic>;
        contactsCount = list.length;
      } catch (_) {
        contactsCount = 0;
      }
    }

    if (!mounted) {
      return;
    }

    setState(() {
      loadingProfile = false;
      if (profile['success'] == true) {
        final user = profile['usuario'] as Map<String, dynamic>;
        userName = user['nombre']?.toString() ?? 'Usuario';
        userPhoto = user['fotoUrl']?.toString();
      }
      if (alerts['success'] == true) {
        totalAlertas = alerts['total'] as int? ?? 0;
      }
      supportContactsCount = contactsCount;
    });
  }

  Future<void> _openSupportContacts() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const EmergencyContactsScreen()),
    );
    if (!mounted) {
      return;
    }
    await _loadProfileAndStats();
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (!mounted) {
      return;
    }

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
            icon: const Icon(Icons.person_outline_rounded),
          ),
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: loadingProfile
          ? const BrandBackground(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.danger),
              ),
            )
          : BrandBackground(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 360),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Bienvenido a OnAlert',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 31,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Tu seguridad estudiantil es nuestra prioridad',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.danger,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Sistema Activo',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Operativo 24/7',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const PanicButtonScreen(),
                                    ),
                                  );
                                },
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(
                                    color: Colors.transparent,
                                  ),
                                  backgroundColor: const Color(0xFFEDEAF6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                ),
                                child: const Text(
                                  'Activar Alerta',
                                  style: TextStyle(
                                    color: AppColors.primaryDark,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            Expanded(
                              child: _StatCard(
                                value: '$supportContactsCount',
                                label: 'Contactos',
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _StatCard(
                                value: '$totalAlertas',
                                label: 'Alertas',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFAED9E0),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Text(
                            'Consejos de Seguridad\n• Manten contactos actualizados\n• Verifica ubicacion habilitada',
                            style: TextStyle(fontSize: 12.5, height: 1.45),
                          ),
                        ),
                        const SizedBox(height: 14),
                        OutlinedButton.icon(
                          onPressed: _openSupportContacts,
                          icon: const Icon(Icons.contacts_outlined),
                          label: const Text('Contactos de apoyo'),
                        ),
                        const SizedBox(height: 10),
                        OutlinedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const AlertsScreen(),
                              ),
                            );
                          },
                          icon: const Icon(Icons.history_edu_outlined),
                          label: const Text('Mis alertas enviadas'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value;
  final String label;

  const _StatCard({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _SupportContact {
  final String nombre;
  final String telefono;

  const _SupportContact({required this.nombre, required this.telefono});

  Map<String, String> toJson() => {'nombre': nombre, 'telefono': telefono};

  factory _SupportContact.fromJson(Map<String, dynamic> json) {
    return _SupportContact(
      nombre: json['nombre']?.toString() ?? '',
      telefono: json['telefono']?.toString() ?? '',
    );
  }
}

class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen> {
  List<_SupportContact> contacts = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_supportContactsStorageKey);

    if (raw == null || raw.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        loading = false;
        contacts = [];
      });
      return;
    }

    try {
      final list = jsonDecode(raw) as List<dynamic>;
      final parsed = list
          .map((item) => _SupportContact.fromJson(item as Map<String, dynamic>))
          .toList();

      if (!mounted) {
        return;
      }
      setState(() {
        loading = false;
        contacts = parsed;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        loading = false;
        contacts = [];
      });
    }
  }

  Future<void> _saveContacts() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = contacts.map((c) => c.toJson()).toList();
    await prefs.setString(_supportContactsStorageKey, jsonEncode(payload));
  }

  Future<void> _showContactDialog({int? editIndex}) async {
    final existing = editIndex != null ? contacts[editIndex] : null;
    final nombreCtrl = TextEditingController(text: existing?.nombre ?? '');
    final telefonoCtrl = TextEditingController(text: existing?.telefono ?? '');
    String? localError;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocalState) {
            return AlertDialog(
              title: Text(
                editIndex == null ? 'Agregar contacto' : 'Editar contacto',
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nombreCtrl,
                    decoration: const InputDecoration(labelText: 'Nombre'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: telefonoCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Telefono'),
                  ),
                  if (localError != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      localError!,
                      style: const TextStyle(color: AppColors.danger),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: () async {
                    final nombre = nombreCtrl.text.trim();
                    final telefono = telefonoCtrl.text.trim();

                    if (nombre.isEmpty || telefono.isEmpty) {
                      setLocalState(() {
                        localError = 'Nombre y telefono son obligatorios.';
                      });
                      return;
                    }

                    final cleanPhone = telefono.replaceAll(
                      RegExp(r'[^0-9+]'),
                      '',
                    );
                    if (cleanPhone.length < 8) {
                      setLocalState(() {
                        localError = 'Telefono invalido.';
                      });
                      return;
                    }

                    setState(() {
                      if (editIndex == null) {
                        contacts.add(
                          _SupportContact(nombre: nombre, telefono: cleanPhone),
                        );
                      } else {
                        contacts[editIndex] = _SupportContact(
                          nombre: nombre,
                          telefono: cleanPhone,
                        );
                      }
                    });

                    await _saveContacts();
                    if (!context.mounted) {
                      return;
                    }
                    Navigator.pop(context);
                  },
                  child: const Text('Guardar'),
                ),
              ],
            );
          },
        );
      },
    );

    nombreCtrl.dispose();
    telefonoCtrl.dispose();
  }

  Future<void> _deleteContact(int index) async {
    setState(() {
      contacts.removeAt(index);
    });
    await _saveContacts();
  }

  Future<void> _importFromPhoneContacts() async {
    final hasPermission = await FlutterContacts.permissions.has(
      PermissionType.read,
    );
    if (!hasPermission) {
      final status = await FlutterContacts.permissions.request(
        PermissionType.read,
      );
      if (status != PermissionStatus.granted &&
          status != PermissionStatus.limited) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permiso de contactos denegado.')),
        );
        return;
      }
    }

    final phoneContacts = await FlutterContacts.getAll(
      properties: {ContactProperty.name, ContactProperty.phone},
    );

    final options = phoneContacts
        .where((c) => c.phones.isNotEmpty)
        .map((c) {
          final phone = c.phones.first.number.replaceAll(
            RegExp(r'[^0-9+]'),
            '',
          );
          final name = (c.displayName ?? '').trim();
          return _SupportContact(
            nombre: name.isEmpty ? 'Sin nombre' : name,
            telefono: phone,
          );
        })
        .where((c) => c.telefono.isNotEmpty)
        .toList();

    if (!mounted) {
      return;
    }

    if (options.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se encontraron contactos con telefono.'),
        ),
      );
      return;
    }

    final selected = await showModalBottomSheet<_SupportContact>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.75,
            child: Column(
              children: [
                const SizedBox(height: 12),
                const Text(
                  'Selecciona un contacto',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    itemCount: options.length,
                    itemBuilder: (context, index) {
                      final c = options[index];
                      return ListTile(
                        leading: const Icon(Icons.person_outline),
                        title: Text(c.nombre),
                        subtitle: Text(c.telefono),
                        onTap: () => Navigator.pop(context, c),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (selected == null || !mounted) {
      return;
    }

    final exists = contacts.any((c) => c.telefono == selected.telefono);
    if (exists) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ese contacto ya esta agregado.')),
      );
      return;
    }

    setState(() {
      contacts.add(selected);
    });
    await _saveContacts();
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Contacto importado correctamente.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: const Text('Contactos de apoyo'),
      ),
      body: loading
          ? const BrandBackground(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.danger),
              ),
            )
          : BrandBackground(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _importFromPhoneContacts,
                            icon: const Icon(Icons.perm_contact_calendar),
                            label: const Text('Importar'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OaPrimaryButton(
                          label: 'Agregar',
                          width: 150,
                          onPressed: () => _showContactDialog(),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: contacts.isEmpty
                        ? const Center(
                            child: Text(
                              'Aun no tienes contactos de apoyo cargados.',
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 18),
                            itemCount: contacts.length,
                            itemBuilder: (context, index) {
                              final c = contacts[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: ListTile(
                                  leading: const Icon(
                                    Icons.contact_phone_outlined,
                                  ),
                                  title: Text(c.nombre),
                                  subtitle: Text(c.telefono),
                                  trailing: Wrap(
                                    spacing: 2,
                                    children: [
                                      IconButton(
                                        onPressed: () => _showContactDialog(
                                          editIndex: index,
                                        ),
                                        icon: const Icon(Icons.edit_outlined),
                                      ),
                                      IconButton(
                                        onPressed: () => _deleteContact(index),
                                        icon: const Icon(
                                          Icons.delete_outline,
                                          color: AppColors.danger,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

class PanicButtonScreen extends StatefulWidget {
  const PanicButtonScreen({super.key});

  @override
  State<PanicButtonScreen> createState() => _PanicButtonScreenState();
}

class _PanicButtonScreenState extends State<PanicButtonScreen> {
  bool isSendingAlert = false;

  Future<Position> _prepareLocationForAlert() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Activa la ubicacion del dispositivo.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception('Se requieren permisos de ubicacion.');
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  }

  Future<void> _activateAlert() async {
    if (isSendingAlert) {
      return;
    }

    if (!mounted) {
      return;
    }

    setState(() {
      isSendingAlert = true;
    });

    final idempotencyKey = const Uuid().v4();
    final countdownNotifier = ValueNotifier<int>(3);
    final locationFuture = _prepareLocationForAlert();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            AlertProcessingScreen(countdownListenable: countdownNotifier),
      ),
    );

    try {
      for (var count = 3; count >= 1; count--) {
        countdownNotifier.value = count;
        await Future.delayed(
          Duration(milliseconds: AppConfig.alertCountdownStepMs),
        );
      }

      if (!mounted) {
        return;
      }

      final position = await locationFuture;

      final result = await AuthService.sendAlert(
        latitude: position.latitude,
        longitude: position.longitude,
        idempotencyKey: idempotencyKey,
      );

      if (!mounted) {
        return;
      }

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result['success'] == true
                ? 'Alerta enviada con exito.'
                : (result['error'] ?? 'No se pudo enviar la alerta'),
          ),
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) {
        return;
      }
      Navigator.pop(context);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error al activar alerta: $e')));
    } finally {
      countdownNotifier.dispose();
      if (mounted) {
        setState(() {
          isSendingAlert = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(elevation: 0, backgroundColor: Colors.transparent),
      body: BrandBackground(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const SizedBox(height: 26),
                  const Text(
                    'Boton de Panico',
                    style: TextStyle(fontSize: 40, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  const Text('Presiona en caso de emergencia'),
                  const SizedBox(height: 30),
                  GestureDetector(
                    onTap: _activateAlert,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 250,
                      height: 250,
                      decoration: BoxDecoration(
                        color: AppColors.danger,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.danger.withValues(alpha: 0.35),
                            blurRadius: 18,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Center(
                        child: isSendingAlert
                            ? const SizedBox(
                                width: 34,
                                height: 34,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'PRESIONAR',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 39,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8F8F8),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: const [
                        Row(
                          children: [
                            Icon(
                              Icons.warning_amber_rounded,
                              color: AppColors.danger,
                            ),
                            SizedBox(width: 8),
                            Text(
                              '¿Que sucede al activar?',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _InfoIcon(
                              icon: Icons.call_outlined,
                              label: 'Notificacion',
                              color: Color(0xFF17A2B8),
                            ),
                            _InfoIcon(
                              icon: Icons.location_on,
                              label: 'Ubicacion',
                              color: Color(0xFF1CBF33),
                            ),
                            _InfoIcon(
                              icon: Icons.error_outline,
                              label: 'Emergencia',
                              color: AppColors.danger,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoIcon extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _InfoIcon({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11)),
      ],
    );
  }
}

class AlertProcessingScreen extends StatelessWidget {
  final ValueNotifier<int> countdownListenable;

  const AlertProcessingScreen({super.key, required this.countdownListenable});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(elevation: 0, backgroundColor: Colors.transparent),
      body: BrandBackground(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const SizedBox(height: 110),
                  Container(
                    width: 250,
                    height: 250,
                    decoration: const BoxDecoration(
                      color: AppColors.danger,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: ValueListenableBuilder<int>(
                        valueListenable: countdownListenable,
                        builder: (context, value, _) {
                          return Text(
                            '$value',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 86,
                              fontWeight: FontWeight.w800,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 34),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      vertical: 14,
                      horizontal: 16,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8F8F8),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.danger,
                          ),
                        ),
                        const SizedBox(width: 12),
                        ValueListenableBuilder<int>(
                          valueListenable: countdownListenable,
                          builder: (context, value, _) {
                            return Text(
                              'Activando alerta en $value...',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final nameCtrl = TextEditingController();
  final matriculaCtrl = TextEditingController();
  final passwordCtrl = TextEditingController();
  final imagePicker = ImagePicker();
  bool loading = true;
  bool saving = false;
  String? email;
  String? error;
  String? currentPhotoValue;
  String? selectedPhotoValue;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    matriculaCtrl.dispose();
    passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final result = await AuthService.getProfile();
    if (!mounted) {
      return;
    }

    setState(() {
      loading = false;
      if (result['success'] == true) {
        final user = result['usuario'] as Map<String, dynamic>;
        nameCtrl.text = user['nombre']?.toString() ?? '';
        matriculaCtrl.text = user['matricula']?.toString() ?? '';
        email = user['email']?.toString() ?? '';
        currentPhotoValue = user['fotoUrl']?.toString();
        selectedPhotoValue = null;
        error = null;
      } else {
        error = result['error']?.toString();
      }
    });
  }

  Future<void> _pickPhotoFromGallery() async {
    final image = await imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
      maxWidth: 1080,
    );

    if (image == null || !mounted) {
      return;
    }

    final bytes = await image.readAsBytes();
    final mimeType = guessMimeType(image.path);

    setState(() {
      selectedPhotoValue = 'data:$mimeType;base64,${base64Encode(bytes)}';
    });
  }

  Future<void> _saveProfile() async {
    if (passwordCtrl.text.trim().isEmpty && selectedPhotoValue == null) {
      setState(() {
        error = 'Selecciona una foto o escribe una nueva contrasena.';
      });
      return;
    }

    setState(() {
      saving = true;
      error = null;
    });

    final result = await AuthService.updateProfile(
      password: passwordCtrl.text,
      fotoUrl: selectedPhotoValue,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      saving = false;
    });

    if (result['success'] == true) {
      final user = result['usuario'] as Map<String, dynamic>;
      currentPhotoValue = user['fotoUrl']?.toString();
      selectedPhotoValue = null;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil actualizado correctamente.')),
      );
      Navigator.pop(context);
      return;
    }

    setState(() {
      error = result['error']?.toString() ?? 'No se pudo actualizar el perfil';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(elevation: 0, backgroundColor: Colors.transparent),
      body: loading
          ? const BrandBackground(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.danger),
              ),
            )
          : BrandBackground(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: [
                        profileAvatar(
                          selectedPhotoValue ?? currentPhotoValue,
                          radius: 48,
                          iconSize: 56,
                          backgroundColor: const Color(0x110D5C63),
                          iconColor: AppColors.primary,
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: saving ? null : _pickPhotoFromGallery,
                          icon: const Icon(Icons.photo_library_outlined),
                          label: Text(
                            (selectedPhotoValue ?? currentPhotoValue)
                                        ?.isNotEmpty ==
                                    true
                                ? 'Cambiar foto desde el telefono'
                                : 'Subir foto desde el telefono',
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: nameCtrl,
                          enabled: false,
                          decoration: const InputDecoration(
                            labelText: 'Nombre',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          enabled: false,
                          decoration: InputDecoration(
                            labelText: 'Email',
                            hintText: email,
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: matriculaCtrl,
                          enabled: false,
                          decoration: const InputDecoration(
                            labelText: 'Matricula',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: passwordCtrl,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'Nueva contrasena',
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (error != null)
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              error!,
                              style: const TextStyle(color: AppColors.danger),
                            ),
                          ),
                        const SizedBox(height: 16),
                        OaPrimaryButton(
                          label: 'Guardar cambios',
                          onPressed: _saveProfile,
                          loading: saving,
                          width: 220,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  bool loading = true;
  String? error;
  List<dynamic> alertas = [];

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    setState(() {
      loading = true;
      error = null;
    });

    final result = await AuthService.getAlerts();
    if (!mounted) {
      return;
    }

    setState(() {
      loading = false;
      if (result['success'] == true) {
        alertas = result['alertas'] as List<dynamic>;
      } else {
        error =
            result['error']?.toString() ?? 'No se pudieron cargar las alertas';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
            onPressed: _loadAlerts,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: loading
          ? const BrandBackground(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.danger),
              ),
            )
          : error != null
          ? BrandBackground(child: Center(child: Text(error!)))
          : alertas.isEmpty
          ? const BrandBackground(
              child: Center(child: Text('No has enviado alertas todavia.')),
            )
          : BrandBackground(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 16),
                itemCount: alertas.length,
                itemBuilder: (context, index) {
                  final alert = alertas[index] as Map<String, dynamic>;
                  final created = alert['createdAt']?.toString() ?? '';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(14),
                      title: Row(
                        children: [
                          const Icon(
                            Icons.warning_amber_rounded,
                            color: AppColors.danger,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Alerta #${alert['id'] ?? '-'}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          AlertStatusPill(
                            status: alert['estado']?.toString() ?? 'pendiente',
                          ),
                        ],
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Text(
                          'Ubicacion: ${alert['latitude']}, ${alert['longitude']}\n$created',
                          style: const TextStyle(height: 1.4),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
