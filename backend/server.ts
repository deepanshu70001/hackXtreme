import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";

async function listenWithRetry(
  server: ReturnType<typeof createHttpServer>,
  startPort: number,
  host: string,
  maxAttempts = 15,
) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidatePort = startPort + offset;
    const didListen = await new Promise<boolean>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE") {
          resolve(false);
          return;
        }
        reject(error);
      };

      const onListening = () => {
        server.off("error", onError);
        resolve(true);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(candidatePort, host);
    });

    if (didListen) {
      return candidatePort;
    }
  }

  throw new Error(`Unable to find an open port starting at ${startPort}.`);
}

async function startServer() {
  const app = express();
  const requestedPort = Number(process.env.PORT ?? 3000);
  const HOST = process.env.HOST ?? "0.0.0.0";
  const httpServer = createHttpServer(app);

  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "local-ai-content-copilot" });
  });

  // Local proxy to fetch YouTube captions — no AI, just public data retrieval.
  // This avoids CORS issues while keeping all AI processing in the browser.
  app.get("/api/youtube-transcript/:videoId", async (req, res) => {
    const { videoId } = req.params;
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      res.status(400).json({ error: "Invalid video ID" });
      return;
    }

    try {
      const pageResponse = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      );

      if (!pageResponse.ok) {
        res.status(502).json({ error: "Failed to fetch YouTube page" });
        return;
      }

      const html = await pageResponse.text();

      // Extract title from page
      const titleMatch = html.match(/<title>([^<]*)<\/title>/);
      const title = titleMatch
        ? titleMatch[1].replace(/ - YouTube$/, "").trim()
        : "YouTube Video";

      // Try to find caption tracks in the page data
      const captionMatch = html.match(
        /"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s,
      );

      if (!captionMatch) {
        // Fallback: try to get from ytInitialPlayerResponse
        const playerMatch = html.match(
          /ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*(?:var|<\/script)/s,
        );

        if (playerMatch) {
          try {
            const playerData = JSON.parse(playerMatch[1]);
            const tracks =
              playerData?.captions?.playerCaptionsTracklistRenderer
                ?.captionTracks;
            if (tracks && tracks.length > 0) {
              const track =
                tracks.find(
                  (t: { languageCode?: string }) => t.languageCode === "en",
                ) || tracks[0];
              const captionUrl = track.baseUrl;

              if (captionUrl) {
                const captionResponse = await fetch(captionUrl);
                const captionXml = await captionResponse.text();
                const transcript = captionXml
                  .replace(/<[^>]+>/g, "")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\s+/g, " ")
                  .trim();

                res.json({ transcript, title, videoId });
                return;
              }
            }
          } catch {
            // JSON parse failed, continue to fallback
          }
        }

        res.json({ transcript: "", title, videoId, note: "No captions found for this video." });
        return;
      }

      // Parse caption tracks from the matched JSON
      try {
        const captionJson = JSON.parse(
          `{${captionMatch[1].slice(captionMatch[1].indexOf('"playerCaptionsTracklistRenderer"'))}}`,
        );
        const tracks =
          captionJson?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!tracks || tracks.length === 0) {
          res.json({ transcript: "", title, videoId, note: "No captions found." });
          return;
        }

        const track =
          tracks.find(
            (t: { languageCode?: string }) => t.languageCode === "en",
          ) || tracks[0];
        const captionUrl = track.baseUrl;

        if (!captionUrl) {
          res.json({ transcript: "", title, videoId, note: "Caption URL not available." });
          return;
        }

        const captionResponse = await fetch(captionUrl);
        const captionXml = await captionResponse.text();
        const transcript = captionXml
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim();

        res.json({ transcript, title, videoId });
      } catch {
        res.json({ transcript: "", title, videoId, note: "Failed to parse captions." });
      }
    } catch (error) {
      console.error("YouTube transcript proxy error:", error);
      res.status(500).json({ error: "Internal error fetching transcript" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.join(process.cwd(), "frontend"),
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "frontend", "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const activePort = await listenWithRetry(httpServer, requestedPort, HOST);
  if (activePort !== requestedPort) {
    console.warn(`Port ${requestedPort} was busy, so the dev server moved to ${activePort}.`);
  }

  console.log(`Server running on http://localhost:${activePort}`);
}

void startServer();
