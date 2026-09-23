## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## ECC + graphify en tandem

Stack : React 18 + Vite + Tailwind (JSX), Supabase (Postgres/PostGIS, edge functions Deno), Vitest. Code et UI en français.

Chaque tâche suit ce cycle. graphify donne le contexte, les agents/skills ECC (plugin `ecc`) font le travail.

1. **Orienter (graphify)** : `graphify query` / `path` / `explain` avant de lire ou grep les sources.
   Donner le résultat pertinent du graphe dans le prompt de chaque agent ECC qui explore le code.
2. **Planifier (ECC)** : `ecc:planner` (ou `ecc:code-architect`) pour une feature ou un refactor non trivial.
   Pour l'impact d'un changement, `graphify path` entre les nœuds touchés.
3. **Implémenter en TDD (ECC)** : `ecc:tdd-guide`. Tests dans `src/__tests__/`, lancés avec `npx vitest run`.
4. **Relire (ECC)** : `ecc:react-reviewer` pour les `.jsx`, `ecc:typescript-reviewer` pour JS/TS.
   `ecc:security-reviewer` dès que ça touche l'auth (`useAuth`, OTP), Supabase/RLS ou les edge functions.
   `ecc:database-reviewer` pour `supabase/migrations/`.
5. **Resynchroniser (graphify)** : `graphify update .` après modif du code (AST uniquement, gratuit).
   Le hook git post-commit le fait aussi. Après ajout/modif de docs (`*.md`), relancer `/graphify --update`.
6. **Build cassé** : `ecc:react-build-resolver`.
