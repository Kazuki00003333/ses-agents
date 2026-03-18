import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "prisma+postgres://localhost:51213/?api_key=eyJkYXRhYmFzZVVybCI6ICJwb3N0Z3JlczovL3Bvc3RncmVzOnBvc3RncmVzQGxvY2FsaG9zdDo1MTIxNC9zZXNfYWdlbnRzP3NzbG1vZGU9ZGlzYWJsZSZjb25uZWN0aW9uX2xpbWl0PTEmY29ubmVjdF90aW1lb3V0PTAmbWF4X2lkbGVfY29ubmVjdGlvbl9saWZldGltZT0wJnBvb2xfdGltZW91dD0wJnNpbmdsZV91c2VfY29ubmVjdGlvbnM9dHJ1ZSZzb2NrZXRfdGltZW91dD0wIiwgIm5hbWUiOiAiZGVmYXVsdCIsICJzaGFkb3dEYXRhYmFzZVVybCI6ICJwb3N0Z3JlczovL3Bvc3RncmVzOnBvc3RncmVzQGxvY2FsaG9zdDo1MTIxNS90ZW1wbGF0ZTE_c3NsbW9kZT1kaXNhYmxlJmNvbm5lY3Rpb25fbGltaXQ9MSZjb25uZWN0X3RpbWVvdXQ9MCZtYXhfaWRsZV9jb25uZWN0aW9uX2xpZmV0aW1lPTAmcG9vbF90aW1lb3V0PTAmc2luZ2xlX3VzZV9jb25uZWN0aW9ucz10cnVlJnNvY2tldF90aW1lb3V0PTAifQ",
  },
});
