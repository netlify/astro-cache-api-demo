// @ts-check
import { defineConfig } from "astro/config";

// import netlify from '@astrojs/netlify';
import netlify from "../../withastro/astro/packages/integrations/netlify";

// https://astro.build/config
export default defineConfig({
  adapter: netlify()
});
