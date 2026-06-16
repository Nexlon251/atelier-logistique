# MVP SaaS Multi-Clients Atelier Logistique

## Résumé
- Transformer l’app Expo/React Native existante en MVP SaaS payant pour web, iOS et Android.
- Garder les modules actuels : tâches, documents, stock, puis ajouter multi-organisation, invitations, rôles, abonnement Stripe, cache de lecture et qualité production.
- État actuel vérifié : `npm.cmd run typecheck` OK, `npm.cmd run test` OK, 12 tests passent.

## Changements Clés
- Ajouter une vraie couche SaaS Supabase :
  - tables `organizations`, `memberships`, invitation équipe, rôles `owner/admin/member`;
  - `organization_id` sur tâches, documents, pièces et mouvements;
  - RLS Supabase stricte pour isoler les données entre clients.
- Ajouter abonnement Stripe web :
  - fonctions backend Supabase Edge pour Checkout, portail client et webhook Stripe;
  - blocage ou limitation des organisations sans abonnement actif.
- Compléter l’app :
  - écran organisation/admin : équipe, invitations, rôle, abonnement;
  - édition + archivage des tâches, documents et pièces;
  - mouvements de stock conservés append-only, correction via ajustement;
  - cache local par organisation en lecture, écritures uniquement en ligne.
- Qualité produit :
  - intégrer crash logs type Sentry;
  - améliorer états d’erreur, chargement, abonnement expiré, invitation invalide;
  - validation responsive web, iPhone, Android avec Browser/preview et EAS.
- Design :
  - approche code-first avec le handoff existant `docs/figma-handoff.md`;
  - Figma reste optionnel si tu fournis une maquette plus tard.
- Linear/FINN :
  - Linear peut servir à découper ce plan en tickets;
  - FINN n’a pas de rôle direct dans ce MVP logistique.

## Interfaces Et Données
- Étendre les types applicatifs avec `Organization`, `Membership`, `BillingStatus`, `InviteStatus`.
- Faire évoluer le repository vers des fonctions tenant-scoped : `fetchSnapshot(organizationId)`, `create/update/archive` par module.
- Ajouter `updated_at` et `archived_at` sur les entités métier modifiables.
- Ajouter variables `.env.example` : Supabase, Stripe public/secret côté fonctions, webhook secret, Sentry DSN optionnel.

## Tests Et Validation
- Tests unitaires : rôles, filtrage organisation, archivage, cache local, limites stock.
- Tests SQL/RLS : un membre d’une organisation ne lit jamais les données d’une autre.
- Vérifications locales : `typecheck`, `test`, export web.
- Vérifications produit : parcours connexion, invitation, abonnement Stripe test, création/édition/archive, upload document, mouvements stock.
- Builds : EAS preview Android/iOS, puis production web/iOS/Android.

## Hypothèses
- Nom et branding restent `Atelier Logistique`.
- Langue V1 : français.
- Paiement : Stripe web, pas d’achats in-app Apple/Google dans la V1.
- Pas de scan code-barres, reporting avancé, permissions fines, audit complet ou sync hors-ligne complète dans ce MVP.
