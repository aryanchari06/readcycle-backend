"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gqlUser = void 0;
const queries_1 = require("./queries");
const mutations_1 = require("./mutations");
const typeDefs_1 = require("./typeDefs");
const resolvers_1 = require("./resolvers");
const subscription_1 = require("./subscription");
exports.gqlUser = { queries: queries_1.queries, mutations: mutations_1.mutations, typeDefs: typeDefs_1.typeDefs, resolvers: resolvers_1.resolvers, subscriptions: subscription_1.subscriptions };
