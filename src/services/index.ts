import { prismaClient } from "../lib/db";
import { createHmac, randomBytes } from "node:crypto";
import JWT from "jsonwebtoken";
import { Genre } from "@prisma/client";

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatar: string;
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
        },
      });

      if (!user) throw new Error("User creation failed unexpectedly.");

      return user.id;
    } catch (error) {
      console.log("Error while creating user: ", error);
      throw new Error("Failed to create new user");
    }
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
      { id: user.id, email: user.email },
      process.env.AUTH_SECRET,
      { expiresIn: "1d" }
    );

    return token;
  }

  public static async getUserById(userId: string) {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    return user;
  }

  public static async createBookRequest(
    payload: createBookRequestPayload,
    userId: string
  ) {
    const { title, author, genre, media } = payload;
    if (!title || !genre || !media) throw new Error("All fields are required");

    const genreEnum = genre as Genre;

    // Validate that the genre is a valid enum value
    if (!Object.values(Genre).includes(genreEnum)) {
      throw new Error(`Invalid genre: ${genre}`);
    }

    try {
      const request = await prismaClient.bookRequest.create({
        data: {
          title,
          author,
          ownerId: userId,
          genre: genreEnum,
          media,
        },
      });

      return request.id;
    } catch (error) {
      console.error("Error creating new book request: ", error);
      throw new Error("Failed to create book request");
    }
  }

  public static async acceptBookRequest(requestId: string, buyerId: string) {
    if (!requestId) throw new Error("Request ID is missing!");

    const updatedRequest = await prismaClient.bookRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", buyerId },
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
            sender: { select: { email: true, firstName: true, avatar: true } },
            receiver: {
              select: { email: true, firstName: true, avatar: true },
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
}

export default UserServices;
