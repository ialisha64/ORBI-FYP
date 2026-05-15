import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../services/api_service.dart';

class OrbiScreen extends StatefulWidget {
  const OrbiScreen({super.key});

  @override
  State<OrbiScreen> createState() => _OrbiScreenState();
}

class _OrbiScreenState extends State<OrbiScreen> {
  final SpeechToText speech = SpeechToText();
  final FlutterTts tts = FlutterTts();

  String text = "Main Orbi hoon. Mic dabao aur bolo 💙";

  void listen() async {
    await speech.initialize();
    speech.listen(onResult: (result) async {
      if (result.finalResult) {
        String userText = result.recognizedWords;
        String reply = await ApiService.sendMessage(userText);

        setState(() {
          text = reply;
        });

        await tts.speak(reply);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset('assets/orbi.png', height: 250),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                text,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18),
              ),
            ),
            const SizedBox(height: 30),
            FloatingActionButton(
              onPressed: listen,
              child: const Icon(Icons.mic),
            ),
          ],
        ),
      ),
    );
  }
}
