import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'models/message_model.dart';
import 'models/task_model.dart';
import 'providers/assistant_provider.dart';
import 'providers/conversation_provider.dart';
import 'providers/theme_provider.dart';
import 'config/theme_config.dart';
import 'screens/splash_screen.dart';


void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive
  await Hive.initFlutter();

  // Register Hive adapters
  Hive.registerAdapter(MessageAdapter());
  Hive.registerAdapter(TaskModelAdapter());

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const OrbiApp());
}

class OrbiApp extends StatelessWidget {
  const OrbiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Theme Provider
        ChangeNotifierProvider(create: (_) => ThemeProvider()),

        // Assistant Provider
        ChangeNotifierProvider(create: (_) => AssistantProvider()),

        // Conversation Provider
        ChangeNotifierProvider(create: (_) => ConversationProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return ScreenUtilInit(
            designSize: const Size(375, 812),
            minTextAdapt: true,
            splitScreenMode: true,
            builder: (context, child) {
              return MaterialApp(
                title: 'ORBI - 3D Virtual Assistant',
                debugShowCheckedModeBanner: false,
                theme: ThemeConfig.lightTheme,
                darkTheme: ThemeConfig.darkTheme,
                themeMode: themeProvider.themeMode,
                home: child,
              );
            },
            child: const SplashScreen(),
          );
        },
      ),
    );
  }
}
