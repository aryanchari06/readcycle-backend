export const mutations = `#graphql
    createUser(firstName: String!, lastName: String!, email: String!, password: String!, avatar: String) : String
    verifyUser(email: String!, verifyCode: String!) : String
    signOut : String
    createBookRequest(title: String!, author: String!, media: [String!]!, genre:String!, description: String, price: Int!): String
    approveBookRequest(bookRequestId:String!, deliverTo:String!, otp:String!) : String
    confirmBookRequest(bookRequestId:String!, otp: String!) : String
    sendMessage(content:String!, senderId:String!, receiverId:String!, roomId: String!): Message
    completeDelivery(bookRequestId: String!): String!
    addToWishlist(bookRequestId: String!): String!
    removeFromWishlist(bookRequestId: String!): String!
    updateUserAvatar(imgUrl: String!): String!
`;
