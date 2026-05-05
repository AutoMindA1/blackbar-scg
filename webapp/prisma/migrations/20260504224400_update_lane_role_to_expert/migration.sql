-- Data migration: align Lane's role with MARIZ-SURFACE-SPEC.md.
-- Lane is an expert (business owner / signer), not an admin operator.
-- canRequestAdminView remains true (set in PR 1) so he can toggle into admin view.
UPDATE "users" SET "role" = 'expert' WHERE "email" = 'lane@swainston.com';
