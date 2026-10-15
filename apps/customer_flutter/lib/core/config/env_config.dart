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
  static const String storeAddressLine1 = 'Fatehpur Roshnai, Ground Floor';
  static const String storeAddressLine2 = 'Sarvankhera, Kanpur Dehat';
  static const String storeAddress = 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh';
  static const String supportEmail = 'kanhaiyaastore@gmail.com';
  static const String fssaiNo = '12722046000057';
  static const String gstin = '09ANBPL4077E1Z1';
  static const String panNo = 'ANBPL4077E';
  static const String stateName = 'Uttar Pradesh';
  static const String stateCode = '09';

  // Development Flags
  static const bool useMockRepository = bool.fromEnvironment(
    'USE_MOCK_REPO',
    defaultValue: false,
  );
}
