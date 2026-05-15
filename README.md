# Kotrou — Transport communautaire pour Abidjan

PWA permettant aux usagers des transports informels d'Abidjan (gbaka, wôrô-wôrô, SOTRA)
de trouver des itinéraires, des prix et des alertes trafic, le tout alimenté par la communauté.

## Installation

```bash
git clone <repo> && cd kotrou
cp .env.example .env          # Remplir les clés Supabase
npm install
# Coller le contenu de supabase/migrations/001_initial.sql dans l'éditeur SQL Supabase
npm run dev
```

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend / BDD | Supabase (PostgreSQL + PostGIS) |
| Cartes | MapLibre GL JS + Protomaps |
| Géocodage | Nominatim (OSM) |
| State | Zustand |
| Hors-ligne | IndexedDB via `idb` |
| Tests | Vitest |

## Icônes PWA

Les fichiers `public/icons/icon-192.png` et `icon-512.png` sont des placeholders.
Pour générer les vraies icônes depuis le SVG source :

```bash
# Avec ImageMagick
convert public/icons/icon.svg -resize 192x192 public/icons/icon-192.png
convert public/icons/icon.svg -resize 512x512 public/icons/icon-512.png
```
