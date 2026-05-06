# Déploiement Home Assistant — Become a Hero

## Prérequis

- Home Assistant OS (pas Core ni Container)
- Compte GitHub
- Docker installé localement (dev Windows)

---

## PARTIE 1 — Première installation

### Étape 1 : Préparer le repo GitHub

1. Créer un repo GitHub public (ex: `become-a-hero`)
2. Remplacer `GITHUB_USER` dans ces fichiers par ton vrai nom d'utilisateur GitHub :
   - `ha-addon/config.yaml` — champs `url` et `image`
   - `ha-addon/build.yaml` — champ `source`
   - `repository.json` — champs `url` et `maintainer`
3. Pusher le code :
   ```bash
   git remote add origin https://github.com/GITHUB_USER/become-a-hero.git
   git push -u origin master
   ```

### Étape 2 : Créer le premier tag et déclencher le build

```bash
git tag v2.0.0
git push origin v2.0.0
```

GitHub Actions va :
- Construire l'image Docker pour amd64, aarch64, armv7
- Pousser sur `ghcr.io/GITHUB_USER/become-a-hero/`
- Mettre à jour `ha-addon/config.yaml` avec la version

Vérifier que les images sont visibles sur : `https://github.com/GITHUB_USER/become-a-hero/pkgs/container/become-a-hero`

### Étape 3 : Rendre les images publiques sur GHCR

Dans GitHub → ton profil → **Packages** → `become-a-hero/amd64` (et les autres archs) → **Package settings** → **Change visibility** → **Public**

Répéter pour `aarch64` et `armv7`.

### Étape 4 : Installer MariaDB dans Home Assistant

1. HA → **Paramètres** → **Add-ons** → **Store**
2. Chercher **MariaDB** (add-on officiel)
3. Installer → Démarrer
4. Dans la config MariaDB, ajouter une base et un user :
   ```yaml
   databases:
     - become_a_hero
   logins:
     - username: become_hero
       password: MOT_DE_PASSE_FORT
   rights:
     - username: become_hero
       database: become_a_hero
   ```
5. Redémarrer MariaDB

L'URL de connexion sera :
```
mysql://become_hero:MOT_DE_PASSE_FORT@core-mariadb:3306/become_a_hero
```
> `core-mariadb` est le hostname interne HA de l'add-on MariaDB.

### Étape 5 : Ajouter le repo Become a Hero dans HA

1. HA → **Paramètres** → **Add-ons** → icône 3 points en haut à droite → **Dépôts**
2. Coller l'URL : `https://github.com/GITHUB_USER/become-a-hero`
3. Cliquer **Ajouter**
4. Rafraîchir la page

### Étape 6 : Installer et configurer l'add-on

1. Dans le store, l'add-on **Become a Hero** apparaît
2. Cliquer **Installer** (HA pull l'image depuis GHCR, ~2 min)
3. Onglet **Configuration** de l'add-on :
   ```yaml
   database_url: "mysql://become_hero:MOT_DE_PASSE_FORT@core-mariadb:3306/become_a_hero"
   anthropic_api_key: "sk-ant-..."
   gemini_api_key: "AIzaSy..."
   openai_api_key: "sk-..."        # optionnel
   elevenlabs_api_key: "..."       # optionnel
   ```
4. Cliquer **Enregistrer**
5. Onglet **Informations** → **Démarrer**

Au premier démarrage, `prisma migrate deploy` crée automatiquement toutes les tables.

### Étape 7 : Accéder à l'application

- Panneau latéral HA → **Become a Hero** (icône livre)
- Ou directement : `http://homeassistant.local:3000`

---

## PARTIE 2 — Mise à jour de version (récurrent)

### Workflow de déploiement d'une nouvelle version

```bash
# 1. Développer, tester en local (npm run dev)
# 2. Commit les changements
git add .
git commit -m "feat: description du changement"

# 3. Créer un nouveau tag (bumper la version)
git tag v2.1.0
git push origin master
git push origin v2.1.0
```

GitHub Actions se déclenche automatiquement et :
1. Build les nouvelles images Docker (3-5 min)
2. Push sur GHCR avec le nouveau tag
3. Met à jour `version` dans `ha-addon/config.yaml`

### Mettre à jour dans Home Assistant

1. HA → **Paramètres** → **Add-ons** → **Become a Hero**
2. Badge **Mise à jour disponible** visible (~24h après push, ou rafraîchir manuellement)
3. Cliquer **Mettre à jour**
4. HA pull la nouvelle image, redémarre l'add-on
5. `prisma migrate deploy` s'exécute automatiquement si nouvelles migrations

> Les migrations Prisma sont **idempotentes** : elles ne rejouent jamais une migration déjà appliquée.

### Forcer la détection immédiate dans HA

HA → **Paramètres** → **Add-ons** → **Store** → icône 3 points → **Vérifier les mises à jour**

---

## PARTIE 3 — Dev local Windows (inchangé)

```bash
# Démarrer MariaDB local
docker compose up -d

# Appliquer migrations (première fois ou après changement de schema)
npm run db:migrate

# Développer
npm run dev
# → http://localhost:3000

# Seeder un livre
npm run seed -- --pdf "./resources/MON_LIVRE.pdf" --title "Mon Livre" --language fr
```

Le fichier `.env` local pointe sur MariaDB Docker (port 3306).  
Le fichier `ha-addon/config.yaml` et le `Dockerfile` sont ignorés par Next.js — zéro impact sur le dev.

---

## Schéma résumé

```
Windows local                    GitHub                      Home Assistant
─────────────                    ──────                      ──────────────
npm run dev                      
     │                           
     ▼                           
MariaDB Docker                   
(port 3306)                      
                                 
git tag v2.x.x ─────────────►  GitHub Actions
git push --tags                  │
                                 ▼
                                 Build Docker multi-arch
                                 │
                                 ▼
                                 ghcr.io/USER/become-a-hero
                                               │
                                               ▼
                                         HA pull image
                                         prisma migrate deploy
                                         Next.js démarré
                                         ── Ingress → Panneau HA
```

---

## Dépannage

| Problème | Cause probable | Solution |
|---|---|---|
| Add-on ne démarre pas | DATABASE_URL incorrecte | Vérifier `core-mariadb` hostname et credentials MariaDB |
| Tables manquantes | Migration pas encore jouée | Vérifier logs add-on → ligne `Running Prisma migrations` |
| Image non trouvée | Package GHCR privé | Rendre les packages publics (Étape 3) |
| Add-on n'apparaît pas dans le store | Repo mal ajouté | URL exacte repo + rafraîchir store |
| Ingress ne charge pas | Port 3000 non exposé | Vérifier `ingress_port: 3000` dans config.yaml |
