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
