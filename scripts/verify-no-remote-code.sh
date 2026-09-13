#!/bin/sh
set -eu

target="${1:-chrome}"
input_dir="dist/${target}"

if [ ! -d "$input_dir" ]; then
  printf 'Missing build output: %s\n' "$input_dir" >&2
  exit 1
fi

matches="$(
  find "$input_dir" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' \) \
    -exec grep -nE 'https?://(cdn|unpkg|jsdelivr|esm\.sh|skypack|cdnjs|googleapis|gstatic)' {} + || true
)"

if [ -n "$matches" ]; then
  printf 'Remote code-like references found in %s:\n%s\n' "$input_dir" "$matches" >&2
  exit 1
fi

printf 'No remote CDN code references found in %s\n' "$input_dir"
