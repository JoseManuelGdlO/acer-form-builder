import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** WhatsApp / Facebook OG tags need absolute image URLs; build with VITE_SITE_ORIGIN=https://oficina.asertours.mx */
function htmlSiteOriginPlugin(siteOrigin: string) {
  const prefix = siteOrigin.replace(/\/$/, "");
  return {
    name: "html-site-meta-origin",
    transformIndexHtml(html: string) {
      return html.replace(/__META_SITE_ORIGIN__/g, prefix);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const siteOrigin = env.VITE_SITE_ORIGIN ?? "";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      htmlSiteOriginPlugin(siteOrigin),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
