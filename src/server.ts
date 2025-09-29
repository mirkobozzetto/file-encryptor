import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();

app.use("/*", serveStatic({ root: "./dist/public" }));

const port = parseInt(process.env.PORT || "3000", 10);

console.log(`\n🚀 Server running at http://localhost:${port}\n`);

serve({
  fetch: app.fetch,
  port,
});
