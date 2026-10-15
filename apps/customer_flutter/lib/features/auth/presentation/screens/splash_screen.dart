import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  static const _channel = MethodChannel('com.kanhaiya.store/notifications');

  late AnimationController _entranceController;
  late AnimationController _pulseController;

  // Staggered Entrance Animations
  late Animation<double> _bgFadeAnimation;
  late Animation<double> _logoScaleAnimation;
  late Animation<double> _logoFadeAnimation;
  late Animation<double> _titleSlideAnimation;
  late Animation<double> _titleFadeAnimation;
  late Animation<double> _badgeSlideAnimation;
  late Animation<double> _badgeFadeAnimation;
  late Animation<double> _footerFadeAnimation;

  // Continuous subtle breathing pulse for halo rings
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    // 1. Entrance Choreography Controller (1.6s)
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    _bgFadeAnimation = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.0, 0.4, curve: Curves.easeIn),
    );

    _logoScaleAnimation = Tween<double>(begin: 0.65, end: 1.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.1, 0.6, curve: Curves.easeOutBack),
      ),
    );

    _logoFadeAnimation = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.1, 0.5, curve: Curves.easeIn),
    );

    _titleSlideAnimation = Tween<double>(begin: 25.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.35, 0.75, curve: Curves.easeOutCubic),
      ),
    );

    _titleFadeAnimation = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.35, 0.75, curve: Curves.easeIn),
    );

    _badgeSlideAnimation = Tween<double>(begin: 20.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _entranceController,
        curve: const Interval(0.5, 0.85, curve: Curves.easeOutCubic),
      ),
    );

    _badgeFadeAnimation = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.5, 0.85, curve: Curves.easeIn),
    );

    _footerFadeAnimation = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.65, 1.0, curve: Curves.easeIn),
    );

    // 2. Pulse Controller for Ambient Halo
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _entranceController.forward();
    _requestNotificationPermission();
    _navigateToNext();
  }

  @override
  void dispose() {
    _entranceController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _requestNotificationPermission() async {
    try {
      await _channel.invokeMethod('requestNotificationPermission');
    } catch (_) {
      // Ignore if channel is unavailable or on non-Android platform
    }
  }

  Future<void> _navigateToNext() async {
    await Future.delayed(const Duration(milliseconds: 2400));
    if (mounted) {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Deep Rich Forest Gradient Background
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.2),
                radius: 1.25,
                colors: [
                  Color(0xFF1E5B45), // Luminous Forest Center
                  Color(0xFF144533), // Rich Deep Green
                  Color(0xFF0A261C), // Midnight Evergreen Edge
                ],
                stops: [0.0, 0.55, 1.0],
              ),
            ),
          ),

          // 2. Floating Ambient Glow Orbs
          Positioned(
            top: -70,
            right: -70,
            child: FadeTransition(
              opacity: _bgFadeAnimation,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFC58B43).withValues(alpha: 0.16),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -90,
            left: -90,
            child: FadeTransition(
              opacity: _bgFadeAnimation,
              child: Container(
                width: 290,
                height: 290,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withValues(alpha: 0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 3. Main Center Stage Content
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                    child: IntrinsicHeight(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Spacer(flex: 3),

                // Center Animated Logo + Dynamic Halo
                AnimatedBuilder(
                  animation: Listenable.merge([_entranceController, _pulseController]),
                  builder: (context, _) {
                    final scale = _logoScaleAnimation.value;
                    final pulse = _pulseAnimation.value;

                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        // Outer Pulsing Glow Aura
                        Transform.scale(
                          scale: scale * pulse * 1.15,
                          child: Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFC58B43).withValues(alpha: 0.22),
                                  blurRadius: 45,
                                  spreadRadius: 10,
                                ),
                                BoxShadow(
                                  color: Colors.white.withValues(alpha: 0.12),
                                  blurRadius: 60,
                                  spreadRadius: 15,
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Secondary Concentric Golden Ring
                        Transform.scale(
                          scale: scale * (1.0 + (pulse - 1.0) * 0.5),
                          child: Container(
                            width: 132,
                            height: 132,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: const Color(0xFFC58B43).withValues(alpha: 0.35),
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),

                        // Logo Card with Premium Elevation & Rounded Glass Bevel
                        Transform.scale(
                          scale: scale,
                          child: FadeTransition(
                            opacity: _logoFadeAnimation,
                            child: Container(
                              width: 114,
                              height: 114,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(26),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  width: 2.0,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.35),
                                    blurRadius: 28,
                                    offset: const Offset(0, 12),
                                  ),
                                  BoxShadow(
                                    color: const Color(0xFF174D3A).withValues(alpha: 0.35),
                                    blurRadius: 20,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Image.asset(
                                'assets/images/kgs_logo.png',
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),

                // Brand Title with Smooth Staggered Slide & Fade
                Transform.translate(
                  offset: Offset(0, _titleSlideAnimation.value),
                  child: FadeTransition(
                    opacity: _titleFadeAnimation,
                    child: Column(
                      children: [
                        const Text(
                          'Kanhaiya General Store',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Roboto',
                            fontSize: 25,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                            color: Colors.white,
                            shadows: [
                              Shadow(
                                color: Colors.black38,
                                blurRadius: 12,
                                offset: Offset(0, 3),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Ultra-Premium Micro Badge
                Transform.translate(
                  offset: Offset(0, _badgeSlideAnimation.value),
                  child: FadeTransition(
                    opacity: _badgeFadeAnimation,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFFC58B43).withValues(alpha: 0.22),
                            Colors.white.withValues(alpha: 0.10),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: const Color(0xFFC58B43).withValues(alpha: 0.45),
                          width: 1.0,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.15),
                            blurRadius: 12,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.bolt_rounded,
                            size: 14,
                            color: Color(0xFFE5B76C),
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Instant Counter Pickup Store',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFFBF4EA),
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const Spacer(flex: 3),

                // Bottom Loading Spinner & Location Tag
                FadeTransition(
                  opacity: _footerFadeAnimation,
                  child: Column(
                    children: [
                      // Elegant Micro Dots Spinner
                      SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Sarvankhera, Kanpur Dehat • Uttar Pradesh',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.5,
                          color: Colors.white.withValues(alpha: 0.55),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  ),
),
        ],
      ),
    );
  }
}
