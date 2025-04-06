export const queries = ` #graphql
    getAllUsers: [User!]!
    getCurrentUser: User
    getUserToken(email:String!, password: String!) : String
    getAllBookRequests: [BookRequest!]!
    getBookRequest(bookRequestId: String!): BookRequest
    getUserMessages(userId: String!): [RoomMessages]
    viewWishlist: [BookRequest!]
    getUserById(userId: String!) : User
    getRoomMessages(roomId: String!, page: Int!): [Message]
    getUserRoomIds: [RoomId]
`