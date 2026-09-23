# Graph Report - .  (2026-09-23)

## Corpus Check
- Corpus is ~33,351 words - fits in a single context window. You may not need a graph.

## Summary
- 349 nodes · 851 edges · 22 communities (18 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Marqueurs de gares|Marqueurs de gares]]
- [[_COMMUNITY_Tracé itinéraire|Tracé itinéraire]]
- [[_COMMUNITY_Génération VAPID|Génération VAPID]]
- [[_COMMUNITY_Tests géocodeur|Tests géocodeur]]

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
- `Accueil()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/Accueil.jsx → src/hooks/useAuth.jsx
- `Itineraire()` --calls--> `useLignes()`  [EXTRACTED]
  src/pages/Itineraire.jsx → src/hooks/useLignes.js

## Import Cycles
- None detected.

## Communities (22 total, 4 thin omitted)

### Community 0 - "UI contribution & i18n"
Cohesion: 0.11
Nodes (32): CarteContribution(), tempsEcoule(), QUARTIERS, fr, BadgeTransport(), CONFIG, CarteEtape(), COULEURS_LIGNE (+24 more)

### Community 1 - "Auth & app shell"
Cohesion: 0.11
Nodes (20): ModalConnexion(), Kotrou PWA (transport informel Abidjan), AuthContext, AuthProvider(), useAuth(), usePushNotifications(), useTrajets(), BottomNav() (+12 more)

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
Cohesion: 0.17
Nodes (15): BoutonGbaka(), useGpsBus(), useLignes(), usePosition(), useSignalements(), redimensionner(), uploaderPhoto(), ModalFinTrajet() (+7 more)

### Community 7 - "Hors-ligne IndexedDB"
Cohesion: 0.18
Nodes (16): useOffline(), getCommunesTelecharges(), getLignesLocales(), getToutesLignesLocales(), ouvrirDB(), sauvegarderCommune(), supprimerCommune(), calculerDistanceKm() (+8 more)

### Community 8 - "Carte MapLibre & décisions"
Cohesion: 0.15
Nodes (12): ABIDJAN, Carte(), COULEURS_SIGNAL, COULEURS_TRANSPORT, STYLE_OSM, Contrainte: zéro dépendance payante / < 5 Mo, Décision: hors-ligne IndexedDB via idb, Décision: MapLibre GL + Protomaps (vs Leaflet) (+4 more)

### Community 9 - "Communes & géocodage"
Cohesion: 0.19
Nodes (10): BADGES, COMMUNES, HUBS, geocoder(), getDB(), respecterDelai(), reverseGeocode(), AutoComplete() (+2 more)

### Community 10 - "Partage SMS/WhatsApp"
Cohesion: 0.33
Nodes (9): usePartage(), ModalPartage(), compterSMS(), construireUrlSMS(), construireUrlWhatsApp(), formaterPourSMS(), formaterPourWhatsApp(), formaterResume() (+1 more)

### Community 11 - "Manifest PWA"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, lang, name, orientation, short_name (+2 more)

### Community 12 - "Push notifications (edge)"
Cohesion: 0.42
Nodes (8): b64url(), b64urlDecode(), concat(), encryptPayload(), hkdf(), MESSAGES, sendPush(), vapidAuth()

### Community 15 - "Tracé itinéraire"
Cohesion: 0.50
Nodes (3): construireGeoJSON(), COULEURS, parseCoords()

## Knowledge Gaps
- **92 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Carte temps réel & signalements` to `UI contribution & i18n`, `Auth & app shell`, `Prix & variations`, `Hors-ligne IndexedDB`, `Communes & géocodage`, `Partage SMS/WhatsApp`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `fr` connect `UI contribution & i18n` to `Auth & app shell`, `Prix & variations`, `Carte temps réel & signalements`, `Hors-ligne IndexedDB`, `Marqueurs de gares`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `COMMUNES` connect `Communes & géocodage` to `UI contribution & i18n`, `Routeur itinéraires`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI contribution & i18n` be split into smaller, more focused modules?**
  _Cohesion score 0.1063973063973064 - nodes in this community are weakly interconnected._
- **Should `Auth & app shell` be split into smaller, more focused modules?**
  _Cohesion score 0.1051693404634581 - nodes in this community are weakly interconnected._
- **Should `Dépendances npm` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._