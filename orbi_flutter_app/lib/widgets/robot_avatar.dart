import 'package:flutter/material.dart';
import 'dart:math' as math;

class RobotAvatar extends StatefulWidget {
  final String animationState;
  final bool isListening;
  final Color primaryColor;
  final Color accentColor;
  final double mouthOpenValue; // 0.0 to 1.0 driven by actual text output

  const RobotAvatar({
    super.key,
    required this.animationState,
    this.isListening = false,
    this.primaryColor = const Color(0xFF6C63FF),
    this.accentColor = const Color(0xFF00D9FF),
    this.mouthOpenValue = 0.0,
  });

  @override
  State<RobotAvatar> createState() => _RobotAvatarState();
}

class _RobotAvatarState extends State<RobotAvatar>
    with TickerProviderStateMixin {
  late AnimationController _breathController;
  late AnimationController _floatController;
  late AnimationController _pulseController;
  late AnimationController _eyeController;
  late AnimationController _thinkController;

  @override
  void initState() {
    super.initState();

    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat(reverse: true);

    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3500),
    )..repeat(reverse: true);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _eyeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _startBlinkLoop();

    _thinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
  }

  void _startBlinkLoop() async {
    while (mounted) {
      await Future.delayed(
        Duration(milliseconds: 2500 + math.Random().nextInt(2000)),
      );
      if (!mounted) return;
      await _eyeController.forward();
      if (!mounted) return;
      await _eyeController.reverse();
    }
  }

  @override
  void didUpdateWidget(covariant RobotAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.animationState != widget.animationState) {
      _updateControllersForState(widget.animationState);
    }
  }

  void _updateControllersForState(String state) {
    switch (state) {
      case 'speaking':
        // Fast breath cycle so mouth opens/closes rapidly like talking
        _breathController.duration = const Duration(milliseconds: 350);
        _breathController
          ..stop()
          ..repeat(reverse: true);
        break;
      case 'listening':
        _breathController.duration = const Duration(milliseconds: 1200);
        _breathController
          ..stop()
          ..repeat(reverse: true);
        break;
      case 'thinking':
        _breathController.duration = const Duration(milliseconds: 2000);
        _breathController
          ..stop()
          ..repeat(reverse: true);
        break;
      default: // idle
        _breathController.duration = const Duration(milliseconds: 3000);
        _breathController
          ..stop()
          ..repeat(reverse: true);
        break;
    }
  }

  @override
  void dispose() {
    _breathController.dispose();
    _floatController.dispose();
    _pulseController.dispose();
    _eyeController.dispose();
    _thinkController.dispose();
    super.dispose();
  }

  _RobotPose _computePose() {
    final breath = _breathController.value;
    final float = _floatController.value;
    final pulse = _pulseController.value;
    final blink = _eyeController.value;
    final think = _thinkController.value;

    switch (widget.animationState) {
      case 'listening':
        return _RobotPose(
          yOffset: 0,
          scale: 1.0 + pulse * 0.02,
          glowRadius: 20 + pulse * 15,
          glowOpacity: 0.25 + pulse * 0.25,
          mouthOpen: 0,
          eyeBlink: blink,
          eyeSquint: 1.0,
          antennaWobble: math.sin(pulse * math.pi * 4) * 0.3,
          handFloat: math.sin(pulse * math.pi * 2) * 8,
          bodySquash: 1.0,
        );
      case 'thinking':
        return _RobotPose(
          yOffset: math.sin(think * math.pi * 2) * 4,
          scale: 1.0,
          glowRadius: 8,
          glowOpacity: 0.1,
          mouthOpen: 0,
          eyeBlink: blink,
          eyeSquint: 0.6,
          antennaWobble: math.sin(think * math.pi * 6) * 0.25,
          handFloat: math.sin(think * math.pi * 3) * 6,
          bodySquash: 1.0 + math.sin(think * math.pi * 2) * 0.04,
        );
      case 'speaking':
        // Use real mouth value from provider (driven by actual text chunks)
        final realMouth = widget.mouthOpenValue.clamp(0.0, 1.0);
        return _RobotPose(
          yOffset: math.sin(breath * math.pi * 2) * 1.5,
          scale: 1.0 + breath * 0.015,
          glowRadius: 5 + realMouth * 15,
          glowOpacity: 0.1 + realMouth * 0.2,
          mouthOpen: realMouth,
          eyeBlink: blink,
          eyeSquint: 1.0,
          antennaWobble: math.sin(breath * math.pi * 2) * 0.15,
          handFloat: math.sin(breath * math.pi * 2) * 5,
          bodySquash: 1.0 + realMouth * 0.015,
        );
      default: // idle
        return _RobotPose(
          yOffset: math.sin(float * math.pi * 2) * 6,
          scale: 1.0 + breath * 0.02,
          glowRadius: 0,
          glowOpacity: 0,
          mouthOpen: 0,
          eyeBlink: blink,
          eyeSquint: 1.0,
          antennaWobble: math.sin(float * math.pi * 2) * 0.15,
          handFloat: math.sin(float * math.pi * 2) * 5,
          bodySquash: 1.0,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _breathController,
        _floatController,
        _pulseController,
        _eyeController,
        _thinkController,
      ]),
      builder: (context, child) {
        final pose = _computePose();
        return SizedBox(
          width: 250,
          height: 280,
          child: CustomPaint(
            painter: RobotPainter(
              pose: pose,
              primaryColor: widget.primaryColor,
              accentColor: widget.accentColor,
              animationState: widget.animationState,
            ),
          ),
        );
      },
    );
  }
}

class _RobotPose {
  final double yOffset;
  final double scale;
  final double glowRadius;
  final double glowOpacity;
  final double mouthOpen;
  final double eyeBlink;
  final double eyeSquint;
  final double antennaWobble;
  final double handFloat;
  final double bodySquash;

  const _RobotPose({
    required this.yOffset,
    required this.scale,
    required this.glowRadius,
    required this.glowOpacity,
    required this.mouthOpen,
    required this.eyeBlink,
    required this.eyeSquint,
    required this.antennaWobble,
    required this.handFloat,
    required this.bodySquash,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is _RobotPose &&
          yOffset == other.yOffset &&
          scale == other.scale &&
          glowRadius == other.glowRadius &&
          glowOpacity == other.glowOpacity &&
          mouthOpen == other.mouthOpen &&
          eyeBlink == other.eyeBlink &&
          eyeSquint == other.eyeSquint &&
          antennaWobble == other.antennaWobble &&
          handFloat == other.handFloat &&
          bodySquash == other.bodySquash;

  @override
  int get hashCode => Object.hash(
        yOffset, scale, glowRadius, glowOpacity, mouthOpen,
        eyeBlink, eyeSquint, antennaWobble, handFloat, bodySquash,
      );
}

// Color constants for the robot
class _RobotColors {
  static const robotBlue = Color(0xFF5B9BF5);
  static const robotBlueDark = Color(0xFF3A7BD5);
  static const robotBlueLight = Color(0xFFB8D8FF);
  static const faceWhite = Color(0xFFF5F5FA);
  static const eyeBlack = Color(0xFF1A1A2E);
  static const mouthColor = Color(0xFF3A3A5C);
  static const handBlue = Color(0xFF6AABFF);
  static const cheekPink = Color(0x25FF6584);
}

class RobotPainter extends CustomPainter {
  final _RobotPose pose;
  final Color primaryColor;
  final Color accentColor;
  final String animationState;

  RobotPainter({
    required this.pose,
    required this.primaryColor,
    required this.accentColor,
    required this.animationState,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Scale all drawing to the canonical 250x280 space
    final sx = size.width / 250;
    final sy = size.height / 280;
    canvas.save();
    canvas.scale(sx, sy);

    // Apply floating offset and scale
    canvas.translate(125, 140 + pose.yOffset);
    canvas.scale(pose.scale);
    canvas.translate(-125, -140);

    _drawGroundShadow(canvas);
    _drawGlow(canvas);
    _drawBody(canvas);
    _drawLeftHand(canvas);
    _drawRightHand(canvas);
    _drawHeadDome(canvas);
    _drawFacePlate(canvas);
    _drawEyes(canvas);
    _drawMouth(canvas);
    _drawCheeks(canvas);
    _drawAntenna(canvas);
    _drawStatusIndicator(canvas);

    canvas.restore();
  }

  void _drawGroundShadow(Canvas canvas) {
    final shadowPaint = Paint()
      ..color = const Color(0x30000000)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(125, 258), width: 90, height: 14),
      shadowPaint,
    );
  }

  void _drawGlow(Canvas canvas) {
    if (pose.glowOpacity <= 0) return;
    final glowPaint = Paint()
      ..color = primaryColor.withOpacity(pose.glowOpacity)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, pose.glowRadius);
    canvas.drawCircle(const Offset(125, 110), 80, glowPaint);
  }

  void _drawBody(Canvas canvas) {
    canvas.save();
    // Apply body squash
    canvas.translate(125, 195);
    canvas.scale(1.0, pose.bodySquash);
    canvas.translate(-125, -195);

    final bodyRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: const Offset(125, 198), width: 72, height: 48),
      const Radius.circular(24),
    );

    // Body gradient
    final bodyPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [_RobotColors.robotBlue, _RobotColors.robotBlueDark],
      ).createShader(
        Rect.fromCenter(center: const Offset(125, 198), width: 72, height: 48),
      );
    canvas.drawRRect(bodyRect, bodyPaint);

    // Body highlight
    final bodyHighlight = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.5),
        radius: 0.8,
        colors: [
          Colors.white.withOpacity(0.2),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCenter(center: const Offset(125, 198), width: 72, height: 48),
      );
    canvas.drawRRect(bodyRect, bodyHighlight);

    // Neck connector
    final neckRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: const Offset(125, 178), width: 26, height: 14),
      const Radius.circular(7),
    );
    canvas.drawRRect(
      neckRect,
      Paint()..color = _RobotColors.robotBlueDark,
    );

    canvas.restore();
  }

  void _drawLeftHand(Canvas canvas) {
    final handCenter = Offset(60, 198 + pose.handFloat);
    _drawHand(canvas, handCenter);
  }

  void _drawRightHand(Canvas canvas) {
    final handCenter = Offset(190, 198 - pose.handFloat);
    _drawHand(canvas, handCenter);
  }

  void _drawHand(Canvas canvas, Offset center) {
    final handRect = Rect.fromCircle(center: center, radius: 15);

    // Hand shadow
    canvas.drawCircle(
      center + const Offset(1, 2),
      15,
      Paint()
        ..color = const Color(0x20000000)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );

    // Hand gradient
    final handPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.3),
        colors: [
          _RobotColors.robotBlueLight,
          _RobotColors.handBlue,
        ],
      ).createShader(handRect);
    canvas.drawCircle(center, 15, handPaint);

    // Hand highlight
    canvas.drawCircle(
      center + const Offset(-4, -4),
      5,
      Paint()..color = Colors.white.withOpacity(0.35),
    );
  }

  void _drawHeadDome(Canvas canvas) {
    const headCenter = Offset(125, 110);
    const headRadius = 72.0;
    final headRect = Rect.fromCircle(center: headCenter, radius: headRadius);

    // Head shadow
    canvas.drawCircle(
      headCenter + const Offset(2, 4),
      headRadius,
      Paint()
        ..color = const Color(0x18000000)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    // Head dome gradient
    final headPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.4),
        radius: 0.85,
        colors: const [
          _RobotColors.robotBlueLight,
          _RobotColors.robotBlue,
          _RobotColors.robotBlueDark,
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(headRect);
    canvas.drawCircle(headCenter, headRadius, headPaint);

    // Rim highlight (top-left arc)
    final rimPaint = Paint()
      ..color = Colors.white.withOpacity(0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      headRect.deflate(2),
      -math.pi * 0.85,
      math.pi * 0.5,
      false,
      rimPaint,
    );

    // Specular highlight
    final highlightRect = Rect.fromCenter(
      center: const Offset(100, 78),
      width: 40,
      height: 22,
    );
    canvas.save();
    canvas.translate(100, 78);
    canvas.rotate(-0.3);
    canvas.translate(-100, -78);
    canvas.drawOval(
      highlightRect,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.white.withOpacity(0.5),
            Colors.white.withOpacity(0.0),
          ],
        ).createShader(highlightRect),
    );
    canvas.restore();
  }

  void _drawFacePlate(Canvas canvas) {
    const faceCenter = Offset(125, 118);
    final faceRect = Rect.fromCenter(
      center: faceCenter,
      width: 95,
      height: 78,
    );

    // Face plate
    final facePaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0.0, -0.2),
        radius: 0.9,
        colors: const [
          Colors.white,
          _RobotColors.faceWhite,
        ],
      ).createShader(faceRect);
    canvas.drawOval(faceRect, facePaint);

    // Subtle inner shadow at top of face
    final innerShadow = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.center,
        colors: [
          _RobotColors.robotBlue.withOpacity(0.08),
          Colors.transparent,
        ],
      ).createShader(faceRect);
    canvas.drawOval(faceRect, innerShadow);
  }

  void _drawEyes(Canvas canvas) {
    _drawSingleEye(canvas, const Offset(107, 112));
    _drawSingleEye(canvas, const Offset(143, 112));
  }

  void _drawSingleEye(Canvas canvas, Offset center) {
    final eyeRadius = 11.0;
    final blinkScale = 1.0 - pose.eyeBlink * 0.9; // 1.0 -> 0.1 during blink
    final squintScale = pose.eyeSquint;
    final scaleY = blinkScale * squintScale;

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.scale(1.0, scaleY);

    // Eye base
    canvas.drawCircle(
      Offset.zero,
      eyeRadius,
      Paint()..color = _RobotColors.eyeBlack,
    );

    canvas.restore();

    // Highlights only when eyes are mostly open
    if (scaleY > 0.4) {
      // Primary highlight
      canvas.drawCircle(
        center + const Offset(3.5, -3.5),
        3.2,
        Paint()..color = Colors.white.withOpacity(0.9),
      );
      // Secondary highlight
      canvas.drawCircle(
        center + const Offset(-2, 2.5),
        1.8,
        Paint()..color = Colors.white.withOpacity(0.5),
      );
    }
  }

  void _drawMouth(Canvas canvas) {
    const mouthCenter = Offset(125, 138);

    if (pose.mouthOpen > 0.05) {
      // Speaking mouth - animated oval
      final openHeight = 4 + pose.mouthOpen * 14;
      final mouthRect = Rect.fromCenter(
        center: mouthCenter,
        width: 20,
        height: openHeight,
      );
      canvas.drawOval(
        mouthRect,
        Paint()..color = _RobotColors.mouthColor,
      );

      // Tongue hint when mouth is wide open
      if (pose.mouthOpen > 0.35) {
        final tongueRect = Rect.fromCenter(
          center: mouthCenter + Offset(0, openHeight * 0.2),
          width: 12,
          height: openHeight * 0.4,
        );
        canvas.drawOval(
          tongueRect,
          Paint()..color = const Color(0xFFFF8A9E).withOpacity(0.6),
        );
      }
    } else {
      // Smile curve
      final smilePath = Path()
        ..moveTo(113, 136)
        ..quadraticBezierTo(125, 145, 137, 136);
      canvas.drawPath(
        smilePath,
        Paint()
          ..color = _RobotColors.mouthColor
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  void _drawCheeks(Canvas canvas) {
    // Left cheek
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(95, 130), width: 14, height: 9),
      Paint()..color = _RobotColors.cheekPink,
    );
    // Right cheek
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(155, 130), width: 14, height: 9),
      Paint()..color = _RobotColors.cheekPink,
    );
  }

  void _drawAntenna(Canvas canvas) {
    const stickBase = Offset(125, 40);
    final wobbleX = math.sin(pose.antennaWobble * math.pi) * 10;
    final stickTop = Offset(125 + wobbleX, 18);

    // Antenna stick
    canvas.drawLine(
      stickBase,
      stickTop,
      Paint()
        ..color = _RobotColors.robotBlue
        ..strokeWidth = 3.5
        ..strokeCap = StrokeCap.round,
    );

    // Antenna ball glow
    canvas.drawCircle(
      stickTop,
      12,
      Paint()
        ..color = _RobotColors.robotBlueLight.withOpacity(0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    // Antenna ball
    final ballRect = Rect.fromCircle(center: stickTop, radius: 8);
    canvas.drawCircle(
      stickTop,
      8,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.3, -0.3),
          colors: [
            _RobotColors.robotBlueLight,
            _RobotColors.robotBlue,
          ],
        ).createShader(ballRect),
    );

    // Ball highlight
    canvas.drawCircle(
      stickTop + const Offset(-2, -2),
      3,
      Paint()..color = Colors.white.withOpacity(0.6),
    );
  }

  void _drawStatusIndicator(Canvas canvas) {
    final String statusText;
    final Color statusColor;
    switch (animationState) {
      case 'listening':
        statusText = 'LISTENING';
        statusColor = Colors.greenAccent;
        break;
      case 'thinking':
        statusText = 'THINKING';
        statusColor = Colors.amberAccent;
        break;
      case 'speaking':
        statusText = 'SPEAKING';
        statusColor = const Color(0xFF5B9BF5);
        break;
      default:
        statusText = 'READY';
        statusColor = Colors.greenAccent;
    }

    // Background pill
    final pillRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: const Offset(125, 238), width: 90, height: 22),
      const Radius.circular(11),
    );
    canvas.drawRRect(
      pillRect,
      Paint()..color = const Color(0x30FFFFFF),
    );
    canvas.drawRRect(
      pillRect,
      Paint()
        ..color = const Color(0x40FFFFFF)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );

    // Status dot
    canvas.drawCircle(
      const Offset(90, 238),
      3.5,
      Paint()..color = statusColor,
    );
    canvas.drawCircle(
      const Offset(90, 238),
      5,
      Paint()
        ..color = statusColor.withOpacity(0.3)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );

    // Status text
    final textPainter = TextPainter(
      text: TextSpan(
        text: statusText,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.8,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(98, 238 - textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(RobotPainter oldDelegate) {
    return oldDelegate.pose != pose ||
        oldDelegate.animationState != animationState;
  }
}
