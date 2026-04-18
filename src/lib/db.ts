import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as mainSchema from "@/schema/schema"
import { autoApplySessions } from "@/schema/auto-apply"

// Works with Cloud SQL Auth Proxy (127.0.0.1:5432) or Unix socket
// Set DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/dbname
// Or for Unix socket: postgresql://user:pass@localhost/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
const client = postgres(process.env.DATABASE_URL!, { max: 1 })

export const db = drizzle(client, {
  schema: { ...mainSchema, autoApplySessions },
})
