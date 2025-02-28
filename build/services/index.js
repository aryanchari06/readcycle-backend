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
const db_1 = require("../lib/db");
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
class UserServices {
    static getAllUsers() {
        return db_1.prismaClient.user.findMany();
    }
    static hashPassword(password, salt) {
        return (0, node_crypto_1.createHmac)("sha256", salt).update(password).digest("hex");
    }
    static decodeJWTToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.AUTH_SECRET)
                throw new Error("Auth secret is missing");
            return jsonwebtoken_1.default.verify(token, process.env.AUTH_SECRET);
        });
    }
    static createUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { firstName, lastName, email, password, avatar } = payload;
            const salt = (0, node_crypto_1.randomBytes)(32).toString("hex");
            const hashedPassword = UserServices.hashPassword(password, salt);
            try {
                if (!firstName || !lastName || !email || !password)
                    throw new Error("All fields are required!");
                const user = yield db_1.prismaClient.user.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        password: hashedPassword,
                        avatar,
                        salt,
                    },
                });
                if (!user)
                    throw new Error("User creation failed unexpectedly.");
                return user.id;
            }
            catch (error) {
                console.log("Error while creating user: ", error);
                throw new Error("Failed to create new user");
            }
        });
    }
    static getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return db_1.prismaClient.user.findUnique({ where: { email } });
        });
    }
    static getUserToken(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = payload;
            const user = yield UserServices.getUserByEmail(email);
            if (!user)
                throw new Error("User not found: 404");
            const userSalt = user === null || user === void 0 ? void 0 : user.salt;
            const usersHashedPassword = UserServices.hashPassword(password, userSalt);
            if (usersHashedPassword !== user.password)
                throw new Error("Incorrect password");
            if (!process.env.AUTH_SECRET)
                throw new Error("Auth secret is missing");
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.AUTH_SECRET, { expiresIn: "1d" });
            return token;
        });
    }
    static getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prismaClient.user.findUnique({ where: { id: userId } });
            return user;
        });
    }
    static createBookRequest(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { title, author, genre, media } = payload;
            if (!title || !genre || !media)
                throw new Error("All fields are required");
            const genreEnum = genre;
            // Validate that the genre is a valid enum value
            if (!Object.values(client_1.Genre).includes(genreEnum)) {
                throw new Error(`Invalid genre: ${genre}`);
            }
            try {
                const request = yield db_1.prismaClient.bookRequest.create({
                    data: {
                        title,
                        author,
                        ownerId: userId,
                        genre: genreEnum,
                        media,
                    },
                });
                return request.id;
            }
            catch (error) {
                console.error("Error creating new book request: ", error);
                throw new Error("Failed to create book request");
            }
        });
    }
    static acceptBookRequest(requestId, buyerId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!requestId)
                throw new Error("Request ID is missing!");
            const updatedRequest = yield db_1.prismaClient.bookRequest.update({
                where: { id: requestId },
                data: { status: "APPROVED", buyerId },
            });
            return updatedRequest;
        });
    }
    static getAllBookRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield db_1.prismaClient.bookRequest.findMany({
                include: {
                    owner: true, // Ensures Prisma fetches the owner
                },
            });
        });
    }
    static getBookRequestById(bookRequestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield db_1.prismaClient.bookRequest.findUnique({
                where: { id: bookRequestId },
                include: {
                    owner: true,
                    buyer: true,
                },
            });
            console.log(request);
            return request;
        });
    }
    static getUserRoomIds(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const roomIds = yield db_1.prismaClient.message.groupBy({
                by: "roomId",
                where: {
                    OR: [{ receiverId: userId }, { senderId: userId }],
                },
            });
            return roomIds;
        });
    }
    static sendMessage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { content, receiverId, senderId, roomId } = payload;
            if (!content || !receiverId || !senderId || !roomId)
                throw new Error("All fields are required!");
            const message = yield db_1.prismaClient.message.create({
                data: {
                    content,
                    receiverId,
                    senderId,
                    roomId,
                },
            });
            return message;
        });
    }
    static getUserMessages(userId, lastMessageIds // Store lastMessageId per room
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            const rooms = yield UserServices.getUserRoomIds(userId);
            const roomIds = rooms.map((room) => room.roomId);
            if (roomIds.length === 0)
                return [];
            const messages = yield Promise.all(roomIds.map((roomId) => __awaiter(this, void 0, void 0, function* () {
                const pageSize = 10;
                const lastMessageId = lastMessageIds === null || lastMessageIds === void 0 ? void 0 : lastMessageIds[roomId]; // Get lastMessageId per room
                const roomMessages = yield db_1.prismaClient.message.findMany(Object.assign(Object.assign({ where: { roomId }, orderBy: { timestamp: "desc" }, take: pageSize }, (lastMessageId && {
                    cursor: { id: lastMessageId },
                    skip: 1,
                })), { include: {
                        sender: { select: { email: true, firstName: true, avatar: true } },
                        receiver: { select: { email: true, firstName: true, avatar: true } },
                    } }));
                return roomMessages.length > 0 ? { roomId, messages: roomMessages } : null;
            })));
            return messages.filter(Boolean);
        });
    }
    static completeDelivery(bookRequestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedRequest = yield db_1.prismaClient.bookRequest.update({
                where: { id: bookRequestId },
                data: { status: "COMPLETED" },
            });
            if (!updatedRequest)
                throw new Error("There was an error while updating the request");
            return "Delivery complete!";
        });
    }
}
exports.default = UserServices;
