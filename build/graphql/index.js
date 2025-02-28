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
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const user_1 = require("./user");
const schema_1 = require("@graphql-tools/schema");
function createApolloServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const typeDefs = `
    ${user_1.gqlUser.typeDefs}
    
    type Query{
        ${user_1.gqlUser.queries}
    }
  
    type Mutation {
        ${user_1.gqlUser.mutations}
    }
    
    type Subscription {
        ${user_1.gqlUser.subscriptions}
    }
    `;
        const resolvers = {
            Query: Object.assign({}, user_1.gqlUser.resolvers.resolverQueries),
            Mutation: Object.assign({}, user_1.gqlUser.resolvers.resolverMutations),
            Subscription: Object.assign({}, user_1.gqlUser.resolvers.resolverSubscriptions),
        };
        const gqlServer = new server_1.ApolloServer({
            typeDefs,
            resolvers,
            csrfPrevention: false,
            introspection: true,
        });
        const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
        yield gqlServer.start();
        return { gqlServer, schema };
    });
}
exports.default = createApolloServer;
