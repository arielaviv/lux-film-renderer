#!/usr/bin/env sh
# A contact sheet of a render: a frame every 0.5 s, four across, the time burnt into each.
#   ./factory/video/sheet.sh out/bayside.mp4 out/bayside-sheet.jpg
# ffmpeg only (no ImageMagick): the tile filter lays the frames out.
in=${1:-out/bayside.mp4}; out=${2:-out/bayside-sheet.jpg}
frames=$(ffprobe -v error -select_streams v:0 -show_entries format=duration -of csv=p=0 "$in" | awk '{printf "%d", $1 * 2 + 0.999}')
rows=$(( (frames + 3) / 4 ))
ffmpeg -y -loglevel error -i "$in" \
  -vf "fps=2,scale=480:-2,drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.45,tile=4x${rows}:padding=3:margin=3:color=#222222" \
  -frames:v 1 -q:v 3 "$out"
echo "$out"
