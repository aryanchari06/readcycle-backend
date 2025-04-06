import { PubSub, withFilter } from "graphql-subscriptions";
import UserServices, {
  createBookRequestPayload,
  sendMessagePayload,
  VerifyUserPayload,
} from "../../services";
import { CreateUserPayload, GetUserTokenPayload } from "../../services";
import { Response } from "express";
import { sendBuyerRequestConfirmationEmail } from "../../lib/nodemailer";

const pubsub = new PubSub();

//queries
const resolverQueries = {
  getAllUsers: async () => {
    const users = await UserServices.getAllUsers();
    return users;
  },
  getCurrentUser: async (_: any, params: any, context: any) => {
    // console.log("context:", context.user);
    if (context && context.user) {
      const user = await UserServices.getUserById(context.user.id);
      // console.log("Context", context.user);
      return user;
    }
    throw new Error("Could not find user ");
  },
  getUserToken: async (
    _: any,
    payload: GetUserTokenPayload,
    { res }: { res: Response }
  ) => {
    const token = await UserServices.getUserToken({
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
  },
  getAllBookRequests: async () => {
    const bookrequests = await UserServices.getAllBookRequests();
    return bookrequests;
  },
  getBookRequest: async (
    _: any,
    { bookRequestId }: { bookRequestId: string }
  ) => {
    if (!bookRequestId) throw new Error("Request ID is missing");
    // console.log("ID: ", bookRequestId)
    const bookrequest = await UserServices.getBookRequestById(bookRequestId);
    return bookrequest;
  },
  getUserMessages: async (_: any, { userId }: { userId: string }) => {
    const messages = await UserServices.getUserMessages(userId);

    // console.log(messages)
    // console.log(JSON.stringify(messages, null, 2));

    if (!messages) throw new Error("Failed to fetched user messages");

    return messages;
  },
  viewWishlist: async (_: any, parameters: any, context: any) => {
    if (!context || !context.user) throw new Error("User not authorised");

    const list = await UserServices.viewUserWishlist(context.user.id);
    return list;
  },
  getUserById: async (_: any, { userId }: { userId: string }) => {
    const user = await UserServices.getUserById(userId);
    return user;
  },
  getRoomMessages: async (
    _: any,
    { roomId, page }: { roomId: string; page: number }
  ) => {
    const messages = await UserServices.getRoomMessages(roomId, page);
    // console.log(messages)
    return messages;
  },
  getUserRoomIds: async (_: any, parameters: any, context: any) => {
    if (!context || !context.user) throw new Error("User unauthorized!");
    const roomIds = await UserServices.getUserRoomIds(context.user.id);
    return roomIds;
  },
};

//mutations
const resolverMutations = {
  createUser: async (_: any, payload: CreateUserPayload) => {
    const user = await UserServices.createUser(payload);
    return user;
  },
  verifyUser: async (_: any, payload: VerifyUserPayload) => {
    const verifiedUser = await UserServices.verifyUser(payload);
    return verifiedUser;
  },
  signOut: async (_: any, parameters: any, { res }: { res: Response }) => {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
    });

    return "Logged out successfully!";
  },
  createBookRequest: async (
    _: any,
    payload: createBookRequestPayload,
    context: any
  ) => {
    console.log(payload);
    if (context && context.user) {
      const bookRequest = await UserServices.createBookRequest(
        payload,
        context.user.id
      );
      return bookRequest;
    } else throw new Error("No user logged in");
  },
  approveBookRequest: async (
    _: any,
    {
      bookRequestId,
      deliverTo,
      otp,
    }: { bookRequestId: string; deliverTo: string; otp: string },
    context: any
  ) => {
    if (!context || !context.user) throw new Error("User not authorised");

    const updatedRequest = await UserServices.approveBookRequest(
      bookRequestId,
      context.user.id,
      deliverTo,
      otp
    );

    if (!updatedRequest) throw new Error("Failed to update book request");

    return "Request accepted successfully!";
  },
  confirmBookRequest: async (
    _: any,
    { bookRequestId, otp }: { bookRequestId: string; otp: string },
    context: any
  ) => {
    if (!context || !context.user) throw new Error("User not authorized!");

    const updatedRequest = await UserServices.confirmRequest(
      bookRequestId,
      otp,
      context.user.id
    );

    const bookOwner = await UserServices.getUserById(updatedRequest.ownerId);

    if (bookOwner && updatedRequest) {
      const sentMail = await sendBuyerRequestConfirmationEmail(
        bookOwner?.firstName,
        context.user.firstName + context.user.lastName,
        context.user.id,
        //@ts-ignore
        updatedRequest.deliverTo,
        updatedRequest.title,
        bookOwner?.email
      );

      if (!sentMail)
        throw new Error(
          "Something wrong happened while sending book owner email"
        );
    }

    return "Order confirmed";
  },
  sendMessage: async (_: any, payload: sendMessagePayload) => {
    const message = await UserServices.sendMessage(payload);

    if (!message.id) throw new Error("Message not sent");

    // pubsub.publish(`ROOM_${message.roomId}`, { newMessage: message });
    pubsub.publish(`ROOM_${message.roomId}`, { newMessage: message });
    console.log(`message published to ROOM_${message.roomId}`);

    return message;
  },
  completeDelivery: async (
    _: any,
    { bookRequestId }: { bookRequestId: string },
    context: any
  ) => {
    if (!context || !context.user) throw new Error("User not authorised");
    return UserServices.completeDelivery(bookRequestId);
  },
  addToWishlist: async (
    _: any,
    { bookRequestId }: { bookRequestId: string },
    context: any
  ) => {
    if (!bookRequestId) throw new Error("Book request ID is missing");
    if (!context || !context.user) throw new Error("User not authorised");

    const addedBook = await UserServices.addToWishlist(
      context.user.id,
      bookRequestId
    );

    console.log(addedBook);

    return "Book added to playlist!";
  },
  removeFromWishlist: async (
    _: any,
    { bookRequestId }: { bookRequestId: string },
    context: any
  ) => {
    if (!bookRequestId) throw new Error("Book request ID is missing");
    if (!context || !context.user) throw new Error("User not authorised");

    const addedBook = UserServices.removeFromWishlist(
      context.user.id,
      bookRequestId
    );

    return "Book removed from playlist!";
  },
  updateUserAvatar: async (
    _: any,
    { imgUrl }: { imgUrl: string },
    context: any
  ) => {
    console.log("img from resolver: ", imgUrl);
    if (context && context.user) {
      try {
        const updatedUser = await UserServices.updateAvatar(
          context.user.id,
          imgUrl
        );
        if (!updatedUser) throw new Error("Failed to update user avatar");
        return "User avatar updated successfully!";
      } catch (error) {
        console.log("Error while updating user avatar: ", error);
        return "Could not update user avatar";
      }
    }
  },
};

//subscriptions
const resolverSubscriptions = {
  //notifying room members of new message
  newMessage: {
    subscribe: withFilter(
      async (_: any, parameters: any, context: any) => {
        if (!context && !context.user)
          throw new Error("user is not authenticated");

        const rooms = await UserServices.getUserRoomIds(context.user.id);

        console.log("subscribing to all rooms");

        const iterators = rooms.map((room) =>
          pubsub.asyncIterableIterator(`ROOM_${room.roomId}`)
        );

        return mergeAsyncIterators(iterators);
      },
      async (payload, _: any, context: any) => {
        if (!context && !context.user)
          throw new Error("user is not authenticated");
        // console.log("message", payload);

        const rooms = await UserServices.getUserRoomIds(context.user.id);
        return rooms.some((room) => room.roomId === payload.newMessage.roomId);
      }
    ),
  },
};

function mergeAsyncIterators(iterators: AsyncIterator<any>[]) {
  return {
    async next() {
      return Promise.race(iterators.map((it) => it.next())); // Waits for the first message
    },

    async return() {
      await Promise.all(iterators.map((it) => it.return?.()));
      return { done: true, value: undefined };
    },

    async throw(error: any) {
      await Promise.all(iterators.map((it) => it.throw?.(error)));
      return { done: true, value: undefined };
    },

    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

export const resolvers = {
  resolverQueries,
  resolverMutations,
  resolverSubscriptions,
};
