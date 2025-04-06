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
const nodemailer_1 = require("../lib/nodemailer");
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
            const user = yield UserServices.getUserByEmail(email);
            if (user === null || user === void 0 ? void 0 : user.id)
                throw new Error("User already exists");
            const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString();
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
                        verifyCode,
                        isVerified: false,
                    },
                });
                if (!user)
                    throw new Error("User creation failed unexpectedly.");
                const sentVerificationEmail = yield (0, nodemailer_1.sendVerificationEmail)(firstName, email, verifyCode);
                console.log("verificationemail data:", sentVerificationEmail);
                if (!sentVerificationEmail.ok)
                    throw new Error("Failed to send verification email to the user");
                return user.id;
            }
            catch (error) {
                console.log("Error while creating user: ", error);
                throw new Error("Failed to create new user");
            }
        });
    }
    static verifyUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, verifyCode } = payload;
            const user = yield UserServices.getUserByEmail(email);
            if ((user === null || user === void 0 ? void 0 : user.verifyCode) !== verifyCode)
                throw new Error("Incorrect Verification Code");
            const verifiedUser = yield db_1.prismaClient.user.update({
                where: { email },
                data: { isVerified: true },
            });
            return verifiedUser.id;
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
            const token = jsonwebtoken_1.default.sign({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isVerified: user.isVerified,
                avatar: user.avatar,
            }, process.env.AUTH_SECRET, { expiresIn: "1d" });
            return token;
        });
    }
    static getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prismaClient.user.findUnique({
                where: { id: userId },
                include: {
                    bookrequests: true,
                },
            });
            return user;
        });
    }
    static createBookRequest(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { title, author, genre, media, description, price } = payload;
            if (!title || !genre || !media || !description)
                throw new Error("All fields are required");
            const genreEnum = genre;
            // Validate that the genre is a valid enum value
            if (!Object.values(client_1.Genre).includes(genreEnum)) {
                throw new Error(`Invalid genre: ${genre}`);
            }
            try {
                const otp = Math.floor(Math.random() * 900000 + 100000).toString();
                const request = yield db_1.prismaClient.bookRequest.create({
                    data: {
                        title,
                        author,
                        ownerId: userId,
                        genre: genreEnum,
                        description,
                        media,
                        otp,
                        price,
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
    static approveBookRequest(requestId, buyerId, deliverTo, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!requestId)
                throw new Error("Request ID is missing!");
            const updatedRequest = yield db_1.prismaClient.bookRequest.update({
                where: { id: requestId },
                data: { status: "APPROVED", buyerId, deliverTo },
            });
            if (!updatedRequest)
                throw new Error("Failed to update request");
            const user = yield UserServices.getUserById(buyerId);
            if (!user)
                throw new Error("User not found");
            const sentEmail = yield (0, nodemailer_1.sendRequestApprovalEmail)(user.firstName, user.email, otp, deliverTo, updatedRequest.title);
            console.log("verificationemail data:", sentEmail);
            if (!sentEmail.ok)
                throw new Error("Failed to send approval email to the user");
            return updatedRequest;
        });
    }
    static confirmRequest(bookRequestId, otp, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const bookrequest = yield UserServices.getBookRequestById(bookRequestId);
            if (!bookrequest)
                throw new Error("Book does not exist");
            if (userId !== bookrequest.buyerId)
                throw new Error("Invalid buyer id");
            if (bookrequest.otp !== otp)
                throw new Error("Incorrect OTP");
            const updatedRequest = yield db_1.prismaClient.bookRequest.update({
                where: { id: bookRequestId },
                data: { status: "ONGOING" },
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
                include: {
                    receiver: true,
                    sender: true,
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
                        sender: {
                            select: {
                                email: true,
                                firstName: true,
                                avatar: true,
                                id: true,
                                lastName: true,
                            },
                        },
                        receiver: {
                            select: {
                                email: true,
                                firstName: true,
                                avatar: true,
                                id: true,
                                lastName: true,
                            },
                        },
                    } }));
                return roomMessages.length > 0
                    ? { roomId, messages: roomMessages }
                    : null;
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
    static viewUserWishlist(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const books = yield db_1.prismaClient.bookRequest.findMany({
                where: { wishListedBy: { some: { userId } } },
                include: {
                    owner: true,
                },
            });
            if (!books)
                throw new Error("Something went wrong while fetching user wishlist");
            return books;
        });
    }
    static addToWishlist(userId, bookRequestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const addedBook = yield db_1.prismaClient.wishlist.create({
                data: { userId, bookRequestId },
            });
            if (!addedBook)
                throw new Error("Failed to add book to wishlist");
            return addedBook;
        });
    }
    static removeFromWishlist(userId, bookRequestId) {
        return __awaiter(this, void 0, void 0, function* () {
            const removedBook = yield db_1.prismaClient.wishlist.delete({
                where: {
                    userId_bookRequestId: {
                        userId: userId,
                        bookRequestId: bookRequestId,
                    },
                },
            });
            if (!removedBook)
                throw new Error("Failed to add book to wishlist");
            return removedBook;
        });
    }
    static updateAvatar(userId, imgUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("img from service: ", imgUrl);
            const updatedUser = yield db_1.prismaClient.user.update({
                where: {
                    id: userId,
                },
                data: {
                    avatar: imgUrl,
                },
            });
            return updatedUser;
        });
    }
    static getRoomMessages(roomId, page) {
        return __awaiter(this, void 0, void 0, function* () {
            // const page = Number(req.query.page) || 1; // current page number
            const limit = 10; // messages per page
            const offset = (page - 1) * limit;
            const messages = yield db_1.prismaClient.message.findMany({
                where: { roomId },
                include: {
                    sender: true,
                    receiver: true,
                },
                orderBy: {
                    timestamp: "desc", // fetch latest messages first
                },
                skip: offset,
                take: limit,
            });
            if (!messages)
                throw new Error("Failed to fetch room messages");
            return messages;
        });
    }
}
exports.default = UserServices;
