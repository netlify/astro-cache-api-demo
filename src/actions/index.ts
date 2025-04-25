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
      } catch {
        const duration = Date.now() - uncachedStart;

        return {
          duration: {
            cached: duration,
            uncached: duration
          },
          data: null
        };
      }

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
