import { defineAction } from "astro:actions";
import { z } from "astro:schema";

import { getStore } from "@netlify/blobs";

const cache = await caches.open("my-cache");

const getFromCache = async (url: string) => {
  const cached = await caches.match(url);
  if (cached) {
    const data = await cached.json();

    return { cached: true, ...data };
  }

  const fresh = await fetch(url);

  await cache.put(url, fresh.clone());

  const data = await fresh.json();

  return { cached: false, ...data };
};

const getFromBlobs = async (url: string, id: string) => {
  const store = getStore("my-store");
  const key = `quote-${id}`;
  const value = await store.get(key, { type: "json" });
  if (value) {
    return { cached: true, ...value };
  }

  const res = await fetch(url);
  const data = await res.json();

  await store.setJSON(key, data);

  return { cached: false, ...data };
};

export const server = {
  fetch: defineAction({
    input: z.object({
      url: z.string()
    }),
    handler: async (input) => {
      const cache = await caches.open("my-cache");
      const uncachedStart = Date.now();

      const res = await fetch(input.url);
      const uncachedDuration = Date.now() - uncachedStart;

      await cache.put(input.url, res.clone());

      const cachedStart = Date.now();
      const cached = await cache.match(input.url);
      const cachedDuration = Date.now() - cachedStart;

      await cached?.json();

      const data = await res.json();

      return {
        duration: {
          cached: cachedDuration,
          uncached: uncachedDuration
        },
        ...data
      };
    }
  })
};
