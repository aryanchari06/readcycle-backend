"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_1 = __importDefault(require("./graphql"));
const express4_1 = require("@apollo/server/express4");
const services_1 = __importDefault(require("./services"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const ws_1 = require("ws");
const http_1 = require("http");
const ws_2 = require("graphql-ws/lib/use/ws");
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        const PORT = process.env.PORT || 8000;
        const httpServer = (0, http_1.createServer)(app);
        app.use((0, cors_1.default)({
            origin: "http://localhost:3000", // Allow requests from your frontend
            credentials: true // Allow cookies if needed
        }));
        app.get("/", (req, res) => {
            res.end("Hi from server");
        });
        app.use(express_1.default.json());
        app.use((0, cookie_parser_1.default)());
        const { gqlServer, schema } = yield (0, graphql_1.default)();
        app.use("/graphql", (0, express4_1.expressMiddleware)(gqlServer, {
            context: (_a) => __awaiter(this, [_a], void 0, function* ({ req, res }) {
                const token = yield req.cookies.token; // Read token from cookies
                // console.log(req.cookies);
                // console.log('token:', token)
                if (!token)
                    return { user: null, res };
                try {
                    const user = yield services_1.default.decodeJWTToken(token);
                    req.headers["sec-websocket-protocol"] = token;
                    return { user, res };
                }
                catch (error) {
                    return { user: null, res };
                }
            }),
        }));
        const wsServer = new ws_1.WebSocketServer({
            server: httpServer,
            path: "/graphql",
        });
        (0, ws_2.useServer)({
            schema,
            context: (ctx) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const req = ctx.extra.request; // Access the WebSocket request object
                // console.log(req.headers.cookie?.slice(6))
                // const token = req.headers["sec-websocket-protocol"]; // Read token
                const rawToken = (_a = req.headers.cookie) === null || _a === void 0 ? void 0 : _a.slice(6); // Read token
                // console.log(rawToken)
                const tempToken = rawToken === null || rawToken === void 0 ? void 0 : rawToken.split(";");
                // @ts-ignore
                const token = tempToken[0];
                // console.log("Token: ", token)
                if (!token)
                    return { user: null };
                try {
                    const decoded = yield services_1.default.decodeJWTToken(token);
                    return { user: decoded };
                }
                catch (error) {
                    console.error("Invalid WebSocket token", error);
                    return { user: null };
                }
            }),
        }, wsServer);
        httpServer.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`);
        });
    });
}
init();
