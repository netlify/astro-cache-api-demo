import { defineAction } from "astro:actions";
import { z } from "astro:schema";

import { setCacheHeaders, HOUR } from "@netlify/cache";

export const server = {
  fetch: defineAction({
    input: z.object({
      url: z.string()
    }),
    handler: async (input) => {
      const cache = await caches.open("my-cache");
      const uncachedStart = Date.now();

      let res: Response | undefined;

      try {
        res = await fetch(input.url);

        if (!res.ok) {
          throw new Error("Unexpected status code");
        }
      } catch (error) {
        console.error("Failed to fetch", input.url, error);

        const duration = Date.now() - uncachedStart;

        return {
          duration: {
            cached: duration,
            uncached: duration
          },
          error: true
        };
      }

      const uncachedDuration = Date.now() - uncachedStart;

      const cachedResponse = setCacheHeaders(res.clone(), {
        ttl: 2 * HOUR
      });

      try {
        await cache.put(input.url, cachedResponse);
      } catch (error) {
        console.error("Failed to add to the cache", input.url, error);
      }

      const cachedStart = Date.now();
      const cached = await cache.match(input.url);

      // For a fair benchmark, discard the duration if we had a cache miss.
      const cachedDuration = cached
        ? Date.now() - cachedStart
        : uncachedDuration;

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
