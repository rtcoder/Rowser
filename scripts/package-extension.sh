#!/bin/sh
set -eu

target="${1:?Usage: sh scripts/package-extension.sh <chrome|firefox> [tag]}"
tag="${2:-v$(node -p "require('./package.json').version")}"
input_dir="dist/${target}"
output_dir="artifacts"
zip_path="${output_dir}/rowser-${target}-${tag}.zip"

if [ ! -d "$input_dir" ]; then
  printf 'Missing build output: %s\n' "$input_dir" >&2
  exit 1
fi

mkdir -p "$output_dir"
rm -f "$zip_path"

(cd "$input_dir" && zip -qr "../../${zip_path}" .)
printf '%s\n' "$zip_path"
