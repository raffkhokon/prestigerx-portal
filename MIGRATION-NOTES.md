# Migration Notes - Provider System Update

## Database Changes Status: ✅ SAFE TO DEPLOY

### Provider Table
- **Status:** Mock/test data only
- **Action:** No migration needed
- **Result:** Old Provider model can be safely dropped

### Prescriptions Table
- **Current `providerId` field:** Nullable, references User.id
- **Will become:** Required field
- **Impact:** Existing prescriptions (if any) will need a provider assigned
- **Solution:** Set to admin user or create a "System" provider for existing records

### Migration Command
When ready to deploy:
```bash
npx prisma db push
```

This will:
- Drop Provider table (no data loss - mock only)
- Add ProviderClinic table
- Add provider fields to User
- Add API fields to Prescription
- Update indexes

### Manual Steps After Migration
1. Assign existing prescriptions to a provider (if any exist)
2. Update test user to have provider role if needed

---
Date: 2026-02-21
Confirmed by: User (mock data, no migration needed)

## Billing Model Decision

**Date:** 2026-02-21
**Model:** Clinic Pays (B2B)

**How it works:**
- Provider selects clinic when creating prescription
- Clinic gets billed for all their prescriptions
- Clinic handles patient billing separately

**No schema changes needed** - Current BillingTransaction model already supports this.

**Implementation:**
- Prescription form will include clinic dropdown (assigned clinics only)
- BillingTransaction auto-created with clinicId
- Monthly invoicing to clinics (admin tool, Phase 4)

See memory/prestigerx/BILLING-MODEL.md for full details.
