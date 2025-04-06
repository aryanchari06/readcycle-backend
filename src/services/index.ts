import { prismaClient } from "../lib/db";
import { createHmac, randomBytes } from "node:crypto";
import JWT from "jsonwebtoken";
import { Genre } from "@prisma/client";
import {
  sendRequestApprovalEmail,
  sendVerificationEmail,
} from "../lib/nodemailer";

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatar: string;
}

export interface VerifyUserPayload {
  email: string;
  verifyCode: string;
}

export interface GetUserTokenPayload {
  email: string;
  password: string;
}

export interface createBookRequestPayload {
  title: string;
  author: string;
  genre: string;
  media: string[];
  description: string;
  price: number;
}

export interface sendMessagePayload {
  senderId: string;
  receiverId: string;
  content: string;
  roomId: string;
}

class UserServices {
  public static getAllUsers() {
    return prismaClient.user.findMany();
  }

  private static hashPassword(password: string, salt: string) {
    return createHmac("sha256", salt).update(password).digest("hex");
  }

  public static async decodeJWTToken(token: string) {
    if (!process.env.AUTH_SECRET) throw new Error("Auth secret is missing");
    return JWT.verify(token, process.env.AUTH_SECRET);
  }

  public static async createUser(payload: CreateUserPayload) {
    const { firstName, lastName, email, password, avatar } = payload;

    const user = await UserServices.getUserByEmail(email);
    if (user?.id) throw new Error("User already exists");

    const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString();

    const salt = randomBytes(32).toString("hex");
    const hashedPassword = UserServices.hashPassword(password, salt);
    try {
      if (!firstName || !lastName || !email || !password)
        throw new Error("All fields are required!");
      const user = await prismaClient.user.create({
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

      if (!user) throw new Error("User creation failed unexpectedly.");

      const sentVerificationEmail = await sendVerificationEmail(
        firstName,
        email,
        verifyCode
      );

      console.log("verificationemail data:", sentVerificationEmail);

      if (!sentVerificationEmail.ok)
        throw new Error("Failed to send verification email to the user");

      return user.id;
    } catch (error) {
      console.log("Error while creating user: ", error);
      throw new Error("Failed to create new user");
    }
  }

  public static async verifyUser(payload: VerifyUserPayload) {
    const { email, verifyCode } = payload;
    const user = await UserServices.getUserByEmail(email);
    if (user?.verifyCode !== verifyCode)
      throw new Error("Incorrect Verification Code");
    const verifiedUser = await prismaClient.user.update({
      where: { email },
      data: { isVerified: true },
    });

    return verifiedUser.id;
  }

  public static async getUserByEmail(email: string) {
    return prismaClient.user.findUnique({ where: { email } });
  }

  public static async getUserToken(payload: GetUserTokenPayload) {
    const { email, password } = payload;
    const user = await UserServices.getUserByEmail(email);
    if (!user) throw new Error("User not found: 404");

    const userSalt = user?.salt;
    const usersHashedPassword = UserServices.hashPassword(password, userSalt);

    if (usersHashedPassword !== user.password)
      throw new Error("Incorrect password");

    if (!process.env.AUTH_SECRET) throw new Error("Auth secret is missing");
    const token = JWT.sign(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        avatar: user.avatar,
      },
      process.env.AUTH_SECRET,
      { expiresIn: "1d" }
    );

    return token;
  }

  public static async getUserById(userId: string) {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        bookrequests: true,
      },
    });
    return user;
  }

  public static async createBookRequest(
    payload: createBookRequestPayload,
    userId: string
  ) {
    const { title, author, genre, media, description, price } = payload;
    if (!title || !genre || !media || !description)
      throw new Error("All fields are required");

    const genreEnum = genre as Genre;

    // Validate that the genre is a valid enum value
    if (!Object.values(Genre).includes(genreEnum)) {
      throw new Error(`Invalid genre: ${genre}`);
    }

    try {
      const otp = Math.floor(Math.random() * 900000 + 100000).toString();
      const request = await prismaClient.bookRequest.create({
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
    } catch (error) {
      console.error("Error creating new book request: ", error);
      throw new Error("Failed to create book request");
    }
  }

  public static async approveBookRequest(
    requestId: string,
    buyerId: string,
    deliverTo: string,
    otp: string
  ) {
    if (!requestId) throw new Error("Request ID is missing!");

    const updatedRequest = await prismaClient.bookRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", buyerId, deliverTo },
    });

    if (!updatedRequest) throw new Error("Failed to update request");

    const user = await UserServices.getUserById(buyerId);

    if (!user) throw new Error("User not found");

    const sentEmail = await sendRequestApprovalEmail(
      user.firstName,
      user.email,
      otp,
      deliverTo,
      updatedRequest.title
    );

    console.log("verificationemail data:", sentEmail);

    if (!sentEmail.ok)
      throw new Error("Failed to send approval email to the user");

    return updatedRequest;
  }

  public static async confirmRequest(
    bookRequestId: string,
    otp: string,
    userId: string
  ) {
    const bookrequest = await UserServices.getBookRequestById(bookRequestId);

    if (!bookrequest) throw new Error("Book does not exist");

    if (userId !== bookrequest.buyerId) throw new Error("Invalid buyer id");

    if (bookrequest.otp !== otp) throw new Error("Incorrect OTP");

    const updatedRequest = await prismaClient.bookRequest.update({
      where: { id: bookRequestId },
      data: { status: "ONGOING" },
    });

    return updatedRequest;
  }

  public static async getAllBookRequests() {
    return await prismaClient.bookRequest.findMany({
      include: {
        owner: true, // Ensures Prisma fetches the owner
      },
    });
  }

  public static async getBookRequestById(bookRequestId: string) {
    const request = await prismaClient.bookRequest.findUnique({
      where: { id: bookRequestId },
      include: {
        owner: true,
        buyer: true,
      },
    });
    console.log(request);
    return request;
  }

  public static async getUserRoomIds(userId: string) {
    const roomIds = await prismaClient.message.groupBy({
      by: "roomId",
      where: {
        OR: [{ receiverId: userId }, { senderId: userId }],
      },
    });

    return roomIds;
  }

  public static async sendMessage(payload: sendMessagePayload) {
    const { content, receiverId, senderId, roomId } = payload;

    if (!content || !receiverId || !senderId || !roomId)
      throw new Error("All fields are required!");

    const message = await prismaClient.message.create({
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
  }

  public static async getUserMessages(
    userId: string,
    lastMessageIds?: Record<string, string> // Store lastMessageId per room
  ) {
    const rooms = await UserServices.getUserRoomIds(userId);
    const roomIds = rooms.map((room) => room.roomId);

    if (roomIds.length === 0) return [];

    const messages = await Promise.all(
      roomIds.map(async (roomId) => {
        const pageSize = 10;
        const lastMessageId = lastMessageIds?.[roomId]; // Get lastMessageId per room

        const roomMessages = await prismaClient.message.findMany({
          where: { roomId },
          orderBy: { timestamp: "desc" },
          take: pageSize,
          ...(lastMessageId && {
            cursor: { id: lastMessageId },
            skip: 1,
          }),
          include: {
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
          },
        });

        return roomMessages.length > 0
          ? { roomId, messages: roomMessages }
          : null;
      })
    );

    return messages.filter(Boolean);
  }

  public static async completeDelivery(bookRequestId: string) {
    const updatedRequest = await prismaClient.bookRequest.update({
      where: { id: bookRequestId },
      data: { status: "COMPLETED" },
    });

    if (!updatedRequest)
      throw new Error("There was an error while updating the request");

    return "Delivery complete!";
  }

  public static async viewUserWishlist(userId: string) {
    const books = await prismaClient.bookRequest.findMany({
      where: { wishListedBy: { some: { userId } } },
      include: {
        owner: true,
      },
    });

    if (!books)
      throw new Error("Something went wrong while fetching user wishlist");

    return books;
  }

  public static async addToWishlist(userId: string, bookRequestId: string) {
    const addedBook = await prismaClient.wishlist.create({
      data: { userId, bookRequestId },
    });

    if (!addedBook) throw new Error("Failed to add book to wishlist");

    return addedBook;
  }

  public static async removeFromWishlist(
    userId: string,
    bookRequestId: string
  ) {
    const removedBook = await prismaClient.wishlist.delete({
      where: {
        userId_bookRequestId: {
          userId: userId,
          bookRequestId: bookRequestId,
        },
      },
    });

    if (!removedBook) throw new Error("Failed to add book to wishlist");

    return removedBook;
  }

  public static async updateAvatar(userId: string, imgUrl: string) {
    console.log("img from service: ", imgUrl);

    const updatedUser = await prismaClient.user.update({
      where: {
        id: userId,
      },
      data: {
        avatar: imgUrl,
      },
    });
    return updatedUser;
  }

  public static async getRoomMessages(roomId: string, page: number) {
    // const page = Number(req.query.page) || 1; // current page number
    const limit = 10; // messages per page
    const offset = (page - 1) * limit;

    const messages = await prismaClient.message.findMany({
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

    if (!messages) throw new Error("Failed to fetch room messages");
    return messages;
  }
}

export default UserServices;
