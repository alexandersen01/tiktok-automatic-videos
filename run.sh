#!/usr/bin/env bash

set -e
set -o nounset
set -o pipefail

script_dir="$(dirname $0)"
cd $script_dir

input_queue="$PWD/input.txt"
workspace_root="$PWD/generate-assets/workspace"
done_dir="$PWD/generate-assets/done"
output_dir="$PWD/output"
session="session-$(date +%Y-%m-%d_%H-%M-%S)"

mkdir -p $workspace_root
mkdir -p $done_dir
mkdir -p "$output_dir/$session"

# Check if input.txt already has URLs (manual mode)
if [ -f "$input_queue" ] && [ -s "$input_queue" ] && grep -qE '^https://' "$input_queue"; then
    echo "=== Using existing URLs from input.txt ==="
else
    # Fetch top posts from Reddit with proper headers
    echo "=== Fetching posts from Reddit ==="
    reddit_response=$(mktemp)

    curl -s \
        -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \
        -H 'Accept: application/json' \
        'https://old.reddit.com/r/sexstories/top.json?t=week&limit=25' \
        -o "$reddit_response"

    # Check if we got valid JSON
    if ! jq -e . "$reddit_response" > /dev/null 2>&1; then
        echo "❌ Error: Reddit returned invalid JSON (likely rate-limited or blocked)"
        echo "Response preview:"
        head -c 500 "$reddit_response"
        echo ""
        echo ""
        echo "Tip: Manually add Reddit post URLs to input.txt (one per line) and re-run"
        rm "$reddit_response"
        exit 1
    fi

    # Extract URLs
    jq -r '.data.children[] | .data | .url' "$reddit_response" \
        | grep -v update \
        | grep -E '.+' \
        | head -n100 \
        | shuf -n2 > $input_queue

    rm "$reddit_response"
fi

echo "=== Posts to process ==="
cat $input_queue
video_urls=$(cat $input_queue)

if [ -z "$video_urls" ]; then
    echo "❌ No posts found. Exiting."
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "generate-assets/.venv" ]; then
    source generate-assets/.venv/bin/activate
fi

# Ensure NLTK data is downloaded (one-time, silent if already present)
python3 -c "import nltk; nltk.download('punkt_tab', quiet=True)" 2>/dev/null || true

# Generate assets for each post
for video_url in $video_urls
do
(
    cd generate-assets/
    python3 run.py "$video_url"
)
done

# Start a local HTTP server to serve audio files (Chromium blocks file:// URLs)
SERVER_PORT=8976
echo "=== Starting local asset server on port $SERVER_PORT ==="
python3 -m http.server $SERVER_PORT --directory "$workspace_root" &>/dev/null &
SERVER_PID=$!

# Ensure server is killed on script exit
cleanup() {
    if [ -n "${SERVER_PID:-}" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Give server a moment to start
sleep 1

# Render videos
for name in $(ls $workspace_root); do
    workdir="$workspace_root/$name"
    filename="$(cat $workdir/script.json | jq -r '.title | .filename')"
    video="$output_dir/$session/$filename"
    audio_base="http://localhost:$SERVER_PORT/$name/sounds"
    
    echo "=== Rendering: $name ==="
    
    # Build props JSON for Remotion (transform script.json to component format)
    props_file=$(mktemp)
    cat "$workdir/script.json" | jq --arg audio_base "$audio_base" '{
        content: ([.title] + .script) | map({
            text: .text,
            duration: (if .duration > 1 then .duration else 1 end),
            audioFile: ($audio_base + "/" + .audio_file),
            start: 0,
            emoji: [.emoji]
        }),
        totalDuration: (([.title] + .script) | map(if .duration > 1 then .duration else 1 end) | add | ceil)
    }' > "$props_file"
    
    (
        cd video-generator/
        npx remotion render src/index.tsx Main "$video" \
            --props="$props_file" \
            --timeout=120000
    )
    
    rm "$props_file"
    echo "✅ Video saved: $video"
    mv -f $workdir $done_dir
done

echo ""
echo "=== Session complete: $session ==="
echo "Videos saved to: $output_dir/$session/"

echo > $input_queue