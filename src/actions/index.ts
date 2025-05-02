import { defineAction } from "astro:actions";
import { z } from "astro:schema";

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
        console.error(`Failed to fetch ${input.url}:`, error);

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
      const data = await res.json();

      const cachedResponse = Response.json(data, {
        headers: {
          "Cache-Control": "public,s-maxage=3600"
        }
      });
      await cache.put(input.url, cachedResponse);

      const cachedStart = Date.now();

      const cached = await cache.match(input.url);

      // If it's a cache miss, we can't use the duration of the lookup request,
      // so we use the duration of the uncached call.
      const cachedDuration = cached
        ? Date.now() - cachedStart
        : uncachedDuration;

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
