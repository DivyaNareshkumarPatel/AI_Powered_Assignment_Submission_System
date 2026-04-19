# 🔧 Fix Foreign Key Constraint Error

## Problem
```
ERROR: foreign key constraint "push_subscriptions_user_id_fkey" cannot be implemented (SQLSTATE 42804)
```

## Root Cause
- Your `users` table uses `UUID` for `user_id`
- The `push_subscriptions` and `notifications` tables were using `INTEGER`
- **UUID ≠ INTEGER** → Foreign key constraint fails

## Solution

### Step 1: Drop Existing Tables (if they exist)

```sql
-- Drop dependent tables first
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
```

### Step 2: Run Corrected Migration

**Copy the entire SQL from:**
`backend/migrations/001_create_notifications_table.sql`

Or run this directly in your database:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
```

### Step 3: Verify Tables Created

```sql
-- Check push_subscriptions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'push_subscriptions';

-- Check notifications
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications';
```

Should show `user_id` as `uuid` type, not `integer`.

---

## What Changed

| Column | Old | New |
|--------|-----|-----|
| `id` | SERIAL (auto-increment integer) | UUID (gen_random_uuid()) |
| `user_id` | INTEGER | **UUID** |
| `created_at` | TIMESTAMP | TIMESTAMP WITH TIME ZONE |

---

## Execution Steps

1. Open your Neon database or PostgreSQL client
2. Run the DROP TABLE statements first
3. Then run the CREATE TABLE statements
4. Verify with the SELECT query
5. Restart backend server

---

## If Using Neon Console:

1. Go to: https://console.neon.tech
2. Select your project
3. Open SQL Editor
4. Paste and run the corrected SQL
5. Done!

---

## Verification

After running, restart backend and check console:
```
✅ Should see: "Server running on http://localhost:5000"
✅ No errors about foreign key constraints
```

Then test push notifications - Service Worker should register successfully.

---

## Why This Happened

The migration file was created with INTEGER user_id, but your actual database schema uses UUID for all IDs. The foreign key constraint requires matching types.

**Fixed in:** `backend/migrations/001_create_notifications_table.sql`
