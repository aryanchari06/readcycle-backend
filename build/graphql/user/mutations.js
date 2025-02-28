"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutations = void 0;
exports.mutations = `#graphql
    createUser(firstName: String!, lastName: String!, email: String!, password: String!, avatar: String) : String
    signOut : String
    createBookRequest(title: String!, author: String!, media: [String!]!, genre:String!): String
    acceptBookRequest(bookRequestId:String!) : String
    sendMessage(content:String!, senderId:String!, receiverId:String!, roomId: String!): String
    completeDelivery(bookRequestId: String!): String!
`;
