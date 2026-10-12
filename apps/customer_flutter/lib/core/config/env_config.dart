class EnvConfig {
  static const String appName = 'Kanhaiya General Store';
  static const String storeTagline = 'Fresh Essentials & Daily Groceries at Wholesale Rates';

  // API Base Endpoint (Live Production on Render)
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://kanhaiya-store-backend.onrender.com/api/v1',
  );

  static const String storePhone = '9936269347';
  static const String storeWhatsApp = '9936269347';
  static const String storeAddress = 'Fatehpur Roshnai, Kanpur D. UP';
  static const String supportEmail = 'kanhaiyaastore@gmail.com';

  // Development Flags
  static const bool useMockRepository = bool.fromEnvironment(
    'USE_MOCK_REPO',
    defaultValue: true,
  );
}
