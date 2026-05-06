# Become a Hero

Transformez n'importe quel livre-jeu PDF en aventure interactive immersive, jouable dans le navigateur.

Importez un PDF de type "livre dont vous êtes le héros", et l'application extrait automatiquement les paragraphes numérotés, les choix de navigation, et construit un graphe interactif de votre progression. Sans aucune clé API, le livre est entièrement jouable. Avec un LLM configuré, chaque paragraphe reçoit un titre court et peut générer une image ou une narration audio à la volée.

---

## Fonctionnalités

- **Import PDF** — upload depuis l'interface ou pre-chargement via script seed
- **Pipeline d'extraction 100% déterministe** — regex uniquement, aucune dépendance IA pour jouer
- **Graphe de navigation** (React Flow + dagre) — se révèle progressivement au fil de la partie
- **Sauvegarde automatique** — reprendre exactement où vous vous êtes arrêté, avec checkpoints manuels
- **Titres IA** (optionnel) — Gemini ou Claude génère un titre court par paragraphe
- **Images & audio** (optionnel) — génération à la volée (JIT) par paragraphe
- **Support multi-langues** — regex FR et EN inclus
- **Add-on Home Assistant** — déployable sur votre instance HA en quelques étapes

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 App Router + TypeScript |
| UI | Tailwind CSS + Framer Motion + Radix UI |
| Graphe | React Flow + dagre |
| Base de données | MariaDB (via Prisma 5) |
| Extraction PDF | pdf-parse v1.1.1 |
| LLM (optionnel) | Gemini Flash / Claude Sonnet |
| Images (optionnel) | DALL-E 3 / Gemini Image |
| Audio (optionnel) | OpenAI TTS / ElevenLabs |

> **Note versions critiques :** `pdf-parse` doit rester en `^1.1.1` (v2 a une API incompatible). Prisma doit rester en `^5.22` (Prisma 7 casse le champ `url`).

---

## Setup minimal (dev local)

### Prérequis

- Node.js 20+
- Docker (pour MariaDB)

### 1. Cloner et installer

```bash
git clone https://github.com/VOTRE_USER/become-a-hero.git
cd become-a-hero
npm install
```

### 2. Démarrer la base de données

```bash
docker compose up -d
```

MariaDB démarre sur le port `3306` avec la base `become_a_hero`.

### 3. Configurer l'environnement

```bash
cp .env.example .env
```

Contenu minimal du `.env` pour jouer sans IA :

```env
DATABASE_URL="mysql://become_hero:password@localhost:3306/become_a_hero"
UPLOAD_DIR="./uploads"

# LLM — optionnel (titres, résumés)
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Images — optionnel
OPENAI_API_KEY=

# Audio — optionnel
ELEVENLABS_API_KEY=
```

### 4. Migrer la base de données

```bash
npm run db:migrate
```

### 5. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Charger un premier livre

### Via l'interface

Cliquez **"Uploader un PDF"** sur l'écran d'accueil, sélectionnez un PDF de livre-jeu (ex : Fighting Fantasy, Défis Fantastiques), entrez le titre et la langue, puis lancez l'analyse.

### Via le script seed (recommandé pour les tests)

```bash
npm run seed -- --pdf "./resources/Mon Livre.pdf" --title "Mon Livre" --language fr
```

Le livre apparaît ensuite dans la bibliothèque, prêt à jouer.

**Résultat attendu sur La Citadelle du Chaos :** 400 paragraphes, 515 choix, statut `warnings` (quelques nodes non atteignables — comportement normal pour ce livre).

---

## Fonctionnalités optionnelles

Toutes les features IA sont **désactivées par défaut**. Le jeu est entièrement fonctionnel sans elles.

| Feature | Clé requise | Activer dans |
|---------|-------------|--------------|
| Titres IA par paragraphe | `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY` | Panneau ⚙ dans l'app |
| Génération d'images (JIT) | `OPENAI_API_KEY` ou `GEMINI_API_KEY` | Panneau ⚙ → Images activées |
| Narration audio (JIT) | `OPENAI_API_KEY` ou `ELEVENLABS_API_KEY` | Panneau ⚙ → Audio activé |

Si une clé est absente du `.env`, la feature correspondante est automatiquement désactivée, indépendamment du réglage dans le panneau.

---

## Déploiement Home Assistant

Become a Hero est disponible comme add-on Home Assistant, avec intégration dans le panneau latéral.

Voir le guide complet : [setup_ha.md](setup_ha.md)

**Vue d'ensemble :**

1. Forker ce repo et remplacer `GITHUB_USER` dans `ha-addon/config.yaml`, `ha-addon/build.yaml`, et `repository.json`
2. Créer un tag git → GitHub Actions build les images Docker multi-arch et les pousse sur GHCR
3. Installer l'add-on MariaDB dans Home Assistant
4. Ajouter ce repo dans les dépôts HA, installer l'add-on Become a Hero, configurer `DATABASE_URL` et les clés API
5. L'app est accessible sur `http://homeassistant.local:3000` et dans le panneau latéral HA

---

## Livres compatibles

Tout livre-jeu PDF dont les paragraphes sont numérotés et les choix suivent un pattern de type :

- **Français :** `Rendez-vous au 42`, `Allez au 17`
- **Anglais :** `Turn to 42`, `Go to 17`, `Proceed to 42`

Séries testées : **Défis Fantastiques** (Fighting Fantasy VF).

---

## Structure du projet

```
become-a-hero/
├── app/                    # Routes Next.js (App Router)
│   ├── page.tsx            # Bibliothèque (/)
│   ├── upload/             # Import PDF (/upload)
│   ├── processing/         # Analyse IA (/processing/[jobId])
│   ├── play/               # Jeu (/play/[bookId]/[nodeNumber])
│   └── api/                # API Routes
├── components/
│   ├── library/            # Grille des livres
│   ├── game/               # Écran de jeu (texte, choix, sauvegarde)
│   └── graph/              # Graphe React Flow
├── lib/
│   ├── pdf/                # Extracteur, parser de nodes, extracteur de choix
│   ├── ai/                 # Router LLM, services Claude/Gemini/DALL-E/audio
│   └── pipeline.ts         # Orchestrateur du pipeline PDF (phases 0-5)
├── hooks/                  # useNode, useSaveGame, useGraphData
├── prisma/                 # Schema + migrations
├── scripts/
│   └── seed.ts             # Chargement direct d'un PDF sans UI
├── ha-addon/               # Configuration add-on Home Assistant
├── docker-compose.yml      # MariaDB local (dev)
└── setup_ha.md             # Guide déploiement Home Assistant
```

---

## Pipeline d'extraction

```
PDF brut
  │
  ├─ [REGEX]   Phase 0 → intro + corps
  ├─ [REGEX]   Phase 1 → Map<numéro, texte>    (ex: 400 nodes)
  ├─ [REGEX]   Phase 2 → choix[] par node       (ex: 515 choix)
  ├─ [LOGIQUE] Phase 3 → rapport de validation  (orphelins → erreur bloquante)
  │                      ↓ jouable sans IA ici
  └─ [LLM ??]  Phase 4 → titres + résumés       (optionnel)
```

L'IA n'est pas sur le chemin critique. Le livre est jouable dès la fin de la phase 3.

---

## Scripts disponibles

```bash
npm run dev          # Serveur de développement → http://localhost:3000
npm run build        # Build de production
npm run seed         # Charger un PDF directement en base
npm run db:migrate   # Appliquer les migrations Prisma
npm run db:studio    # Interface Prisma Studio
```

---

## Contribuer

1. Fork + branche depuis `main`
2. `npm run dev` pour développer
3. Les migrations Prisma se créent avec `npm run db:migrate` (nommez-les explicitement)
4. PR vers `main` avec description du changement et comportement testé

---

## Licence

MIT
