import asyncio
import sys
from pathlib import Path

import edge_tts


# Microsoft Edge TTS voices (free, no API key needed)
VOICES = {"female": "en-US-JennyNeural", "male": "en-US-GuyNeural"}


async def _synthesize_audio_async(text, outfile, gender="female"):
    voice = VOICES.get(gender.lower(), VOICES["female"])

    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate="+35%",  # Equivalent to 1.35x speed
        pitch="+4Hz",  # Slight pitch increase
    )

    await communicate.save(str(outfile))


def synthesize_audio(text, outfile, gender="female"):
    """Synchronous wrapper for the async TTS function."""
    asyncio.run(_synthesize_audio_async(text, outfile, gender))


if __name__ == "__main__":
    text = sys.argv[1] if len(sys.argv) > 1 else "Hello, this is a test."
    outfile = sys.argv[2] if len(sys.argv) > 2 else "test_output.mp3"
    synthesize_audio(text, Path(outfile).resolve())
