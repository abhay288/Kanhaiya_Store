import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppLanguageNotifier extends Notifier<String> {
  static const String _prefKey = 'app_language_code';

  @override
  String build() {
    _loadSavedLanguage();
    return 'en';
  }

  Future<void> _loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved == 'hi' || saved == 'en') {
        state = saved!;
      }
    } catch (_) {}
  }

  Future<void> setLanguage(String code) async {
    if (state == code) return;
    state = code;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, code);
    } catch (_) {}
  }

  void toggle() {
    setLanguage(state == 'hi' ? 'en' : 'hi');
  }

  void toggleLanguage() {
    toggle();
  }

  bool get isHindi => state == 'hi';
}

final appLanguageProvider = NotifierProvider<AppLanguageNotifier, String>(AppLanguageNotifier.new);
