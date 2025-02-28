import { gql } from "graphql-tag";

export const typeDefs = ` #graphql
  enum RequestStatus {
    PENDING
    APPROVED
    COMPLETED
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
    bookrequests: [BookRequest!]!
    sentMessages: [Message!]!
    receivedMessages: [Message!]!
    createdAt: String!
  }

  type BookRequest {
    id: ID!
    title: String!
    author: String!
    owner: User!
    media: [String!]!
    status: RequestStatus!
    genre: Genre!
    createdAt: String!
    buyer: User
    buyerId: String
    allowMessages: Boolean!
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
  
`;
