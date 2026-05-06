
---

# 📘 PRD – Plateforme SaaS de livres interactifs immersifs

## 1. Contexte & vision produit

### Objectif

Créer une **plateforme SaaS** permettant à un utilisateur de :

* sélectionner ou uploader un livre au format PDF,
* analyser automatiquement sa structure via IA,
* transformer ce livre en **aventure interactive immersive**,
* naviguer paragraphe par paragraphe avec :
  * texte du chapitre (noeud),
  * choix,
  * progression visuelle (mini-map),
  * imag (optionnel)
  * son (optionnel)
* sauvegarder et reprendre sa progression.

Le produit se positionne à mi-chemin entre :

* le **livre dont vous êtes le héros**,
* le **jeu narratif interactif**,
* et l’**audiobook enrichi**.

Son nom est : Become a Hero

### Architecture Technique Cible (Recommandation)
* **Frontend**: Next.js 14+ (App Router) pour la rapidité et le SEO.
* **UI/UX**: Tailwind CSS + Framer Motion (transitions immersives).
* **Backend**: Route Handlers Next.js (Serverless).
* **LLM** : provider **paramétrable** depuis l'écran de configuration — Claude (Anthropic) ou Gemini (Google). Clés API gérées via `.env`.
* **Modèles**:
    * *Analyse / Titres* : Claude Sonnet ou Gemini Flash (configurable).
    * *Images* : DALL-E 3 ou Gemini Image (**optionnel** — désactivable).
    * *Audio* : OpenAI TTS-1 ou Gemini (**optionnel** — désactivable).
* **Database**: PostgreSQL + JSONB + Prisma

---

## 2. Cibles utilisateurs

### Utilisateur principal

* Lecteur joueur
* Amateur de livres interactifs
* Curieux de narration immersive
* Utilise desktop ou tablette ou mobile (écran responsive)

👉 **Ce PRD se concentre sur l’expérience joueur.**

---

## 3. Parcours utilisateur global

### Parcours nominal

1. Arrivée sur l’écran de choix d’histoires
2. Sélection d’un PDF existant **ou** upload d’un nouveau PDF
3. Écran de processing / analyse IA
4. Validation de l’analyse (paragraphes numérotés détectés)
5. Lancement de la partie
6. Navigation interactive entre paragraphes
7. Sauvegarde automatique de la progression

---

## 4. Écran 1 – Sélection des histoires

### Objectif

Permettre à l’utilisateur de :

* choisir une histoire existante,
* ou importer un nouveau PDF.

### Fonctionnalités

* Liste des livres disponibles sur le serveur

  * Titre
  * Image de couverture (si disponible)
  * Statut : jamais joué / en cours / terminé
* Bouton **“Uploader un PDF”**

### Contraintes

* Les PDFs uploadés sont stockés sur le serveur
* Chaque PDF correspond à **une aventure jouable**
* Pas d’édition manuelle à ce stade

---

## 5. Écran 2 – Upload de PDF

### Objectif

Importer un nouveau livre pour analyse.

### Fonctionnalités

* **Input file simple** (`<input type="file" accept=".pdf">`) — pas de drag&drop
* Vérifications :

  * format `.pdf` valide
  * taille maximale (50 Mo)
* Feedback utilisateur :

  * upload en cours (barre de progression ou spinner)
  * upload réussi / échoué

### Résultat attendu

* Le PDF est stocké
* L’utilisateur est redirigé vers l’écran de processing

### Mode seed (PDF pré-chargé)

Pour accélérer le développement ou pré-charger un livre sans passer par l’UI, un **script de seed** analyse un PDF local directement en base :

```bash
npm run seed -- --pdf ./resources/"Defis Fantastiques 02 - La Citadelle du Chaos.pdf" --title "La Citadelle du Chaos"
```

Ce script exécute le même pipeline que l’upload UI (phases 0 à 5) mais en lecture locale. Le livre apparaît ensuite dans la bibliothèque comme tout livre uploadé. Utile pour :
* Tester sans UI d’upload
* Pré-charger le PDF de démonstration au premier démarrage
* CI/CD (base de données de test peuplée)

---

## 6. Écran 3 – Processing / Analyse IA

### Objectif

Informer l’utilisateur que le livre est en cours d’analyse
et lui présenter le résultat.

### Extraction PDF (backend)

> **Modèle conceptuel** : un gamebook n’est pas un livre linéaire. Il est constitué de **paragraphes numérotés** (nodes) reliés entre eux par des **choix de navigation**. Un paragraphe 42 peut être atteint depuis plusieurs paragraphes différents, et peut mener vers 0, 1 ou N autres paragraphes. C’est un **graphe orienté**, pas une séquence.

> **Données réelles** (La Citadelle du Chaos, Défis Fantastiques n°2) : 400 paragraphes numérotés 1 à 400, 603 choix de navigation, 372 cibles uniques. Tous les paragraphes sont présents — aucun numéro manquant.

#### Phase 0 – Détection et extraction de l’introduction

Le gamebook contient toujours du contenu **avant** le premier paragraphe numéroté : règles du jeu, présentation des personnages, contexte narratif. Ce contenu doit être **présenté au joueur avant le lancement de la partie** (voir section 7.0).

* Stratégie de détection de la fin de l’intro :
  1. **Marqueur textuel fort** (si présent) : phrase du type `”Et maintenant, tournez la page !”` qui précède immédiatement le paragraphe 1. Détecté par regex :
     ```
     /et maintenant[,.]?\s+tournez\s+la\s+page/i
     /tournez\s+(?:la\s+)?page\s*[!.]/i
     ```
  2. **Fallback** : la première occurrence du paragraphe 1 isolé (numéro `1` seul sur sa ligne suivi d’un texte narratif)
* Tout le texte **avant** ce marqueur = `intro_raw` stocké en base sur le livre
* Tout le texte **après** = corps des paragraphes numérotés

#### Phase 1 – Extraction texte brut

* Librairie : **`pdf-parse`** (Node.js) — extraction page par page puis concaténation
* Post-traitement : réassemblage des lignes coupées par la mise en page PDF (sauts de ligne en milieu de phrase)
* Nettoyage : suppression des en-têtes / pieds de page répétitifs (titre du livre, numéro de page)

#### Phase 2 – Détection des paragraphes (nodes)

La mise en page du PDF place le numéro de paragraphe **seul sur sa propre ligne**, parfois précédé de plusieurs lignes vides (séparation entre paragraphes). Le texte du paragraphe commence immédiatement après.

* Regex de détection des boundaries (appliquée sur le texte après l’intro) :
  ```
  /^\s*(\d{1,3})\s*\n(?!\d)/m   — numéro seul sur ligne, suivi de texte non-numérique
  ```
* Algorithme de segmentation :
  1. Trouver tous les matches du pattern
  2. Le texte entre le match N et le match N+1 = contenu du paragraphe N
  3. Vérifier la continuité : les numéros détectés doivent former une séquence sans trous majeurs (gap toléré : paragraphes terminaux sans successeur direct)
* Résultat : `Map<number, string>` (numéro → contenu brut)
* **Nodes terminaux** (`isTerminal: true`) : paragraphes sans aucun choix détecté = fins narratives (victoire ou défaite)

**Faux positifs à exclure** :
- Nombres dans les stats : `HABILETÉ: 7`, `ENDURANCE: 11` → ignorés car précédés de `:` ou lettre
- Nombres dans le texte narratif : `”trois créatures”`, `”deux dés”` → ignorés car pas en début de ligne isolé
- Numéros de formules magiques (ex: `”36”` dans `”Rendez-vous au 36”`) → ce sont des cibles valides, pas des faux positifs

#### Phase 3 – Extraction des choix (moteur de navigation)

> C’est la partie la plus critique. Les choix sont encodés en langage naturel dans le texte des paragraphes. Pour *La Citadelle du Chaos*, **un seul pattern domine à 96%** : `”Rendez-vous au X”`.

Patterns regex ordonnés par fréquence (mesurés sur le PDF réel) :

```typescript
const PATTERNS_FR = [
  // 577 occurrences — pattern dominant
  { re: /[Rr]endez-vous au (\d+)/g,                    freq: ‘très haute’ },
  // 21 occurrences
  { re: /[Rr]endez-vous alors au (\d+)/g,              freq: ‘haute’ },
  // 5 occurrences
  { re: /[Rr]endez-vous dans ce cas au (\d+)/g,        freq: ‘moyenne’ },
  // 1 occurrence — à conserver pour autres livres
  { re: /[Aa]llez au (\d+)/g,                          freq: ‘rare’ },
  // Variantes à prévoir pour d’autres livres de la série
  { re: /[Rr]endez-vous (?:au |à la |au paragraphe )?(\d+)/g, freq: ‘générique’ },
  { re: /[Pp]assez (?:au|à) (?:paragraphe\s+)?(\d+)/g, freq: ‘autre série’ },
  { re: /[Tt]ournez-vous vers (?:le\s+)?(\d+)/g,       freq: ‘autre série’ },
];

// Patterns anglais (Fighting Fantasy original)
const PATTERNS_EN = [
  { re: /[Tt]urn to (\d+)/g },
  { re: /[Gg]o to (\d+)/g },
  { re: /[Pp]roceed to (\d+)/g },
];
```

**Extraction du libellé de choix** : pour chaque match, remonter dans le texte pour trouver la phrase narrative qui précède (jusqu’au point, au point d’interrogation ou à la ligne précédente). Exemples :
- Texte : `”Prétendre être un herboriste ? Rendez-vous au 261”` → label: `”Prétendre être un herboriste”`
- Texte : `”Rendez-vous au 261”` seul → label généré par IA : `”Continuer”`

**Choix conditionnels** (détectés mais non bloquants) : phrases du type `”Si vous disposez de X, rendez-vous au Y, sinon rendez-vous au Z”` → deux choix extraits avec leurs labels respectifs, marqués `conditional: true` pour traitement IA en phase 4.

#### Phase 4 – Validation des références inter-nodes

> Étape critique avant l’analyse IA. S’assurer que le graphe extrait est cohérent.

* Pour chaque choix extrait : vérifier que `targetNodeNumber` existe dans `Map<number, string>`
* Construire le **rapport de validation** :
  ```json
  {
    “totalNodes”: 400,
    “totalChoices”: 603,
    “uniqueTargets”: 372,
    “orphanTargets”: [],        — cibles référencées mais sans node correspondant
    “unreachableNodes”: [34, 187, ...],  — nodes sans aucun chemin entrant depuis le node 1
    “terminalNodes”: [400, 280, ...],    — nodes sans choix sortants
    “validationStatus”: “ok”    — “ok” | “warnings” | “errors”
  }
  ```
* **Règle de blocage** : si `orphanTargets` non vide → erreur bloquante, pipeline s’arrête, utilisateur informé
* **Warnings non bloquants** : nodes non atteignables (peuvent être légitimes dans certains livres)
* Ce rapport est **présenté à l’utilisateur** sur l’écran de validation (section 6 UI)

#### Phase 5 – Analyse IA (LLM configuré — Gemini par défaut)

> **Étape optionnelle** : si aucune clé API LLM n’est configurée, cette phase est sautée. Le livre est jouable immédiatement avec les titres de fallback (voir ci-dessous).

* Traitement par batches de 20 nodes par appel
* Pour chaque node :
  * génération d’un **titre court** (3-5 mots : lieu, scène, étape) — ex : *”Le portail de la citadelle”*, *”La cuisine des sorcières”*
  * génération d’un **résumé court** (1 phrase) — utilisé pour le prompt de génération d’image
  * détection optionnelle du type de fin (`endType: ‘victory’ | ‘defeat’ | ‘neutral’`) pour les nodes terminaux
  * résolution des ambiguïtés de choix `conditional: true` détectées en phase 3
* L’intro (`intro_raw`) reçoit aussi un **titre de livre** et un **résumé d’introduction**
* Résultat stocké en base, complet avant lancement de la partie

**Fallback sans LLM** :
* `title` = `”Paragraphe N”` (N = numéro du paragraphe)
* `summary` = `null` (images non générables sans résumé — feature images ignorée)
* `endType` = `’neutral’` pour tous les nodes terminaux
* Le livre est **entièrement jouable** : texte brut + choix + graphe fonctionnel

### Données produites

* Texte intro + titre livre
* Nombre total de paragraphes (nodes)
* Rapport de validation (orphelins, nodes terminaux, nodes non atteignables)
* Graphe de navigation complet (tous les liens entre nodes)
* Liste structurée (Format JSON standardisé) :

  ```json
  {
    “bookId”: “uuid-1234”,
    “title”: “La Citadelle du Chaos”,
    “intro_raw”: “Vous êtes le meilleur élève du Grand Magicien de Yore...”,
    “nodes”: [
      {
        “number”: 1,
        “title”: “Le portail de la citadelle”,
        “summary”: “Le héros arrive au portail gardé par deux créatures hybrides.”,
        “content_raw”: “Le soleil se couche ; et tandis que l’obscurité...”,
        “choices”: [
          { “label”: “Prétendre être un herboriste”, “targetNodeNumber”: 261 },
          { “label”: “Se faire passer pour un marchand”,  “targetNodeNumber”: 230 },
          { “label”: “Demander l’hospitalité pour la nuit”, “targetNodeNumber”: 20 }
        ],
        “isTerminal”: false
      },
      {
        “number”: 400,
        “title”: “La victoire finale”,
        “summary”: “Le héros triomphe de Balthus le Terrible.”,
        “content_raw”: “...”,
        “choices”: [],
        “isTerminal”: true
      }
    ],
    “validation”: {
      “totalNodes”: 400,
      “totalChoices”: 603,
      “orphanTargets”: [],
      “terminalNodes”: [400, 280],
      “validationStatus”: “ok”
    }
  }
  ```

### UI attendue

* Loader / animation de traitement avec étapes visibles :
  * `Détection de l’introduction...`
  * `Extraction du texte brut...`
  * `Détection des paragraphes...`
  * `Extraction des choix de navigation...`
  * `Validation des références (X nodes, Y choix)...`
  * `Analyse IA – génération des titres...`
* Puis écran de validation avec le **rapport de cohérence du graphe** :

#### Cas nominal (validationStatus = “ok”)

```
✅  Analyse réussie

  400 paragraphes détectés   |   603 choix de navigation   |   2 fins narratives
  Tous les liens sont valides — aucun paragraphe orphelin.

  [ Lire l’introduction ]          [ Lancer la partie ! ]
```

#### Cas warnings (nodes non atteignables, non bloquant)

```
✅  Analyse réussie avec avertissements

  400 paragraphes   |   603 choix   |   3 paragraphes non atteignables
  ⚠  Les paragraphes 34, 187, 302 ne sont accessibles depuis aucun chemin.
     Cela peut être normal selon le livre (paragraphes bonus, fins alternatives).

  [ Lire l’introduction ]          [ Lancer la partie ! ]
```

#### Cas erreur (orphelins bloquants)

```
❌  Analyse incomplète

  342 paragraphes extraits   |   Cibles introuvables : 7 références
  ✗  Les choix pointent vers des paragraphes absents du PDF : 45, 112, 203...
     Le PDF est peut-être tronqué ou mal formaté.

  [ Réessayer ]     [ Forcer le lancement malgré tout ]
```

### Action utilisateur

* Bouton **”Lire l’introduction”** → affiche l’intro du livre avant de lancer
* Bouton **”Lancer la partie !”** → charge directement le paragraphe 1

### Résumé du pipeline — qui fait quoi

```
PDF brut
  │
  ├─ [REGEX]  Phase 0 → intro_raw  +  body
  ├─ [REGEX]  Phase 1 → Map<number, texte brut>    (400 nodes)
  ├─ [REGEX]  Phase 2 → choices[] par node          (603 choix)
  ├─ [LOGIQUE] Phase 3 → rapport de validation      (0 orphelins)
  │                      ↓ jeu jouable ici sans IA
  └─ [LLM ??] Phase 4 → titres + résumés            (optionnel)
                         si absent → title = “Paragraphe N”
```

> **L’IA n’est pas sur le chemin critique.** Les phases 0-3 sont 100% déterministes (regex + logique ensembliste). La navigation fonctionne sans clé API. La phase LLM n’ajoute que des titres courts et des résumés pour la génération d’images.

---

## 7. Écran 4 – Écran de jeu (paragraphe / node)

### Objectif

Faire vivre l’expérience immersive paragraphe par paragraphe.

---

### 7.0 Écran d’introduction du livre

Avant le premier paragraphe, l’utilisateur voit l’**introduction narrative** du livre (contenu extrait en Phase 0 du pipeline).

#### Contenu affiché

* Titre du livre
* Texte d’introduction complet (`intro_raw`) — divisé en sections si long (règles, contexte, récit)
* Bouton **"Commencer l’aventure →"** → charge le paragraphe 1

#### Comportement

* Affiché automatiquement à chaque **nouvelle partie** (pas de sauvegarde existante)
* Pour une **reprise de partie** : l’intro est ignorée, le joueur atterrit directement sur le dernier paragraphe visité
* Lien **"Relire l’introduction"** accessible depuis le menu de jeu pour y revenir à tout moment

---

### 7.1 Structure de l’écran

#### Zone principale

* **En-tête du paragraphe** : numéro + champ titre éditable (voir ci-dessous)
* **Image générée** à partir du résumé du paragraphe (DALL-E 3, JIT) — optionnelle
* **Ambiance sonore** automatique au chargement (JIT) — optionnelle
* **Texte du paragraphe** affiché sous l’image
* **Narration audio** (TTS, lecture du texte) — optionnelle

#### Zone titre du node (éditable)

Le titre du node courant est **modifiable directement par le joueur** :

```
── Paragraphe 42 ──────────────────────────────────────────
   [ La porte de pierre              ] [✏] [✨ Générer par IA]
```

* Champ texte pré-rempli avec :
  * le titre LLM si disponible
  * ou `"Paragraphe 42"` (fallback)
* Le joueur peut **modifier le titre** manuellement et le sauvegarder (bouton ✏ ou `Enter`)
* Bouton **"✨ Générer par IA"** : appelle le LLM uniquement pour ce node, avec le texte brut du paragraphe en contexte → remplace le titre affiché + sauvegarde en base
* Le titre est stocké dans le champ `title` du node en base (persistant)
* Le titre mis à jour s’affiche immédiatement dans le graphe de navigation (sidebar)

#### Zone secondaire

* **Graphe de navigation** (voir section 8)

#### Zone interaction

* Liste des **choix disponibles**
  * chaque choix pointe vers un numéro de paragraphe précis

#### Zone sauvegarde (bas de la zone principale)

Deux boutons distincts, toujours visibles :

| Bouton | Icône | Action |
|--------|-------|--------|
| **Reprendre ici** | 💾 | Marque ce node comme point de reprise — c'est ici que le bouton "Reprendre" de l'écran d'accueil ramènera le joueur |
| **Checkpoint** | 🚩 | Ajoute ce node à la liste des checkpoints avec son titre — accessible depuis la barre checkpoints en bas de l'écran |

#### Zone checkpoints (barre en bas de l'écran de jeu)

Liste horizontale scrollable des checkpoints enregistrés par le joueur :

```
Checkpoints :  🚩 §1 L'entrée  ·  🚩 §17 Le fossé  ·  🚩 §42 La porte de pierre  [+]
```

* Chaque checkpoint affiche : `§numéro  titre`
* Clic sur un checkpoint → navigation directe vers ce node (même comportement que clic sur node visité dans le graphe)
* Pas de limite de checkpoints
* Les checkpoints ne sont pas effacés si on recommence (ils survivent à un "Recommencer depuis le début")

---

### 7.2 Comportement au chargement d’un paragraphe

À l’entrée sur un paragraphe (node) :

1. L’image associée s’affiche (skeleton pendant génération JIT si première visite)
2. Un son d’ambiance se lance
3. Le texte du paragraphe est affiché
4. Le texte est lu automatiquement (TTS)
5. Le graphe de navigation s’actualise avec :

   * le nouveau node marqué "courant"
   * les nodes cibles des choix disponibles révélés en "découverts"

> **Note Technique - Stratégie de génération d’assets (Lazy Loading)**
> Pour optimiser les coûts et le temps de lancement :
> * **Texte & Structure** : Générés à 100% lors de l’analyse (Screen 3).
> * **Images & Audio** : Générés **à la volée** (Just-in-Time) quand le joueur arrive sur le paragraphe. Préchargement silencieux des assets du paragraphe n+1 en background.
> * **Images & Audio sont optionnels** : Si le provider image ou audio n’est pas configuré (clé API absente ou feature désactivée dans les paramètres), l’écran de jeu s’affiche sans image et sans son — le texte et les choix restent pleinement fonctionnels.


---

### 7.3 Choix & navigation

* Les choix sont affichés sous le texte
* Chaque choix :

  * a un libellé narratif (extrait du texte du paragraphe)
  * pointe vers un numéro de paragraphe précis (`targetNodeNumber`)
* Au clic :

  * sauvegarde automatique de l'état (`choices_taken`, `visited_nodes`)
  * mise à jour automatique du point de reprise (`resumeNodeNumber`) — le joueur retrouve automatiquement le dernier node visité si rien n'a été épinglé manuellement
  * chargement du nouveau paragraphe (node)
  * répétition du cycle

👉 **Navigation non linéaire assumée**

> **Priorité de reprise** : si le joueur a utilisé le bouton "Reprendre ici" (💾), c'est ce node qui est utilisé à la reprise. Sinon, fallback sur le dernier node visité (auto-save).

---

### 7.4 Navigation retour vers un node spécifique

Le joueur peut **revenir à n'importe quel node déjà visité** en cliquant dessus dans le graphe.

#### Comportement

* Clic sur node **visité** dans le graphe → chargement immédiat du texte de ce paragraphe (sans confirmation)
* `currentNodeNumber` mis à jour en base
* Le graphe **conserve** tous les nodes et arcs existants — rien n'est effacé
* Les nodes dans l'état `discovered` (cibles des choix disponibles depuis cet ancien node) redeviennent visibles comme options

#### Règles

| Situation | Comportement |
|-----------|-------------|
| Clic node visité | Autorisé — navigation directe, texte du paragraphe affiché |
| Clic node découvert | Non autorisé — nodes `discovered` non cliquables (doivent être atteints via un choix) |
| Après retour, nouveau choix | Nouveau chemin s'ajoute au graphe (arcs supplémentaires) |
| `choices_taken` | Non modifié lors du retour — historique complet préservé |

> Le retour repositionne uniquement le curseur courant. Le graphe peut devenir cyclique si l'on revisite des nodes depuis différents chemins — React Flow + dagre gère correctement les cycles.

---

### 7.5 Écran de fin de partie (node terminal)

Quand le joueur arrive sur un node `isTerminal: true` (aucun choix disponible), l'interface bascule sur un **écran de conclusion**.

#### Contenu

* Texte du paragraphe final affiché normalement
* Bannière en bas indiquant le type de fin :

| Détection | Type | Apparence |
|-----------|------|-----------|
| Dernier paragraphe du livre (ex : §400) | Victoire | Bannière dorée |
| Paragraphe terminal sans indication claire | Fin narrative | Bannière neutre |

> La distinction victoire / défaite n'est pas calculée automatiquement (hors scope v1) — tous les nodes terminaux sont traités de manière neutre sauf si l'IA a détecté un indicateur de victoire lors de la phase 5 (champ optionnel `endType: 'victory' | 'defeat' | 'neutral'`).

#### Actions disponibles

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   [texte du paragraphe final]                                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│   Fin de l'aventure                                          │
│                                                              │
│   Paragraphes visités : 23 / 400                             │
│   Chemin parcouru : 1 → 17 → 42 → ... → 280                 │
│                                                              │
│   [ Recommencer depuis le début ]   [ Revoir le graphe ]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

* **Recommencer depuis le début** : remet `currentNodeNumber = 1`, vide `visitedNodes`, `choicesTaken`, `nodeOrder` — repart sur le paragraphe 1
* **Revoir le graphe** : retour à l'écran de jeu sur le dernier node, graphe complet visible, navigation retour disponible

---

## 8. Graphe de navigation (visualisation de progression)

### Objectif

Permettre au joueur de :

* comprendre où il est dans le graphe narratif,
* voir ce qu’il a déjà exploré et ce qui est accessible.

### Concept

> Le graphe est un **DAG orienté** (Directed Acyclic Graph) de style Graphviz. Chaque node représente un paragraphe numéroté. Les arêtes représentent les choix effectués ou disponibles. Le graphe se révèle progressivement au fil de la navigation.

### États des nodes

| État | Apparence | Signification |
|------|-----------|---------------|
| **courant** | Cerclé rouge / surligné | Paragraphe actuel du joueur |
| **visité** | Grisé | Paragraphe déjà lu |
| **découvert** | Pointillé | Accessible depuis le node courant, pas encore visité |

### États des arêtes

| État | Apparence | Signification |
|------|-----------|---------------|
| **prise** | Trait plein | Choix effectué par le joueur |
| **disponible** | Pointillé animé | Choix possible depuis le node courant |

### Fonctionnalités

* Rendu : **React Flow + dagre** (layout DAG hiérarchique automatique)
* Chaque node affiche : numéro du paragraphe + titre court
  * Si LLM configuré : titre généré (ex : *"La porte de pierre"*)
  * **Fallback sans LLM** : `"Paragraphe 42"` — le graphe reste entièrement fonctionnel
* Révélation progressive : seul le node de départ est visible initialement
* Mise en évidence du node courant
* **Clic sur node visité → navigation retour** (voir section 7.4) : le joueur revient au texte de ce paragraphe, les nodes découverts restent visibles dans le graphe

---

## 9. Sauvegarde & état de jeu

### Sauvegarde automatique

* À chaque changement de paragraphe (node) :

  * node courant (`currentNodeNumber`)
  * liste des nodes visités (`visitedNodes`)
  * séquence narrative complète (`nodeOrder`)
  * map des choix effectués (`choicesTaken`) — utilisée pour reconstruire le graphe

### Modèle de Sauvegarde (JSON)
```json
{
  “bookId”: “uuid-1234”,
  “currentNodeNumber”: 42,
  “resumeNodeNumber”: 17,
  “visitedNodes”: [1, 17, 42],
  “nodeOrder”: [1, 17, 42],
  “choicesTaken”: {
    “1”: 17,
    “17”: 42
  },
  “checkpoints”: [
    { “nodeNumber”: 1,  “title”: “L’entrée de la citadelle”, “savedAt”: “2026-05-05T10:00:00Z” },
    { “nodeNumber”: 17, “title”: “Le fossé boueux”,           “savedAt”: “2026-05-05T10:05:00Z” },
    { “nodeNumber”: 42, “title”: “La porte de pierre”,        “savedAt”: “2026-05-05T10:12:00Z” }
  ]
}
```

> `currentNodeNumber` : node actif (mis à jour automatiquement à chaque navigation).
> `resumeNodeNumber` : node de reprise explicitement épinglé par le joueur via 💾. Si `null`, fallback sur `currentNodeNumber`.
> `checkpoints` : liste des waypoints nommés, ordre d’ajout. Survivent à un “Recommencer”.
> `choicesTaken` : map `{fromNode: toNode}` pour reconstruire le DAG.

### Reprise de partie

* Depuis l’écran de sélection des histoires, bouton **”Reprendre”** :
  * si `resumeNodeNumber` défini → charge ce node
  * sinon → charge `currentNodeNumber` (dernier node visité)
  * graphe de navigation reconstruit depuis `choicesTaken` + `visitedNodes`

---

## 10. Écran de paramétrage

### Objectif

Permettre de configurer le provider LLM utilisé pour chaque type de génération, ainsi que d'activer ou désactiver les features optionnelles (images, audio).

### Accès

* Bouton ⚙ accessible depuis l'écran de sélection des histoires et l'écran de jeu
* Panneau latéral (drawer)

### Paramètres disponibles

#### Général

| Paramètre | Type | Description |
|-----------|------|-------------|
| `imagesEnabled` | boolean | Active/désactive la génération d'images (**optionnel**) |
| `audioEnabled` | boolean | Active/désactive la génération audio TTS (**optionnel**) |

#### Provider LLM – Texte

| Paramètre | Valeurs possibles |
|-----------|-------------------|
| `provider_text_analysis` | `claude` \| `gemini` |

> Utilisé pour : analyse PDF, génération de titres, résolution d'ambiguïtés de navigation.

#### Provider – Images (si `imagesEnabled = true`)

| Paramètre | Valeurs possibles |
|-----------|-------------------|
| `provider_image` | `dalle3` \| `gemini` |

#### Provider – Audio (si `audioEnabled = true`)

| Paramètre | Valeurs possibles |
|-----------|-------------------|
| `provider_audio` | `openai_tts` \| `elevenlabs` |

### Gestion des clés API

Les clés API sont gérées via le fichier **`.env`** à la racine du projet :

```env
# LLM Texte
ANTHROPIC_API_KEY=sk-ant-...      # Claude (Anthropic)
GEMINI_API_KEY=AIzaSy...          # Google Gemini

# Images (optionnel)
OPENAI_API_KEY=sk-...             # DALL-E 3

# Audio (optionnel)
ELEVENLABS_API_KEY=...            # ElevenLabs
```

> Si une clé API est absente du `.env`, la feature correspondante est automatiquement désactivée, indépendamment du paramètre `imagesEnabled` / `audioEnabled`.

### Comportement du routeur IA

Le routeur IA lit les paramètres courants et route chaque requête vers le service approprié :

```
generateNodeTitles()     → provider_text_analysis  → claudeService | geminiService
generateNodeImage()      → provider_image           → dalleService  | geminiImageService
generateNodeAudio()      → provider_audio           → openaiTtsService | elevenLabsService
```

### Persistance

* Paramètres stockés en base de données (table `settings`, enregistrement unique)
* Valeurs par défaut : tous les providers à `gemini`, images et audio **désactivés**

### Référence d'implémentation

> Pattern identique au projet `lets-become-heroes` :
> * `settingsService.ts` — persistance BD + valeurs par défaut
> * `settingsController.ts` — endpoints REST `GET /settings`, `PUT /settings`
> * `aiService.ts` — routeur dynamique selon provider configuré
> * `SettingsPanel.tsx` — drawer UI avec dropdowns + checkboxes

---

## 11. Maquettes ASCII – Déroulé d'une partie

### Écran 1 – Sélection des histoires

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔  BECOME A HERO                                          ⚙  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tes aventures                                                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │          │  │          │  │          │  │              │  │
│  │ [couv.]  │  │ [couv.]  │  │ [couv.]  │  │      +       │  │
│  │          │  │          │  │          │  │              │  │
│  │          │  │          │  │          │  │  Uploader    │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  │   un PDF    │  │
│  │La Cita-  │  │L'Antre   │  │Le Donjon │  └──────────────┘  │
│  │delle du  │  │du Dragon │  │Maudit    │                     │
│  │Chaos     │  │          │  │          │                     │
│  ├──────────┤  ├──────────┤  ├──────────┤                     │
│  │● En cours│  │✓ Terminé │  │○ Nouveau │                     │
│  │          │  │          │  │          │                     │
│  │ [Jouer]  │  │[Rejouer] │  │ [Jouer]  │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Écran 2 – Upload PDF

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔  BECOME A HERO   ←                                     ⚙  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Importer un nouveau livre                          │
│                                                                 │
│        Fichier PDF                                              │
│        ┌─────────────────────────────────────┐                 │
│        │ [  Choisir un fichier PDF  ]        │                 │
│        │  citadelle_du_chaos.pdf ✓           │                 │
│        └─────────────────────────────────────┘                 │
│        Formats acceptés : PDF — Max 50 Mo                      │
│                                                                 │
│        Titre de l'aventure                                      │
│        ┌─────────────────────────────────────┐                 │
│        │ La Citadelle du Chaos               │                 │
│        └─────────────────────────────────────┘                 │
│                                                                 │
│                      [  Analyser →  ]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Écran 3 – Analyse IA (processing)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔  BECOME A HERO                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         Le Maître du Jeu prépare ton aventure...                │
│                                                                 │
│                                                                 │
│   ✓  Extraction du texte brut                      [0.4s]     │
│   ✓  Détection des paragraphes (342 trouvés)       [1.2s]     │
│   ◉  Extraction des choix de navigation...                     │
│      ████████████████░░░░░░░░░░░░░░  52%                      │
│   ○  Analyse IA – génération des titres                        │
│   ○  Finalisation                                              │
│                                                                 │
│                                                                 │
│   ─ ─ ─ ─ (une fois terminé) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│              ✅  Analyse réussie !                              │
│                                                                 │
│              342 paragraphes — 891 choix de navigation          │
│                                                                 │
│              Le livre a été analysé avec succès.                │
│              L'histoire peut être parcourue intégralement.      │
│                                                                 │
│                    [  Lancer la partie !  ]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Écran 4 – Jeu (avec image et audio)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ⚔  BECOME A HERO   –  La Citadelle du Chaos                             ⚙  │
├───────────────────────────────────────────┬────────────────────────────────────┤
│                                           │  Carte de navigation               │
│  ┌─────────────────────────────────────┐  │                                   │
│  │                                     │  │         ┌─────────┐               │
│  │         [IMAGE — La porte           │  │         │    1    │               │
│  │          de pierre taillée,         │  │         │L'entrée │               │
│  │          torches vacillantes]       │  │         └────┬────┘               │
│  │                                     │  │              │                    │
│  └─────────────────────────────────────┘  │              ▼                    │
│  ♪ Ambiance : couloir de pierre           │         ┌─────────┐               │
│                                           │         │   17    │               │
│  ── Paragraphe 42 ──                      │         │Le fossé │               │
│  [ La porte de pierre    ] [✏] [✨ IA]   │         └────┬────┘               │
│                                           │              │                    │
│  Vous vous retrouvez face à une porte     │              ▼                    │
│  de pierre massive. Des runes anciennes   │  ►      ┌─────────┐  ◄ ici       │
│  ornent son encadrement. Le silence est   │         │   42    │               │
│  pesant, interrompu seulement par le      │         │La porte │               │
│  craquement de vos bottes sur le sol      │         │de pierre│               │
│  humide...                                │         └────┬────┘               │
│                                           │              │                    │
│  ──────────────────────────────────────   │      ┌───────┴───────┐           │
│                                           │      ▼               ▼           │
│  ›  Pousser la porte      → par. 87       │  ┌────────┐     ┌────────┐       │
│  ›  Examiner les runes    → par. 33       │  │  87 ?  │     │  33 ?  │       │
│  ›  Faire demi-tour       → par. 5        │  └────────┘     └────────┘       │
│                                           │              (découverts)         │
│  [💾 Reprendre ici]  [🚩 Checkpoint]     │                                   │
├───────────────────────────────────────────┴────────────────────────────────────┤
│  Checkpoints :  🚩 §1 L'entrée  ·  🚩 §17 Le fossé  ·  🚩 §42 La porte  [+] │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### Écran 4bis – Jeu (mode minimal, sans image ni audio)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ⚔  BECOME A HERO   –  La Citadelle du Chaos                             ⚙  │
├───────────────────────────────────────────┬────────────────────────────────────┤
│                                           │  Carte de navigation               │
│  ── Paragraphe 42 ──                      │                                   │
│  [ La porte de pierre    ] [✏] [✨ IA]   │         ┌─────────┐               │
│                                           │         │    1    │               │
│  Vous vous retrouvez face à une porte     │         │L'entrée │               │
│  de pierre massive. Des runes anciennes   │         └────┬────┘               │
│  ornent son encadrement. Le silence est   │              │                    │
│  pesant, interrompu seulement par le      │              ▼                    │
│  craquement de vos bottes sur le sol      │         ┌─────────┐               │
│  humide. La porte semble s'ouvrir vers    │         │   17    │               │
│  l'intérieur, mais ses gonds sont         │         │Le fossé │               │
│  couverts de rouille...                   │         └────┬────┘               │
│                                           │              │                    │
│                                           │              ▼                    │
│  ──────────────────────────────────────   │  ►      ┌─────────┐  ◄ ici       │
│                                           │         │   42    │               │
│  ›  Pousser la porte      → par. 87       │         │La porte │               │
│  ›  Examiner les runes    → par. 33       │         └────┬────┘               │
│  ›  Faire demi-tour       → par. 5        │      ┌───────┴───────┐           │
│                                           │      ▼               ▼           │
│  [💾 Reprendre ici]  [🚩 Checkpoint]     │  ┌────────┐     ┌────────┐       │
│                                           │  │  87 ?  │     │  33 ?  │       │
├───────────────────────────────────────────┴──┴────────┴─────┴────────┴───────┤
│  Checkpoints :  🚩 §1 L'entrée  ·  🚩 §17 Le fossé  ·  🚩 §42 La porte  [+] │
└────────────────────────────────────────────────────────────────────────────────┘
```

> `[💾 Reprendre ici]` : épingle ce node comme point de reprise depuis l'accueil.
> `[🚩 Checkpoint]` : ajoute ce node à la barre en bas (titre = champ titre courant).
> Clic sur un checkpoint dans la barre = navigation retour vers ce node.

---

### Écran 5 – Panneau de paramétrage (drawer ⚙)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ⚔  BECOME A HERO                                                         ⚙  │
├───────────────────────────────────────────┬────────────────────────────────────┤
│                                           │  ⚙ Paramètres                 ✕  │
│                                           │ ──────────────────────────────── │
│   [contenu écran en arrière-plan]         │  Général                          │
│                                           │  ☐  Images activées               │
│                                           │  ☐  Audio activé                  │
│                                           │                                   │
│                                           │  Provider — Texte & Analyse        │
│                                           │  ┌──────────────────────────┐     │
│                                           │  │ Gemini (Flash 2.5)   ▾  │     │
│                                           │  └──────────────────────────┘     │
│                                           │  (alt : Claude Sonnet)            │
│                                           │                                   │
│                                           │  Provider — Images                │
│                                           │  ┌──────────────────────────┐     │
│                                           │  │ Gemini Image         ▾  │     │
│                                           │  └──────────────────────────┘     │
│                                           │  (alt : DALL-E 3)                 │
│                                           │                                   │
│                                           │  Provider — Audio                 │
│                                           │  ┌──────────────────────────┐     │
│                                           │  │ OpenAI TTS-1         ▾  │     │
│                                           │  └──────────────────────────┘     │
│                                           │  (alt : ElevenLabs)               │
│                                           │                                   │
│                                           │  [ Tester la connexion IA ]       │
│                                           │                                   │
│                                           │  [      Enregistrer      ]        │
│                                           │  ✓ Paramètres sauvegardés         │
└───────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 12. Hors scope (pour ce PRD)

* Inventaire
* Dés / compétences
* Mort / checkpoints

👉 Ces éléments viendront dans un **PRD v2**.

---

## 13. Contraintes Techniques & Limitations

* **Taille PDF** : Max 50Mo ou ~200 pages (pour limiter les coûts API initialement).
* **Latence IA** : Prévoir des "loaders narratifs" (ex: "Le maître du jeu réfléchit...") si la génération d'image prend > 3s.
* **Coûts** : Monitoring strict des tokens. Images et audio désactivables depuis l'écran de paramétrage pour limiter les coûts.
* **Stockage** : Les images générées doivent être uploadées sur le Cloud (Supabase Storage) et non régénérées à chaque lecture.
* **Clés API** : Gérées exclusivement via `.env`. Feature désactivée automatiquement si clé absente.

---

## 14. Critères de succès (MVP)

* Un utilisateur peut :

  * uploader un PDF
  * le faire analyser (extraction paragraphes + choix + titres IA)
  * lancer une partie
  * naviguer entre paragraphes via les choix détectés
  * voir images (JIT), sons (JIT), texte et choix
  * voir le graphe de navigation se construire progressivement
  * quitter et reprendre sa partie (graphe reconstruit)


---

## Décisions architecturales (validées par l'utilisateur)

| Décision | Choix retenu | Raison |
|----------|-------------|--------|
| BDD | **PostgreSQL local + Prisma** | Docker en dev, migratable Railway/Neon en prod |
| Storage fichiers | **Disque local** (`/uploads/`) | PDF gardé après extraction. Images générées stockées localement. Pas de S3 pour MVP. |
| Pipeline PDF | **Route Next.js avec `maxDuration`** | Évite infra BullMQ/Inngest. Vercel supporte jusqu'à 5 min. |
| Auth | **Zéro auth — 1 savegame global par livre** | Pas de userId. UNIQUE sur `book_id` seul. |
| URL routing | **`/play/[bookId]/[nodeNumber]`** | URL par node. Back/forward navigateur fonctionnel. |
| Langue PDF | **Dropdown user sur upload** (fr / en) | Sélection manuelle, pas de détection automatique. |
| Cover image | **Pas de cover — titre seul** | Pas de génération ni upload de couverture. |
| Mobile graphe | **Bottom drawer** | Bouton en bas ouvre le graphe en plein écran mobile. |
| Graph viewer | **React Flow + dagre** | Clic sur node visité = navigation retour. |
| LLM défaut | **Gemini Flash 2.5** | Configurable via écran paramétrage. |
| Images/Audio | **Désactivés par défaut** | Optionnels, nécessitent clé API. |

---

## Schéma Prisma

```prisma
model Book {
  id          String   @id @default(uuid())
  title       String
  language    String   @default("fr")  // "fr" | "en"
  status      String   @default("processing")  // "processing"|"ready"|"error"
  totalNodes  Int      @default(0)
  introRaw    String?  @db.Text
  pdfPath     String   // chemin local /uploads/[bookId].pdf
  createdAt   DateTime @default(now())

  nodes           Node[]
  processingJob   ProcessingJob?
  savegame        Savegame?
}

model Node {
  id         String   @id @default(uuid())
  bookId     String
  number     Int
  title      String?           // null = pas encore généré
  summary    String?  @db.Text // null = pas encore généré (pour images)
  contentRaw String   @db.Text
  choices    Json     @default("[]")  // [{label, targetNodeNumber}]
  imageUrl   String?           // chemin local ou null
  audioUrl   String?
  isTerminal Boolean  @default(false)
  endType    String?           // "victory"|"defeat"|"neutral"

  book       Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([bookId, number])
  @@index([bookId, number])
}

model ProcessingJob {
  id          String   @id @default(uuid())
  bookId      String   @unique
  status      String   @default("pending")  // "pending"|"extracting"|"parsing"|"validating"|"analyzing"|"done"|"error"
  progress    Int      @default(0)          // 0-100
  currentStep String?
  errorMsg    String?
  updatedAt   DateTime @updatedAt

  book        Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

model Savegame {
  id                String   @id @default(uuid())
  bookId            String   @unique  // 1 save global par livre, pas de userId
  currentNodeNumber Int
  resumeNodeNumber  Int?     // épinglé manuellement (💾), null = fallback currentNodeNumber
  visitedNodes      Json     @default("[]")   // [number, ...]
  nodeOrder         Json     @default("[]")   // séquence narrative
  choicesTaken      Json     @default("{}")   // {fromNode: toNode}
  checkpoints       Json     @default("[]")   // [{nodeNumber, title, savedAt}]
  updatedAt         DateTime @updatedAt

  book              Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
}

model Settings {
  id                 Int     @id @default(1)  // enregistrement unique
  providerText       String  @default("gemini")  // "gemini"|"claude"
  providerImage      String  @default("gemini")  // "gemini"|"dalle3"
  providerAudio      String  @default("openai_tts")  // "openai_tts"|"elevenlabs"
  imagesEnabled      Boolean @default(false)
  audioEnabled       Boolean @default(false)
}
```

---

## Structure de fichiers

```
become-a-hero/
├── prisma/
│   └── schema.prisma
├── uploads/                         # PDFs + images générées (gitignored)
│   └── [bookId]/
│       ├── book.pdf
│       └── nodes/[nodeNumber].jpg
│
├── app/
│   ├── page.tsx                     # Bibliothèque (/  )
│   ├── upload/page.tsx              # Upload PDF (/upload)
│   ├── processing/[jobId]/page.tsx  # Analyse IA (/processing/[jobId])
│   ├── play/
│   │   └── [bookId]/
│   │       └── [nodeNumber]/page.tsx  # Jeu (/play/[bookId]/[nodeNumber])
│   └── api/
│       ├── books/route.ts               # GET liste livres
│       ├── upload/route.ts              # POST upload PDF
│       ├── process/[jobId]/route.ts     # GET SSE status pipeline
│       ├── process/[jobId]/start/route.ts  # POST démarrer pipeline
│       ├── nodes/[bookId]/[num]/route.ts            # GET node
│       ├── nodes/[bookId]/[num]/title/route.ts      # PUT titre (édition manuelle)
│       ├── nodes/[bookId]/[num]/generate-title/route.ts  # POST génération IA one-shot
│       ├── nodes/[bookId]/[num]/assets/route.ts     # POST JIT image/audio
│       └── savegame/[bookId]/route.ts   # GET + PUT savegame
│
├── components/
│   ├── library/
│   │   ├── BookGrid.tsx      # Grille des livres (titre seul, pas de cover)
│   │   └── BookCard.tsx
│   ├── upload/
│   │   ├── UploadForm.tsx    # input[type=file] + champ titre + dropdown langue (fr/en)
│   │   └── UploadProgress.tsx
│   ├── processing/
│   │   └── ProcessingStatus.tsx  # étapes + progress bar (SSE)
│   ├── game/
│   │   ├── GameLayout.tsx    # 2/3 main + 1/3 sidebar (desktop) / fullscreen (mobile)
│   │   ├── NodeDisplay.tsx
│   │   ├── NodeHeader.tsx    # "── Paragraphe 42 ──" + champ titre éditable + boutons ✏ ✨
│   │   ├── NodeImage.tsx     # optionnel, skeleton JIT
│   │   ├── NodeAudio.tsx     # optionnel
│   │   ├── NodeText.tsx
│   │   ├── ChoiceList.tsx
│   │   ├── SaveBar.tsx       # boutons 💾 Reprendre ici + 🚩 Checkpoint
│   │   ├── CheckpointBar.tsx # barre scrollable en bas de l'écran
│   │   └── EndScreen.tsx     # node isTerminal
│   └── graph/
│       ├── GraphMap.tsx      # React Flow container
│       ├── GraphNode.tsx     # custom node (number + title)
│       ├── GraphEdge.tsx
│       ├── GraphDrawer.tsx   # bottom drawer mobile (bouton pour ouvrir)
│       └── dagBuilder.ts     # SaveGame → RFNode[] + RFEdge[]
│
├── lib/
│   ├── pdf/
│   │   ├── extractor.ts      # pdf-parse → texte brut
│   │   ├── nodeParser.ts     # regex boundaries → Map<number, string>
│   │   └── choiceExtractor.ts  # regex choix FR/EN → choices[]
│   ├── ai/
│   │   ├── router.ts         # lit Settings → route vers claude|gemini
│   │   ├── claudeService.ts  # @anthropic-ai/sdk
│   │   ├── geminiService.ts  # @google/generative-ai
│   │   ├── imageService.ts   # dalle3 | gemini image (optionnel)
│   │   └── audioService.ts   # openai tts | elevenlabs (optionnel)
│   ├── pipeline.ts           # orchestrateur phases 0-5 (appelé depuis route /start)
│   └── db.ts                 # client Prisma singleton
│
├── hooks/
│   ├── useNode.ts            # fetch node + prefetch n+1
│   ├── useSaveGame.ts        # GET + PUT savegame (auto-save + actions manuelles)
│   └── useGraphData.ts       # dérive RFNode/RFEdge depuis savegame
│
├── types/index.ts
├── .env                      # clés API + DATABASE_URL
├── .env.example
└── scripts/
    └── seed.ts               # npm run seed -- --pdf ./resources/... --title "..."
```

---

## API Routes détail

| Route | Méthode | Corps / Params | Réponse |
|-------|---------|----------------|---------|
| `/api/books` | GET | — | `Book[]` (status=ready) |
| `/api/upload` | POST | `multipart: {pdf, title, language}` | `{bookId, jobId}` |
| `/api/process/[jobId]` | GET | — | SSE stream `{status, progress, currentStep}` |
| `/api/process/[jobId]/start` | POST | — | `{ok}` idempotent |
| `/api/nodes/[bookId]/[num]` | GET | — | `Node` complet |
| `/api/nodes/[bookId]/[num]/title` | PUT | `{title}` | `{ok}` — sauvegarde titre manuel |
| `/api/nodes/[bookId]/[num]/generate-title` | POST | — | `{title}` — appel LLM one-shot |
| `/api/nodes/[bookId]/[num]/assets` | POST | `{generate: ['image'|'audio']}` | `{queued: true}` |
| `/api/savegame/[bookId]` | GET | — | `Savegame \| null` |
| `/api/savegame/[bookId]` | PUT | `{currentNodeNumber, resumeNodeNumber?, visitedNodes, nodeOrder, choicesTaken, checkpoints}` | `Savegame` |

---

## Pipeline d'extraction (lib/pipeline.ts)

```typescript
// maxDuration = 300 (5 min) sur la route /api/process/[jobId]/start
export async function runPipeline(bookId: string, pdfPath: string, language: 'fr' | 'en') {
  // Phase 0 : extraction intro
  // Phase 1 : extraction texte brut (pdf-parse)
  // Phase 2 : détection nodes (regex)
  // Phase 3 : extraction choix (PATTERNS_FR | PATTERNS_EN selon language)
  // Phase 4 : validation (orphelins → erreur bloquante)
  // Phase 5 : analyse LLM (optionnel selon Settings)
  // Chaque phase : UPDATE ProcessingJob {status, progress, currentStep}
}
```

**Patterns de choix** (sélectionnés selon `language`) :

```typescript
const PATTERNS_FR = [
  /[Rr]endez-vous au (\d+)/g,           // 577 occ.
  /[Rr]endez-vous alors au (\d+)/g,     // 21 occ.
  /[Rr]endez-vous dans ce cas au (\d+)/g, // 5 occ.
  /[Aa]llez au (\d+)/g,                 // 1 occ.
];

const PATTERNS_EN = [
  /[Tt]urn to (\d+)/g,
  /[Gg]o to (\d+)/g,
  /[Pp]roceed to (\d+)/g,
];
```

---

## Script seed

```bash
# npm run seed -- --pdf "./resources/Defis Fantastiques 02 - La Citadelle du Chaos.pdf" --title "La Citadelle du Chaos" --language fr
```

`scripts/seed.ts` exécute `runPipeline()` directement (sans HTTP), copie le PDF dans `/uploads/[bookId]/book.pdf`.

---

## Routing jeu

URL : `/play/[bookId]/[nodeNumber]`

- `page.tsx` est un Server Component qui reçoit `params.nodeNumber`
- Chargement du node via `GET /api/nodes/[bookId]/[nodeNumber]`
- Navigation = `router.push(/play/${bookId}/${targetNodeNumber})` + PUT savegame
- Back/Forward navigateur fonctionnel (URL change à chaque node)

---

## Graphe mobile (bottom drawer)

- Desktop/tablette : sidebar fixe 1/3 droite
- Mobile (`< 768px`) : sidebar masquée, bouton flottant "📍 Carte" en bas à droite
- Clic → `<Sheet>` (shadcn) ou drawer custom couvre l'écran en plein hauteur
- Même `<GraphMap />` rendu dans le drawer

---

## Phases d'implémentation (MVP jouable)

### Phase 1 — Infrastructure (J1-J4)
- `npx create-next-app` + Tailwind + TypeScript
- Docker Compose PostgreSQL local
- Prisma schema + `prisma migrate dev`
- `.env` + `.env.example`
- `lib/db.ts` (client Prisma singleton)

### Phase 2 — Pipeline PDF (J5-J10)
- `lib/pdf/extractor.ts` (pdf-parse)
- `lib/pdf/nodeParser.ts` (regex boundaries)
- `lib/pdf/choiceExtractor.ts` (PATTERNS_FR/EN)
- `lib/pipeline.ts` (orchestrateur phases 0-4)
- Script `scripts/seed.ts`
- **Test : `npm run seed` sur La Citadelle du Chaos → 400 nodes en BDD**

### Phase 3 — Processing UI (J11-J14)
- Route `POST /api/upload` (multipart, copie PDF, crée Book + Job)
- Route `POST /api/process/[jobId]/start` + `GET` SSE
- Page `/upload` (UploadForm : input file + titre + langue)
- Page `/processing/[jobId]` (ProcessingStatus avec SSE)

### Phase 4 — Écran de jeu core (J15-J20)
- Routes `GET /api/nodes`, `GET/PUT /api/savegame`
- Hooks `useNode`, `useSaveGame`
- Page `/play/[bookId]/[nodeNumber]` : NodeHeader + NodeText + ChoiceList
- Navigation entre nodes (router.push + auto-save)
- SaveBar (💾 + 🚩) + CheckpointBar
- EndScreen (node isTerminal)
- Page d'accueil `/` (BookGrid sans cover)

### Phase 5 — Graphe React Flow (J21-J26)
- `components/graph/dagBuilder.ts`
- `GraphNode`, `GraphEdge`, `GraphMap`
- Hook `useGraphData`
- Sidebar desktop + GraphDrawer mobile

### Phase 6 — Titres éditables + IA (J27-J30)
- Route `PUT /api/nodes/.../title`
- Route `POST /api/nodes/.../generate-title`
- NodeHeader champ éditable + boutons ✏ ✨
- `lib/ai/router.ts` + `claudeService` + `geminiService`
- Phase 5 pipeline (LLM titres batch)
- Écran paramétrage Settings

### Phase 7 — Polish + Assets JIT (J31-J40)
- Framer Motion transitions nodes
- Route `POST /api/nodes/.../assets` (image/audio JIT)
- NodeImage skeleton + polling, NodeAudio
- `lib/ai/imageService`, `lib/ai/audioService`

---

## Vérification MVP jouable (après Phase 4)

1. `npm run seed -- --pdf ./resources/"Defis..." --title "La Citadelle du Chaos" --language fr`
2. Vérifier BDD : `SELECT COUNT(*) FROM "Node" WHERE book_id = ?` → 400
3. Ouvrir `http://localhost:3000` → livre apparaît dans la bibliothèque
4. Cliquer "Jouer" → `/play/[bookId]/1` → texte du paragraphe 1 + 3 choix
5. Cliquer un choix → URL change → nouveau paragraphe chargé
6. Bouton 🚩 → checkpoint apparu dans la barre en bas
7. Fermer l'onglet, rouvrir → retour au dernier node (savegame repris)

---

## Variables d'environnement (.env)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/become_a_hero"
UPLOAD_DIR="./uploads"

# LLM (optionnel pour MVP)
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Images (optionnel)
OPENAI_API_KEY=

# Audio (optionnel)
ELEVENLABS_API_KEY=
```

---

## Packages nécessaires

```json
{
  "dependencies": {
    "next": "^14",
    "@prisma/client": "latest",
    "pdf-parse": "^1.1.1",
    "@anthropic-ai/sdk": "latest",
    "@google/generative-ai": "latest",
    "openai": "latest",
    "reactflow": "^11",
    "dagre": "^0.8.5",
    "framer-motion": "^11",
    "tailwindcss": "^3"
  },
  "devDependencies": {
    "prisma": "latest",
    "tsx": "latest"
  }
}
```
