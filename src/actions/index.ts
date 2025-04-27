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

      try {
        const cachedResponse = setCacheHeaders(res.clone(), {
          ttl: 2 * HOUR
        });

        await cache.put(input.url, cachedResponse);
      } catch (error) {
        console.error("Failed to add to cache", input.url, error);
      }

      const cachedStart = Date.now();

      let cached: Response | undefined;

      try {
        cached = await cache.match(input.url);
      } catch (error) {
        console.error("Failed to read cache", input.url, error);
      }

      // If it's a cache miss, we can't use the duration of the lookup request,
      // so we use the duration of the uncached call.
      const cachedDuration = cached
        ? Date.now() - cachedStart
        : uncachedDuration;

      try {
        await cached?.json();
      } catch (error) {
        console.error("Failed to read cached response", input.url, error);
      }

      let data = {};

      try {
        data = await res.json();

        console.log("Returning data", input.url);

        return {
          duration: {
            cached: cachedDuration,
            uncached: uncachedDuration
          },
          ...data
        };
      } catch (error) {
        console.error("Failed to fresh response body", input.url, error);

        return {
          duration: {
            cached: cachedDuration,
            uncached: uncachedDuration
          },
          error: true
        };
      }
    }
  })
};
