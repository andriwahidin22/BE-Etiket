#!/bin/bash

echo "📁 Merapikan struktur folder controller..."

# Semua file controller di src/controllers (kecuali admin)
for file in ./src/controllers/*.controller.js; do
  [ -e "$file" ] || continue
  filename=$(basename "$file")
  name="${filename%.controller.js}"

  mkdir -p "./src/controllers/$name"
  mv "$file" "./src/controllers/$name/index.controller.js"
  echo "✅ $filename → controllers/$name/index.controller.js"
done

# Khusus admin
for file in ./src/controllers/admin/*.controller.js; do
  [ -e "$file" ] || continue
  filename=$(basename "$file")
  name="${filename%.controller.js}"

  mkdir -p "./src/controllers/admin/$name"
  mv "$file" "./src/controllers/admin/$name/index.controller.js"
  echo "✅ admin/$filename → admin/$name/index.controller.js"
done

echo "🎉 Struktur controller berhasil di-refactor!"
