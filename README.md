# 🎵 Accolta — Guide de déploiement complet

> Ce guide te mène de zéro à l'application en ligne, étape par étape, avec chaque clic détaillé.

---

## Vue d'ensemble

Tu vas utiliser 3 services, tous **gratuits** :
- **Supabase** → la base de données (stocke les chansons)
- **GitHub** → héberge le code source
- **Vercel** → met l'application en ligne

Temps estimé : **30 à 45 minutes** la première fois..

---

---

# PARTIE 1 — SUPABASE (la base de données)

---

## Étape 1 — Créer un compte Supabase

1. Va sur **https://supabase.com**
2. Clique sur le bouton **"Start your project"** (ou **"Sign up"**)
3. Clique sur **"Continue with GitHub"** — c'est le plus simple si tu as déjà GitHub
   - Une fenêtre s'ouvre pour autoriser Supabase à accéder à ton GitHub
   - Clique **"Authorize supabase"**
   - Tu es maintenant connecté

---

## Étape 2 — Créer un nouveau projet Supabase

1. Tu arrives sur le **dashboard Supabase**
2. Clique sur le bouton **"New project"**
3. Tu arrives sur une page avec plusieurs champs à remplir :

### Organization
- Laisse la valeur par défaut (ton nom d'utilisateur GitHub)
- Tu n'as pas besoin de créer une organisation

### Name
- Tape : `accolta`

### Database Password
- Clique sur **"Generate a password"** (le bouton à droite du champ)
- Un mot de passe fort est généré automatiquement
- ⚠️ **IMPORTANT** : copie ce mot de passe et sauvegarde-le quelque part (un fichier texte sur ton bureau par exemple) — tu en auras peut-être besoin plus tard

### Region
- Choisis **"West EU (Ireland)"** — c'est le plus proche de la France et donc le plus rapide pour toi

### Pricing Plan
- Laisse sur **"Free"** — le plan gratuit est largement suffisant (500 Mo de données, largement assez pour des paroles de chansons)

4. Clique sur **"Create new project"**
5. ⏳ **Attends 1 à 2 minutes** — une barre de progression s'affiche pendant que Supabase configure ta base de données. Ne ferme pas la page.

---

## Étape 3 — Créer la structure de la base de données

Une fois le projet chargé, tu dois créer la table qui va stocker les chansons.

1. Dans le **menu de gauche**, cherche et clique sur **"SQL Editor"** (icône qui ressemble à `< >`)
2. Tu arrives sur un éditeur de code
3. Clique sur le bouton **"New query"** (en haut à gauche de l'éditeur)
4. Un onglet vide s'ouvre avec écrit `-- Write your SQL query here`
5. **Efface ce texte** et **colle à la place** tout le contenu du fichier `output/01_schema.sql` (tu trouveras ce fichier dans le ZIP que tu as téléchargé)
6. Clique sur le bouton **"Run"** (en bas à droite de l'éditeur, ou `Ctrl+Entrée`)
7. En bas de l'écran, tu devrais voir apparaître : `Schéma créé avec succès !`

> ✅ Si tu vois ce message, la table est créée. Passe à l'étape suivante.
> ❌ Si tu vois une erreur en rouge, copie-la et envoie-la moi.

---

## Étape 4 — Importer les 2 813 chansons

1. Toujours dans **SQL Editor**, clique à nouveau sur **"New query"**
2. Un nouvel onglet vide s'ouvre
3. Ouvre le fichier `output/import_data.sql` depuis le ZIP (c'est un gros fichier, c'est normal)
4. Sélectionne tout son contenu (`Ctrl+A`) et copie-le (`Ctrl+C`)
5. Colle-le dans l'éditeur Supabase (`Ctrl+V`)
6. Clique sur **"Run"**
7. ⏳ Attends 10 à 30 secondes — il y a 2 813 chansons à insérer
8. Tu devrais voir un message de succès en bas

### Vérifier que l'import a fonctionné
1. Dans le menu gauche, clique sur **"Table Editor"** (icône tableau)
2. Tu devrais voir la table **"chansons"** dans la liste
3. Clique dessus — tu vois les chansons listées avec leurs colonnes
4. En bas, tu devrais voir **"2813 rows"** (ou un nombre proche)

---

## Étape 5 — Récupérer les clés API Supabase

Ces clés permettront à ton application de se connecter à la base de données.

1. Dans le menu gauche, clique sur l'icône ⚙️ **"Settings"** (tout en bas du menu)
2. Dans le sous-menu qui apparaît, clique sur **"API"**
3. Tu arrives sur une page avec plusieurs sections

### Ce que tu dois noter (ouvre un fichier texte et copie ces valeurs) :

**Section "Project URL"**
- Copie la valeur sous **"URL"**
- Elle ressemble à : `https://abcdefghijklmnop.supabase.co`
- C'est ta variable `NEXT_PUBLIC_SUPABASE_URL`

**Section "Project API Keys"**
- Sous **"anon public"**, copie la longue clé qui commence par `eyJ...`
- C'est ta variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Sous **"service_role"**, clique sur **"Reveal"** pour afficher la clé, puis copie-la
- Elle commence aussi par `eyJ...` mais est différente
- C'est ta variable `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ Cette clé est **secrète** — ne la partage jamais, ne la mets pas dans le code

> Tu as maintenant 3 valeurs notées quelque part. Garde cette page ouverte ou ton fichier texte sous la main.

---

---

# PARTIE 2 — GITHUB (le code source)

---

## Étape 6 — Créer un compte GitHub (si pas déjà fait)

Si tu as déjà un compte GitHub, passe directement à l'étape 7.

1. Va sur **https://github.com**
2. Clique sur **"Sign up"**
3. Remplis : email, mot de passe, nom d'utilisateur
4. Valide ton email

---

## Étape 7 — Installer Git sur ton ordinateur

Git est l'outil qui envoie ton code vers GitHub.

### Sur Mac
1. Ouvre le **Terminal** (cherche "Terminal" dans Spotlight avec `Cmd+Espace`)
2. Tape : `git --version`
3. Si une version s'affiche (ex: `git version 2.39.0`), Git est déjà installé → passe à l'étape 8
4. Sinon, une fenêtre apparaît pour installer les outils de développement Apple → clique **"Install"** et attends

### Sur Windows
1. Va sur **https://git-scm.com/download/win**
2. Télécharge l'installeur et lance-le
3. Clique **"Next"** à toutes les étapes (les options par défaut sont bonnes)
4. Ouvre ensuite **"Git Bash"** (cherche-le dans le menu Démarrer) — utilise-le à la place du terminal classique pour les commandes qui suivent

---

## Étape 8 — Créer un dépôt GitHub

1. Va sur **https://github.com** et connecte-toi
2. Clique sur le **"+"** en haut à droite → **"New repository"**
3. Remplis le formulaire :
   - **Repository name** : `accolta`
   - **Description** : `PWA de paroles de chansons corses` (optionnel)
   - **Public** ou **Private** : choisis **Public** (nécessaire pour le plan gratuit Vercel)
   - ⚠️ **Ne coche rien d'autre** (pas de README, pas de .gitignore, pas de license) — le projet a déjà tout ça
4. Clique **"Create repository"**
5. Tu arrives sur une page vide avec des instructions — **garde cette page ouverte**

---

## Étape 9 — Préparer et envoyer le code

### Décompresser le projet
1. Décompresse le fichier `accolta-pwa.zip` que tu as téléchargé
2. Tu obtiens un dossier `paroles-pwa` — note où il est sur ton ordinateur (ex: `Bureau/paroles-pwa`)

### Configurer ton identité Git (une seule fois)
Ouvre le Terminal (Mac) ou Git Bash (Windows) et tape ces deux commandes en remplaçant par tes vraies infos :

```bash
git config --global user.email "ton@email.com"
git config --global user.name "Ton Nom"
```

### Envoyer le code sur GitHub

Dans le Terminal, navigue jusqu'au dossier du projet. Par exemple :

```bash
# Sur Mac, si le dossier est sur le Bureau :
cd ~/Desktop/paroles-pwa

# Sur Windows (Git Bash), si le dossier est sur le Bureau :
cd ~/Desktop/paroles-pwa
```

Puis tape ces commandes **une par une** (appuie sur Entrée après chaque ligne) :

```bash
git init
```
> Initialise Git dans le dossier

```bash
git add .
```
> Prépare tous les fichiers à être envoyés (le point final est important)

```bash
git commit -m "Initial commit - Accolta PWA"
```
> Crée un "snapshot" du code

```bash
git branch -M main
```
> Nomme la branche principale "main"

```bash
git remote add origin https://github.com/TON_USERNAME/accolta.git
```
> ⚠️ Remplace `TON_USERNAME` par ton vrai nom d'utilisateur GitHub
> (ex: si ton profil est `github.com/jean-dupont`, tape `jean-dupont`)

```bash
git push -u origin main
```
> Envoie le code sur GitHub

### Authentification GitHub
La première fois, GitHub te demandera tes identifiants :
- Si une fenêtre de navigateur s'ouvre → connecte-toi à GitHub dedans
- Si le terminal demande un mot de passe → GitHub n'accepte plus les mots de passe, il faut un **token** :
  1. Va sur GitHub → clic sur ta photo en haut à droite → **Settings**
  2. Tout en bas du menu gauche → **Developer settings**
  3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
  4. Note : `accolta deploy`, expiration : **No expiration**, coche : **repo**
  5. Clique **Generate token** et copie le token (commence par `ghp_...`)
  6. Utilise ce token comme mot de passe dans le terminal

### Vérifier que ça a marché
1. Retourne sur la page GitHub de ton dépôt (https://github.com/TON_USERNAME/accolta)
2. Tu dois voir tous les fichiers du projet listés
3. ✅ Si tu les vois, passe à la partie suivante

---

---

# PARTIE 3 — VERCEL (mettre en ligne)

---

## Étape 10 — Créer un compte Vercel

1. Va sur **https://vercel.com**
2. Clique sur **"Sign Up"**
3. Clique sur **"Continue with GitHub"** — c'est le plus simple
4. Autorise Vercel à accéder à ton GitHub si demandé
5. **Type of use** : clique sur **"Personal"** (pas Team ou Enterprise)
6. Tu arrives sur le dashboard Vercel

---

## Étape 11 — Importer le projet depuis GitHub

1. Sur le dashboard Vercel, clique sur **"Add New..."** puis **"Project"**
2. Tu vois une liste de tes dépôts GitHub
3. Si tu ne vois pas `accolta`, clique sur **"Adjust GitHub App Permissions"** et autorise l'accès au dépôt
4. En face de `accolta`, clique sur **"Import"**
5. Tu arrives sur la page de configuration du projet

---

## Étape 12 — Configurer le projet sur Vercel

Sur cette page de configuration :

### Framework Preset
- Vercel détecte automatiquement **"Next.js"** ✅ — ne change rien

### Root Directory
- Laisse vide (ou `./`) ✅

### Build and Output Settings
- Laisse tout par défaut ✅

### Environment Variables
C'est ici la partie **la plus importante**. Tu dois ajouter 6 variables.

Pour chaque variable : tape le **nom** dans le champ "Key", la **valeur** dans le champ "Value", puis clique **"Add"**.

---

**Variable 1**
- Key : `NEXT_PUBLIC_SUPABASE_URL`
- Value : l'URL que tu as copiée à l'étape 5 (ex: `https://abcdefgh.supabase.co`)

**Variable 2**
- Key : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value : la clé `anon public` copiée à l'étape 5 (la longue chaîne `eyJ...`)

**Variable 3**
- Key : `SUPABASE_SERVICE_ROLE_KEY`
- Value : la clé `service_role` copiée à l'étape 5 (l'autre longue chaîne `eyJ...`)

**Variable 4**
- Key : `ADMIN_SECRET_TOKEN`
- Value : invente une longue suite de lettres et chiffres, par exemple : `accolta_admin_secret_2024_xK9mP3`
  > Ce token sécurise les opérations d'écriture. Note-le quelque part, tu n'auras pas besoin de le retaper souvent.

**Variable 5**
- Key : `NEXT_PUBLIC_ADMIN_EMAIL`
- Value : l'email avec lequel tu veux te connecter à l'espace admin (ex: `ton@email.com`)
  > Ce n'est pas forcément ton email Supabase ou GitHub — c'est juste l'identifiant que tu utiliseras pour te connecter à l'admin de l'app.

**Variable 6**
- Key : `NEXT_PUBLIC_ADMIN_PASSWORD`
- Value : le mot de passe que tu veux pour l'admin (ex: `MonMotDePasse2024!`)
  > Choisis quelque chose de solide mais dont tu te souviendras.

---

Après avoir ajouté les 6 variables, clique sur **"Deploy"**.

---

## Étape 13 — Attendre le déploiement

1. Une page avec une animation de fusée s'affiche ⏳
2. Attends **2 à 4 minutes** pendant que Vercel :
   - Télécharge les dépendances
   - Compile le projet Next.js
   - Met l'application en ligne
3. Quand tu vois **"Congratulations!"** avec des confettis → c'est en ligne ! 🎉
4. Clique sur **"Continue to Dashboard"**
5. Tu vois l'URL de ton app, quelque chose comme `accolta-xxxx.vercel.app`
6. Clique dessus pour ouvrir ton application

---

## Étape 14 — Vérifier que tout fonctionne

Ouvre l'URL de ton app et vérifie :

- [ ] L'onglet **Accueil** affiche des chansons récentes
- [ ] L'onglet **Recherche** → tape "amour" ou un nom d'artiste → des résultats apparaissent
- [ ] Clique sur une chanson → les paroles s'affichent (si disponibles)
- [ ] Le cœur ❤️ → ajoute aux favoris → visible dans l'onglet **Favoris**
- [ ] Onglet **Profil** → **Espace administrateur** → connecte-toi avec l'email et mot de passe que tu as définis → tu accèdes à l'admin

---

---

# PARTIE 4 — INSTALLER LA PWA SUR MOBILE

---

## Étape 15 — Ajouter l'app sur l'écran d'accueil

### Sur iPhone (Safari)
1. Ouvre l'URL de ton app dans **Safari** (pas Chrome, pas Firefox)
2. Appuie sur l'icône **Partager** (carré avec une flèche vers le haut, en bas au centre)
3. Fais défiler la liste vers le bas
4. Appuie sur **"Sur l'écran d'accueil"**
5. Modifie le nom si tu veux (ex: "Accolta") → appuie sur **"Ajouter"**
6. L'icône apparaît sur ton écran d'accueil comme une vraie app

### Sur Android (Chrome)
1. Ouvre l'URL dans **Chrome**
2. Appuie sur le menu **⋮** (trois points, en haut à droite)
3. Appuie sur **"Ajouter à l'écran d'accueil"**
   - Si tu ne vois pas cette option, cherche **"Installer l'application"**
4. Confirme → l'icône apparaît sur ton écran d'accueil

---

---

# PARTIE 5 — GÉRER L'APPLICATION

---

## Ajouter une chanson manuellement

1. Ouvre l'app → onglet **Profil** → **Espace administrateur**
2. Connecte-toi (email + mot de passe définis à l'étape 12)
3. Appuie sur l'onglet **"Ajouter"**
4. Remplis les champs : Artiste *, Titre *, Album, Année, Paroles
5. Appuie sur **"Ajouter la chanson"**
6. La chanson est immédiatement visible par tout le monde

## Modifier une chanson

1. Dans l'espace admin → onglet **"Chansons"**
2. Cherche la chanson avec la barre de recherche
3. Appuie sur l'icône ✏️ (crayon) à droite
4. Modifie les champs → **"Enregistrer les modifications"**

## Supprimer une chanson

1. Dans l'espace admin → onglet **"Chansons"**
2. Appuie sur l'icône 🗑️ (poubelle) à droite
3. Confirme la suppression

## Importer un nouveau fichier Excel

Si tu as de nouvelles chansons à ajouter en masse :
1. Prépare un fichier `.xlsx` avec les colonnes : `Artistu`, `Dischettu`, `Titulu`, `Annata`, `Parolle`
2. Dans l'espace admin → onglet **"Importer"**
3. Appuie sur **"Choisir un fichier .xlsx"**
4. Sélectionne ton fichier → l'import démarre automatiquement
5. Les doublons (même artiste + même titre) sont ignorés, pas de doublons

---

---

# PROBLÈMES FRÉQUENTS

---

**L'app s'ouvre mais ne montre aucune chanson**
→ Les variables d'environnement Supabase sont mal copiées sur Vercel.
→ Va sur Vercel → ton projet → Settings → Environment Variables → vérifie les 3 variables Supabase

**L'espace admin dit "Email ou mot de passe incorrect"**
→ Vérifie que `NEXT_PUBLIC_ADMIN_EMAIL` et `NEXT_PUBLIC_ADMIN_PASSWORD` sur Vercel correspondent exactement à ce que tu tapes (majuscules, espaces...)

**`git push` échoue avec "Permission denied"**
→ Utilise le token GitHub comme mot de passe (voir étape 9)

**Vercel affiche une erreur de build**
→ Va sur Vercel → ton projet → l'onglet **Deployments** → clique sur le déploiement en erreur → lis les logs en rouge pour identifier le problème

**L'import SQL échoue avec "already exists"**
→ La table a déjà été créée lors d'un essai précédent. Tu peux relancer uniquement `output/import_data.sql` sans le schema.

---

*En cas de problème non listé ici, décris exactement le message d'erreur que tu vois.*
