# Graph Report - Kotrou  (2026-09-23)

## Corpus Check
- 97 files · ~35,036 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 363 nodes · 864 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52aec255`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_UI contribution & i18n|UI contribution & i18n]]
- [[_COMMUNITY_Auth & app shell|Auth & app shell]]
- [[_COMMUNITY_Dépendances npm|Dépendances npm]]
- [[_COMMUNITY_Prix & variations|Prix & variations]]
- [[_COMMUNITY_Import CSV des lignes|Import CSV des lignes]]
- [[_COMMUNITY_Routeur itinéraires|Routeur itinéraires]]
- [[_COMMUNITY_Carte temps réel & signalements|Carte temps réel & signalements]]
- [[_COMMUNITY_Hors-ligne IndexedDB|Hors-ligne IndexedDB]]
- [[_COMMUNITY_Carte MapLibre & décisions|Carte MapLibre & décisions]]
- [[_COMMUNITY_Communes & géocodage|Communes & géocodage]]
- [[_COMMUNITY_Partage SMSWhatsApp|Partage SMS/WhatsApp]]
- [[_COMMUNITY_Manifest PWA|Manifest PWA]]
- [[_COMMUNITY_Push notifications (edge)|Push notifications (edge)]]
- [[_COMMUNITY_Skeletons de chargement|Skeletons de chargement]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Tracé itinéraire|Tracé itinéraire]]
- [[_COMMUNITY_Génération VAPID|Génération VAPID]]
- [[_COMMUNITY_Tests géocodeur|Tests géocodeur]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `supabase` - 22 edges
2. `fr` - 21 edges
3. `Bouton()` - 17 edges
4. `useAuth()` - 17 edges
5. `usePrix()` - 11 edges
6. `main()` - 10 edges
7. `BadgeTransport()` - 10 edges
8. `Header()` - 10 edges
9. `Chargement()` - 10 edges
10. `formaterPrix()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `CarteEtape()` --calls--> `usePrix()`  [EXTRACTED]
  src/components/itineraire/CarteEtape.jsx → src/hooks/usePrix.js
- `ModalPartage()` --calls--> `formaterPrix()`  [EXTRACTED]
  src/components/itineraire/ModalPartage.jsx → src/lib/prix.js
- `BoutonSignalerPrix()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/prix/BoutonSignalerPrix.jsx → src/hooks/useAuth.jsx
- `BanniereOffline()` --calls--> `useOffline()`  [EXTRACTED]
  src/components/ui/BanniereOffline.jsx → src/hooks/useOffline.js
- `Accueil()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/Accueil.jsx → src/hooks/useAuth.jsx

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 0 - "UI contribution & i18n"
Cohesion: 0.10
Nodes (25): ModalConnexion(), AuthContext, AuthProvider(), useAuth(), useOffline(), usePushNotifications(), useTrajets(), BottomNav() (+17 more)

### Community 1 - "Auth & app shell"
Cohesion: 0.20
Nodes (10): QUARTIERS, redimensionner(), uploaderPhoto(), COMMUNES_OPTIONS, Contribution(), creerSegment(), quartiersOptions(), TYPES (+2 more)

### Community 2 - "Dépendances npm"
Cohesion: 0.06
Nodes (32): dependencies, csv-parse, dotenv, idb, lucide-react, maplibre-gl, pmtiles, react (+24 more)

### Community 3 - "Prix & variations"
Cohesion: 0.16
Nodes (22): usePrix(), ageCourt(), analyserVariation(), COULEURS_CONTEXTE_GRAPHE, COULEURS_VARIATION, detecterContexte(), formaterPrix(), genererValeursRapides() (+14 more)

### Community 4 - "Import CSV des lignes"
Cohesion: 0.11
Nodes (27): args, attendreRateLimit(), batchSize, CACHE_PATH, CENTRES_COMMUNES, cleDoublon(), COMMUNES_MAP, construireNomLigne() (+19 more)

### Community 5 - "Routeur itinéraires"
Cohesion: 0.19
Nodes (22): SEED_LIGNES, haversine(), tempsMarche(), calculerItineraires(), chercherCorrespondances(), chercherDirectes(), chercherDirectesEnLigne(), chercherSignalements() (+14 more)

### Community 6 - "Carte temps réel & signalements"
Cohesion: 0.11
Nodes (32): BoutonGbaka(), CarteContribution(), tempsEcoule(), useGpsBus(), usePosition(), useSignalements(), fr, BadgeTransport() (+24 more)

### Community 7 - "Hors-ligne IndexedDB"
Cohesion: 0.24
Nodes (13): getCommunesTelecharges(), getLignesLocales(), getToutesLignesLocales(), ouvrirDB(), sauvegarderCommune(), supprimerCommune(), calculerDistanceKm(), distancePointSegment() (+5 more)

### Community 8 - "Carte MapLibre & décisions"
Cohesion: 0.10
Nodes (19): ABIDJAN, Carte(), COULEURS_SIGNAL, COULEURS_TRANSPORT, STYLE_OSM, Contrainte: zéro dépendance payante / < 5 Mo, Décision: hors-ligne IndexedDB via idb, Décision: MapLibre GL + Protomaps (vs Leaflet) (+11 more)

### Community 10 - "Partage SMS/WhatsApp"
Cohesion: 0.33
Nodes (9): usePartage(), ModalPartage(), compterSMS(), construireUrlSMS(), construireUrlWhatsApp(), formaterPourSMS(), formaterPourWhatsApp(), formaterResume() (+1 more)

### Community 11 - "Manifest PWA"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, lang, name, orientation, short_name (+2 more)

### Community 12 - "Push notifications (edge)"
Cohesion: 0.42
Nodes (8): b64url(), b64urlDecode(), concat(), encryptPayload(), hkdf(), MESSAGES, sendPush(), vapidAuth()

### Community 13 - "Skeletons de chargement"
Cohesion: 0.10
Nodes (13): BADGES, COMMUNES, HUBS, useLignes(), geocoder(), getDB(), respecterDelai(), reverseGeocode() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (5): Kotrou PWA (transport informel Abidjan), Icônes PWA, Installation, Kotrou — Transport communautaire pour Abidjan, Stack technique

### Community 15 - "Tracé itinéraire"
Cohesion: 0.50
Nodes (3): construireGeoJSON(), COULEURS, parseCoords()

## Knowledge Gaps
- **103 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Carte temps réel & signalements` to `UI contribution & i18n`, `Auth & app shell`, `Prix & variations`, `Hors-ligne IndexedDB`, `Partage SMS/WhatsApp`, `Skeletons de chargement`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `fr` connect `Carte temps réel & signalements` to `UI contribution & i18n`, `Auth & app shell`, `Prix & variations`, `Community 22`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI contribution & i18n` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._
- **Should `Dépendances npm` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Import CSV des lignes` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `Carte temps réel & signalements` be split into smaller, more focused modules?**
  _Cohesion score 0.10841750841750841 - nodes in this community are weakly interconnected._