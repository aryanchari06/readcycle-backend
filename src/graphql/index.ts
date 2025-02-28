import { ApolloServer } from "@apollo/server";
import { gqlUser } from "./user";
import { makeExecutableSchema } from "@graphql-tools/schema";

async function createApolloServer() {
  const typeDefs = `
    ${gqlUser.typeDefs}
    
    type Query{
        ${gqlUser.queries}
    }
  
    type Mutation {
        ${gqlUser.mutations}
    }
    
    type Subscription {
        ${gqlUser.subscriptions}
    }
    `;

  const resolvers = {
    Query: {
      ...gqlUser.resolvers.resolverQueries,
    },
    Mutation: {
      ...gqlUser.resolvers.resolverMutations,
    },
    Subscription: {
      ...gqlUser.resolvers.resolverSubscriptions,
    },
  };

  const gqlServer = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: false,
    introspection: true,
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  await gqlServer.start();
  return { gqlServer, schema };
}

export default createApolloServer;
