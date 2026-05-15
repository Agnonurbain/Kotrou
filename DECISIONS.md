# Décisions techniques — Kotrou

## 1. Frontend : React 18 + Vite (et non SvelteKit)

**Choix : React**

| Critère | React | SvelteKit |
|---|---|---|
| Écosystème / recrutement Abidjan | Large, facile à recruter | Niche, peu de devs disponibles |
| Bibliothèques tierces | Très riche (MapLibre wrappers, Zustand, etc.) | Plus limité |
| Bundle size brut | ~45 kB gzip (React + ReactDOM) | ~8 kB gzip |
| PWA / Service Worker | Via vite-plugin-pwa (mature) | Adapter SvelteKit SW = plus complexe |
| Courbe d'apprentissage équipe | Connue par la plupart des devs JS | Syntaxe spécifique, formation nécessaire |

**Justification :** Le surplus de ~37 kB gzip de React reste largement sous la contrainte de 5 Mo.
Le gain principal de SvelteKit (bundle léger) ne justifie pas le risque de recrutement
et le temps de formation dans le contexte d'une équipe en Côte d'Ivoire où React domine.
Le code-splitting via Vite + lazy loading permet de garder le premier chargement rapide.

## 2. Backend : Supabase (PostgreSQL + PostGIS)

Supabase fournit en une seule plateforme gratuite :
- PostgreSQL avec PostGIS pour les requêtes géospatiales
- Auth avec OTP SMS (via Twilio/MessageBird, configurable)
- Row Level Security natif
- Realtime pour les signalements
- Storage pour les photos de lignes

Alternative écartée : Firebase — pas de PostGIS, géoqueries limitées,
vendor lock-in plus fort.

## 3. Cartes : MapLibre GL JS + Protomaps

- **MapLibre GL JS** : fork open-source de Mapbox GL, gratuit, performant sur mobile
- **Protomaps** : tuiles vectorielles gratuites basées sur OSM, pas de token requis
- Zéro coût, zéro dépendance payante, conforme aux contraintes du projet

Alternative écartée : Leaflet — rendu raster uniquement, moins performant
sur mobile, pas de rotation/inclinaison de carte.

## 4. Géocodage : Nominatim (OpenStreetMap)

API gratuite, sans token. La couverture d'Abidjan sur OSM est correcte
et s'améliore grâce à la communauté locale.
Limitation acceptée : résultats parfois moins précis que Google Geocoding,
mais conforme à la contrainte zéro dépendance payante.

## 5. State management : Zustand

Léger (~1 kB), API simple, pas de boilerplate.
Suffisant pour l'état global (utilisateur connecté, filtres actifs, cache local).
Alternative écartée : Redux — trop lourd pour les besoins actuels.

## 6. Hors-ligne : IndexedDB via `idb`

Les lignes et arrêts consultés sont mis en cache dans IndexedDB
pour un accès hors-ligne. La lib `idb` fournit une API Promise
propre au-dessus de l'API IndexedDB native.
