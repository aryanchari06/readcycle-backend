"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
exports.typeDefs = ` #graphql
  enum RequestStatus {
    PENDING
    APPROVED
    COMPLETED
    ONGOING
    CANCELED
  }

  enum Genre {
    FICTION
    NON_FICTION
    MYSTERY
    FANTASY
    SCIENCE_FICTION
    ROMANCE
    THRILLER
    HORROR
    HISTORY
    BIOGRAPHY
    SELF_HELP
    POETRY
    BUSINESS
    RELIGION
    ART
    GRAPHIC_NOVEL
    CHILDREN
    YOUNG_ADULT
    EDUCATIONAL
    CLASSICS
    PHILOSOPHY
    HEALTH
    COOKING
    TRAVEL
    SPORTS
  }

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    avatar: String
    bookrequests: [BookRequest]
    sentMessages: [Message!]!
    receivedMessages: [Message!]!
    createdAt: String!
    isVerified: Boolean
    verifyCode: String!
  }

  type BookRequest {
    id: ID!
    title: String!
    author: String!
    description: String
    owner: User!
    media: [String!]!
    status: RequestStatus!
    genre: Genre!
    createdAt: String!
    buyer: User
    buyerId: String
    allowMessages: Boolean!
    otp:String!
    deliverTo: String
    price: Int!
  }

  type Message {
    id: ID!
    sender: User!
    receiver: User!
    content: String!
    timestamp: String!
    isRead: Boolean!
    roomId: String!
    senderId: String
    recieverId: String
  }

  type RoomMessages {
    roomId: String
    messages: [Message]
  }

  type Wishlist {
    userId: String
    bookRequestId: String
  }

  type RoomId {
    roomId: String
  }
  
`;
