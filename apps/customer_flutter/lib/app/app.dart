import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/config/env_config.dart';
import '../core/router/app_router.dart';
import '../core/theme/app_theme.dart';
import '../features/admin/data/admin_catalog_repository.dart';
import '../features/catalog/presentation/controllers/catalog_providers.dart';

class KanhaiyaStoreApp extends ConsumerStatefulWidget {
  const KanhaiyaStoreApp({super.key});

  @override
  ConsumerState<KanhaiyaStoreApp> createState() => _KanhaiyaStoreAppState();
}

class _KanhaiyaStoreAppState extends ConsumerState<KanhaiyaStoreApp> {
  StreamSubscription<void>? _catalogSub;

  @override
  void initState() {
    super.initState();
    _catalogSub = catalogUpdateStream.stream.listen((_) {
      if (mounted) {
        ref.read(catalogVersionProvider.notifier).bump();
      }
    });
  }

  @override
  void dispose() {
    _catalogSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: EnvConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
