import asyncio
import re
import sys
import time
from pathlib import Path

import edge_tts


# Microsoft Edge TTS voices (free, no API key needed)
VOICES = {"female": "en-US-JennyNeural", "male": "en-US-GuyNeural"}

# Max retries for TTS requests
MAX_RETRIES = 3


def sanitize_text(text):
    """Clean up text for TTS - remove problematic characters."""
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Remove characters that might cause issues
    text = re.sub(r'[^\w\s\'".,!?;:\-()&]', "", text)
    # Ensure we have actual speakable content
    if not re.search(r"[a-zA-Z]", text):
        return ""
    return text


async def _synthesize_audio_async(text, outfile, gender="female", retry=0):
    voice = VOICES.get(gender.lower(), VOICES["female"])

    # Sanitize the text
    clean_text = sanitize_text(text)

    if not clean_text:
        # If text is empty after sanitization, use a placeholder pause
        clean_text = "..."
        print(f"  ⚠️  Empty text detected, using pause")

    try:
        communicate = edge_tts.Communicate(
            text=clean_text,
            voice=voice,
            rate="+35%",  # Equivalent to 1.35x speed
            pitch="+4Hz",  # Slight pitch increase
        )
        await communicate.save(str(outfile))
    except edge_tts.exceptions.NoAudioReceived as e:
        if retry < MAX_RETRIES:
            wait_time = (retry + 1) * 2  # Exponential backoff: 2s, 4s, 6s
            print(
                f"  ⚠️  TTS failed, retrying in {wait_time}s... (attempt {retry + 1}/{MAX_RETRIES})"
            )
            print(f"      Text: {clean_text[:50]}...")
            await asyncio.sleep(wait_time)
            return await _synthesize_audio_async(text, outfile, gender, retry + 1)
        else:
            print(
                f"  ❌ TTS failed after {MAX_RETRIES} attempts for: {clean_text[:50]}..."
            )
            raise
    except Exception as e:
        print(f"  ❌ Unexpected TTS error: {e}")
        raise


def synthesize_audio(text, outfile, gender="female"):
    """Synchronous wrapper for the async TTS function."""
    asyncio.run(_synthesize_audio_async(text, outfile, gender))


if __name__ == "__main__":
    text = sys.argv[1] if len(sys.argv) > 1 else "Hello, this is a test."
    outfile = sys.argv[2] if len(sys.argv) > 2 else "test_output.mp3"
    synthesize_audio(text, Path(outfile).resolve())
