import express from "express";
import dotenv from "dotenv";
import createApolloServer from "./graphql";
import { expressMiddleware } from "@apollo/server/express4";
import UserServices from "./services";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { useServer } from "graphql-ws/lib/use/ws";
import cors from 'cors'

dotenv.config();

async function init() {
  const app = express();
  const PORT = process.env.PORT || 8000;

  const httpServer = createServer(app);

  app.use(cors({
    origin: "http://localhost:3000", // Allow requests from your frontend
    credentials: true // Allow cookies if needed
  }));

  app.get("/", (req, res) => {
    res.end("Hi from server");
  });

  app.use(express.json());
  app.use(cookieParser());

  const { gqlServer, schema } = await createApolloServer();
  app.use(
    "/graphql",
    expressMiddleware(gqlServer, {
      context: async ({ req, res }) => {
        const token = await req.cookies.token; // Read token from cookies
        // console.log(req.cookies);
        // console.log('token:', token)

        if (!token) return { user: null, res };

        try {
          const user = await UserServices.decodeJWTToken(token);
          req.headers["sec-websocket-protocol"] = token;
          return { user, res };
        } catch (error) {
          return { user: null, res };
        }
      },
    })
  );

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer(
    {
      schema,
      context: async (ctx) => {
        const req = ctx.extra.request; // Access the WebSocket request object
        // console.log(req.headers.cookie?.slice(6))


        // const token = req.headers["sec-websocket-protocol"]; // Read token
        const rawToken = req.headers.cookie?.slice(6); // Read token
        // console.log(rawToken)
        const tempToken = rawToken?.split(";")
        // @ts-ignore
        const token = tempToken[0]
        // console.log("Token: ", token)
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
