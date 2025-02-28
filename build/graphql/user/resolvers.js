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
exports.resolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const services_1 = __importDefault(require("../../services"));
const pubsub = new graphql_subscriptions_1.PubSub();
//queries
const resolverQueries = {
    getAllUsers: () => __awaiter(void 0, void 0, void 0, function* () {
        const users = yield services_1.default.getAllUsers();
        return users;
    }),
    getCurrentUser: (_, params, context) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("context:", context.user);
        if (context && context.user) {
            const user = yield services_1.default.getUserById(context.user.id);
            console.log("Context", context.user);
            return user;
        }
        throw new Error("Could not find user ");
    }),
    getUserToken: (_1, payload_1, _a) => __awaiter(void 0, [_1, payload_1, _a], void 0, function* (_, payload, { res }) {
        const token = yield services_1.default.getUserToken({
            email: payload.email,
            password: payload.password,
        });
        // console.log(token);
        res.cookie("token", token, {
            httpOnly: true, // Prevent access from JavaScript
            // secure: false, // Use HTTPS in production
            sameSite: "strict", // CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
        });
        return token;
    }),
    getAllBookRequests: () => __awaiter(void 0, void 0, void 0, function* () {
        const bookrequests = yield services_1.default.getAllBookRequests();
        return bookrequests;
    }),
    getBookRequest: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { bookRequestId }) {
        if (!bookRequestId)
            throw new Error("Request ID is missing");
        // console.log("ID: ", bookRequestId)
        const bookrequest = yield services_1.default.getBookRequestById(bookRequestId);
        return bookrequest;
    }),
    getUserMessages: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { userId }) {
        const messages = yield services_1.default.getUserMessages(userId);
        // console.log(messages)
        // console.log(JSON.stringify(messages, null, 2));
        if (!messages)
            throw new Error("Failed to fetched user messages");
        return messages;
    }),
};
//mutations
const resolverMutations = {
    createUser: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield services_1.default.createUser(payload);
        return user;
    }),
    signOut: (_1, parameters_1, _a) => __awaiter(void 0, [_1, parameters_1, _a], void 0, function* (_, parameters, { res }) {
        res.clearCookie("token", {
            httpOnly: true,
            sameSite: "strict",
        });
        return "Logged out successfully!";
    }),
    createBookRequest: (_, payload, context) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(payload);
        if (context && context.user) {
            const bookRequest = yield services_1.default.createBookRequest(payload, context.user.id);
            return bookRequest;
        }
        else
            throw new Error("No user logged in");
    }),
    acceptBookRequest: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId }, context) {
        const updatedRequest = yield services_1.default.acceptBookRequest(bookRequestId, context.user.id);
        if (!updatedRequest)
            throw new Error("Failed to update book request");
        return "Request accepted successfully!";
    }),
    sendMessage: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        const message = yield services_1.default.sendMessage(payload);
        if (!message.id)
            throw new Error("Message not sent");
        pubsub.publish(`ROOM_${message.roomId}`, { newMessage: message });
        return `Message sent!`;
    }),
    completeDelivery: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId }, context) {
        if (!context || !context.user)
            throw new Error("User not authorised");
        return services_1.default.completeDelivery(bookRequestId);
    }),
};
const resolverSubscriptions = {
    //notifying room members of new message
    newMessage: {
        subscribe: (0, graphql_subscriptions_1.withFilter)((_, parameters, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context && !context.user)
                throw new Error("user is not authenticated");
            const rooms = yield services_1.default.getUserRoomIds(context.user.id);
            const iterators = rooms.map((room) => pubsub.asyncIterableIterator(`ROOM_${room.roomId}`));
            return mergeAsyncIterators(iterators);
        }), (payload, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context && !context.user)
                throw new Error("user is not authenticated");
            const rooms = yield services_1.default.getUserRoomIds(context.user.id);
            return rooms.some((room) => room.roomId === payload.newMessage.roomId);
        })),
    },
};
function mergeAsyncIterators(iterators) {
    return {
        next() {
            return __awaiter(this, void 0, void 0, function* () {
                return Promise.race(iterators.map((it) => it.next())); // Waits for the first message
            });
        },
        return() {
            return __awaiter(this, void 0, void 0, function* () {
                yield Promise.all(iterators.map((it) => { var _a; return (_a = it.return) === null || _a === void 0 ? void 0 : _a.call(it); }));
                return { done: true, value: undefined };
            });
        },
        throw(error) {
            return __awaiter(this, void 0, void 0, function* () {
                yield Promise.all(iterators.map((it) => { var _a; return (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, error); }));
                return { done: true, value: undefined };
            });
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
exports.resolvers = {
    resolverQueries,
    resolverMutations,
    resolverSubscriptions,
};
