# Atelier Logistique Mobile

Application mobile `Expo React Native + TypeScript` pour gerer:
- les taches atelier sur la semaine et le mois
- les pieces papier a photographier et classer
- le stock des pieces de garage avec mouvements d'entree et de sortie

## Ce qui est livre
- Authentification email/mot de passe avec bascule automatique vers un mode demo si Supabase n'est pas configure
- Reprise automatique de la session demo locale entre deux ouvertures de l'application
- Ecrans `Connexion`, `Accueil`, `Taches`, `Documents`, `Stock`
- Capture photo et import galerie pour les documents
- Gestion de stock simple avec seuil d'alerte et historique des mouvements
- Schema SQL Supabase avec tables, bucket de stockage, triggers et policies
- Tests unitaires sur la logique des taches, des dates et du stock
- Handoff design dans [docs/figma-handoff.md](./docs/figma-handoff.md)

## Demarrage rapide
```bash
npm install
npm run start
```

## Variables d'environnement
Copie `.env.example` vers `.env`, puis renseigne:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Sans ces variables, l'application reste utilisable en mode demo local.

## Base Supabase
1. Creer un projet Supabase.
2. Executer le script [supabase/schema.sql](./supabase/schema.sql).
3. Creer les utilisateurs de l'equipe dans `Authentication`.
4. Ajouter si besoin `full_name` et `role` dans les metadata utilisateurs.

## Identifiants mobile par defaut
- iOS bundle identifier: `com.atelierlogistique.mobile`
- Android package: `com.atelierlogistique.mobile`

Change ces valeurs dans [app.json](./app.json) avant une publication Store si tu veux tes propres identifiants definitifs.

## Verifications utiles
```bash
npm run typecheck
npm run test
npx expo export --platform all --max-workers 1
```

## Visuel interactif livre
Une version web interactive exportee est disponible dans `dist-web`.

Pour l'ouvrir localement:
```bash
npm run build:web
npm run preview:web
```

Puis ouvre dans ton navigateur:
`http://127.0.0.1:4173`

Capture reelle de l'application:
[docs/preview-iphone13.png](./docs/preview-iphone13.png)

## EAS Build Android / iPhone
La configuration EAS est prete dans [eas.json](./eas.json).

### Etape 0 obligatoire: connexion Expo
Cette etape est indispensable avant `eas:init` ou tout build EAS.

Dans le terminal du projet, lance:

```bash
npx eas-cli login
npx eas-cli whoami
```

Si `whoami` n'affiche pas ton compte Expo, `npm run eas:init` et les builds resteront bloques.

### Etape 1: premiere initialisation
```bash
npm run eas:init
```

Cette commande ajoutera l'identifiant Expo `projectId` si ton compte Expo n'est pas encore relie au projet.

### Etape 2: builds internes de test
```bash
npm run build:android:preview
npm run build:ios:preview
```

- Android `preview`: genere un `APK` simple a installer
- iOS `preview`: genere un build interne a partager via EAS

### Etape 3: builds de publication
```bash
npm run build:android:production
npm run build:ios:production
```

- Android `production`: genere un `AAB` pour le Play Store
- iOS `production`: genere un build App Store / TestFlight

## Prerequis pour publier
- un compte Expo connecte avec `eas login`
- un compte Apple Developer pour TestFlight
- un compte Google Play Console pour la publication Android
- tes variables Supabase reelles si tu veux quitter le mode demo
