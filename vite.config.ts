import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @ts-ignore
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  nitro: {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      serverDir: ".vercel/output/functions/__server.func",
      publicDir: ".vercel/output/static"
    }
  }
});
