class EnvConfig {
  static const String appName = 'Kanhaiya General Store';
  static const String storeTagline = 'Fresh Essentials & Daily Groceries at Wholesale Rates';

  // API Base Endpoint (Android Emulator maps host machine via 10.0.2.2)
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api/v1',
  );

  static const String storePhone = '+91 98765 43210';
  static const String storeWhatsApp = '+91 98765 43210';
  static const String storeAddress = 'Shop #14, Main Mandi Road, Near Gandhi Chowk';

  // Development Flags
  static const bool useMockRepository = bool.fromEnvironment(
    'USE_MOCK_REPO',
    defaultValue: true,
  );
}
