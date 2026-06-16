-- ============================================================
-- Migration V2 Audit – RLS policies
-- Date   : 2026-06-16
-- Objet  : vérifier que les tables métier disposent de RLS et d'une isolation
--          basée sur organization_id via auth.uid().
-- ============================================================

-- Audit des tables métier : public.organizations, public.memberships,
-- public.tasks, public.documents, public.parts, public.stock_movements

-- Résultat : toutes les tables auditées ont déjà Row Level Security activée
-- et des policies d'isolation basées sur organization_id via auth.uid().

-- Aucune modification SQL supplémentaire n'est requise pour ces tables.
