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
const nodemailer_1 = require("../../lib/nodemailer");
const pubsub = new graphql_subscriptions_1.PubSub();
//queries
const resolverQueries = {
    getAllUsers: () => __awaiter(void 0, void 0, void 0, function* () {
        const users = yield services_1.default.getAllUsers();
        return users;
    }),
    getCurrentUser: (_, params, context) => __awaiter(void 0, void 0, void 0, function* () {
        // console.log("context:", context.user);
        if (context && context.user) {
            const user = yield services_1.default.getUserById(context.user.id);
            // console.log("Context", context.user);
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
            httpOnly: false, // Prevent access from JavaScript
            secure: false, // Use HTTPS in production
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
    viewWishlist: (_, parameters, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context || !context.user)
            throw new Error("User not authorised");
        const list = yield services_1.default.viewUserWishlist(context.user.id);
        return list;
    }),
    getUserById: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { userId }) {
        const user = yield services_1.default.getUserById(userId);
        return user;
    }),
    getRoomMessages: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { roomId, page }) {
        const messages = yield services_1.default.getRoomMessages(roomId, page);
        // console.log(messages)
        return messages;
    }),
    getUserRoomIds: (_, parameters, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context || !context.user)
            throw new Error("User unauthorized!");
        const roomIds = yield services_1.default.getUserRoomIds(context.user.id);
        return roomIds;
    }),
};
//mutations
const resolverMutations = {
    createUser: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield services_1.default.createUser(payload);
        return user;
    }),
    verifyUser: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        const verifiedUser = yield services_1.default.verifyUser(payload);
        return verifiedUser;
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
    approveBookRequest: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId, deliverTo, otp, }, context) {
        if (!context || !context.user)
            throw new Error("User not authorised");
        const updatedRequest = yield services_1.default.approveBookRequest(bookRequestId, context.user.id, deliverTo, otp);
        if (!updatedRequest)
            throw new Error("Failed to update book request");
        return "Request accepted successfully!";
    }),
    confirmBookRequest: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId, otp }, context) {
        if (!context || !context.user)
            throw new Error("User not authorized!");
        const updatedRequest = yield services_1.default.confirmRequest(bookRequestId, otp, context.user.id);
        const bookOwner = yield services_1.default.getUserById(updatedRequest.ownerId);
        if (bookOwner && updatedRequest) {
            const sentMail = yield (0, nodemailer_1.sendBuyerRequestConfirmationEmail)(bookOwner === null || bookOwner === void 0 ? void 0 : bookOwner.firstName, context.user.firstName + context.user.lastName, context.user.id, 
            //@ts-ignore
            updatedRequest.deliverTo, updatedRequest.title, bookOwner === null || bookOwner === void 0 ? void 0 : bookOwner.email);
            if (!sentMail)
                throw new Error("Something wrong happened while sending book owner email");
        }
        return "Order confirmed";
    }),
    sendMessage: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        const message = yield services_1.default.sendMessage(payload);
        if (!message.id)
            throw new Error("Message not sent");
        // pubsub.publish(`ROOM_${message.roomId}`, { newMessage: message });
        pubsub.publish(`ROOM_${message.roomId}`, { newMessage: message });
        console.log(`message published to ROOM_${message.roomId}`);
        return message;
    }),
    completeDelivery: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId }, context) {
        if (!context || !context.user)
            throw new Error("User not authorised");
        return services_1.default.completeDelivery(bookRequestId);
    }),
    addToWishlist: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId }, context) {
        if (!bookRequestId)
            throw new Error("Book request ID is missing");
        if (!context || !context.user)
            throw new Error("User not authorised");
        const addedBook = yield services_1.default.addToWishlist(context.user.id, bookRequestId);
        console.log(addedBook);
        return "Book added to playlist!";
    }),
    removeFromWishlist: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { bookRequestId }, context) {
        if (!bookRequestId)
            throw new Error("Book request ID is missing");
        if (!context || !context.user)
            throw new Error("User not authorised");
        const addedBook = services_1.default.removeFromWishlist(context.user.id, bookRequestId);
        return "Book removed from playlist!";
    }),
    updateUserAvatar: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { imgUrl }, context) {
        console.log("img from resolver: ", imgUrl);
        if (context && context.user) {
            try {
                const updatedUser = yield services_1.default.updateAvatar(context.user.id, imgUrl);
                if (!updatedUser)
                    throw new Error("Failed to update user avatar");
                return "User avatar updated successfully!";
            }
            catch (error) {
                console.log("Error while updating user avatar: ", error);
                return "Could not update user avatar";
            }
        }
    }),
};
//subscriptions
const resolverSubscriptions = {
    //notifying room members of new message
    newMessage: {
        subscribe: (0, graphql_subscriptions_1.withFilter)((_, parameters, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context && !context.user)
                throw new Error("user is not authenticated");
            const rooms = yield services_1.default.getUserRoomIds(context.user.id);
            console.log("subscribing to all rooms");
            const iterators = rooms.map((room) => pubsub.asyncIterableIterator(`ROOM_${room.roomId}`));
            return mergeAsyncIterators(iterators);
        }), (payload, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context && !context.user)
                throw new Error("user is not authenticated");
            // console.log("message", payload);
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
