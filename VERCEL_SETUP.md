# Vercel Environment Setup

## Prerequisites

1. **Database provisioned** — Postgres (Neon, Supabase, AWS RDS, etc.)
2. **Connection strings** — `DATABASE_URL` and `DIRECT_URL` from your provider
3. **Encryption key** — from DEPLOYMENT.md

## Step 1: Add Environment Variables to Vercel

1. Go to **Vercel Dashboard** → **PrestigeRx** → **Settings** → **Environment Variables**
2. Add these variables (all environments: Production, Preview, Development):

| Key | Value | Environment |
|-----|-------|-------------|
| `HIPAA_ENCRYPTION_KEY` | `430fb983c95f61d1212d66bad47e104690da0258683f83d195662b5ba498f74e` | All |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/prestigerx?schema=public` | All |
| `DIRECT_URL` | `postgresql://user:pass@host:5432/prestigerx?schema=public` | All |
| `NODE_ENV` | `production` | Production |

**Important:** 
- Use the **pooling connection string** for `DATABASE_URL` (PgBouncer for Neon/Supabase)
- Use the **direct connection string** for `DIRECT_URL` (for migrations)
- Never commit `.env` files to Git

## Step 2: Run Database Migrations

Once variables are set:

```bash
# Locally (to test)
npx prisma migrate deploy

# Or on Vercel post-deployment
# (migrations run automatically if configured in build script)
```

## Step 3: Verify Audit Logging

1. Log in to the app
2. Create a test prescription
3. Check Vercel logs: `vercel logs`
4. Verify `AuditLog` table has entries in your database

## Troubleshooting

### Connection Pool Errors
- Ensure `DATABASE_URL` includes `?schema=public` or your schema name
- For Neon, use `?sslmode=require` if SSL is required

### Migration Failures
- Check `DIRECT_URL` is set correctly
- Run `npx prisma db push` locally first to test

### Audit Logs Not Recording
- Check database is accessible from Vercel (firewall/IP allowlist)
- Verify `PRISMA_LOG_QUERIES=true` in production logs

## Reference

- [Prisma + Vercel](https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/vercel-postgres)
- [Neon Connection Strings](https://neon.tech/docs/connect/connection-string)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)
