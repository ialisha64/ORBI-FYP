"""
Free Microsoft Edge TTS plugin for livekit-agents 1.x.
No API key needed — uses Microsoft's Edge browser TTS service.
"""
from __future__ import annotations

import io
import uuid
import logging

import edge_tts
import miniaudio

from livekit import rtc
from livekit.agents import tts as agents_tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions

logger = logging.getLogger("edge-tts-plugin")

SAMPLE_RATE = 24000
NUM_CHANNELS = 1
FRAME_DURATION_MS = 100


class EdgeTTS(agents_tts.TTS):
    def __init__(self, *, voice: str = "en-US-JennyNeural"):
        super().__init__(
            capabilities=agents_tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._voice = voice

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "EdgeTTSStream":
        return EdgeTTSStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
            voice=self._voice,
        )


class EdgeTTSStream(agents_tts.ChunkedStream):
    def __init__(
        self,
        *,
        tts: EdgeTTS,
        input_text: str,
        conn_options: APIConnectOptions,
        voice: str,
    ):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._voice = voice

    async def _main_task(self) -> None:
        try:
            communicate = edge_tts.Communicate(self._input_text, self._voice)
            mp3_chunks = bytearray()

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_chunks.extend(chunk["data"])

            if not mp3_chunks:
                logger.warning("edge-tts returned no audio for: %r", self._input_text[:50])
                return

            # Decode MP3 → PCM 24kHz mono 16-bit using miniaudio (no ffmpeg needed)
            decoded = miniaudio.decode(
                bytes(mp3_chunks),
                output_format=miniaudio.SampleFormat.SIGNED16,
                nchannels=NUM_CHANNELS,
                sample_rate=SAMPLE_RATE,
            )
            pcm = bytes(decoded.samples)

            request_id = str(uuid.uuid4())
            samples_per_frame = int(SAMPLE_RATE * FRAME_DURATION_MS / 1000)
            bytes_per_frame = samples_per_frame * 2  # 16-bit = 2 bytes/sample

            for offset in range(0, len(pcm), bytes_per_frame):
                chunk_bytes = pcm[offset : offset + bytes_per_frame]
                if len(chunk_bytes) < 2:
                    break
                n_samples = len(chunk_bytes) // 2
                frame = rtc.AudioFrame(
                    data=chunk_bytes,
                    sample_rate=SAMPLE_RATE,
                    num_channels=NUM_CHANNELS,
                    samples_per_channel=n_samples,
                )
                self._event_ch.send_nowait(
                    agents_tts.SynthesizedAudio(request_id=request_id, frame=frame)
                )

        except Exception as e:
            logger.error("EdgeTTS synthesis error: %s", e)
