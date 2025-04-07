import express from "express";
import dotenv from "dotenv";
import createApolloServer from "./graphql";
import { expressMiddleware } from "@apollo/server/express4";
import UserServices from "./services";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { useServer } from "graphql-ws/lib/use/ws";
import cors from "cors";

dotenv.config();

async function init() {
  const app = express();
  const PORT = process.env.PORT || 8000;

  const httpServer = createServer(app);

  app.use(
    cors({
      origin: process.env.FRONTEND_URL, // Allow requests from your frontend
      credentials: true, // Allow cookies if needed
    })
  );

  app.get("/", (req, res) => {
    res.end("Hi from server");
  });

  app.use(express.json());
  app.use(cookieParser());

  const { gqlServer, schema } = await createApolloServer();

  //@ts-ignore
  const graphqlMiddleware = await expressMiddleware(gqlServer, {
    context: async ({ req, res }) => {
      const token = req.cookies.token;

      if (!token) return { user: null, res };

      try {
        const user = await UserServices.decodeJWTToken(token);
        req.headers["sec-websocket-protocol"] = token;
        return { user, res };
      } catch (error) {
        return { user: null, res };
      }
    },
  });

  //@ts-ignore
  app.use("/graphql", graphqlMiddleware);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer(
    {
      schema,
      context: async (ctx) => {
        const req = ctx.extra.request;
        const cookieHeader = req.headers.cookie;

        let token = null;

        if (cookieHeader) {
          const cookies = Object.fromEntries(
            cookieHeader.split(";").map((cookie) => {
              const [key, value] = cookie.trim().split("=");
              return [key, value];
            })
          );
          token = cookies.token;
        }

        if (!token) return { user: null };

        try {
          const decoded = await UserServices.decodeJWTToken(token);
          return { user: decoded };
        } catch (error) {
          console.error("Invalid WebSocket token", error);
          return { user: null };
        }
      },
    },
    wsServer
  );

  httpServer.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}

init();
