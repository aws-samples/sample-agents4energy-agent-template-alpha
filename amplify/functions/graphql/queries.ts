/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getChatMessage = /* GraphQL */ `query GetChatMessage($id: ID!) {
  getChatMessage(id: $id) {
    chatSession {
      createdAt
      id
      name
      owner
      updatedAt
      __typename
    }
    chatSessionId
    chatSessionIdUnderscoreFieldName
    content {
      text
      __typename
    }
    createdAt
    id
    owner
    responseComplete
    role
    toolCallId
    toolCalls
    toolName
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetChatMessageQueryVariables,
  APITypes.GetChatMessageQuery
>;
export const getChatSession = /* GraphQL */ `query GetChatSession($id: ID!) {
  getChatSession(id: $id) {
    createdAt
    id
    messages {
      nextToken
      __typename
    }
    name
    owner
    updatedAt
    workSteps {
      description
      name
      result
      status
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetChatSessionQueryVariables,
  APITypes.GetChatSessionQuery
>;
export const getDummyModelToAddIamDirective = /* GraphQL */ `query GetDummyModelToAddIamDirective($id: ID!) {
  getDummyModelToAddIamDirective(id: $id) {
    createdAt
    id
    owner
    responseStreamChunk {
      chatSessionId
      chunkText
      index
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetDummyModelToAddIamDirectiveQueryVariables,
  APITypes.GetDummyModelToAddIamDirectiveQuery
>;
export const getProject = /* GraphQL */ `query GetProject($id: ID!) {
  getProject(id: $id) {
    createdAt
    description
    financial {
      NPV10
      cost
      discountedRevenue
      incirmentalOilRateBOPD
      incrimentalGasRateMCFD
      successProbability
      __typename
    }
    foundationModelId
    id
    name
    owner
    procedureS3Path
    reportS3Path
    result
    sourceChatSessionId
    status
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetProjectQueryVariables,
  APITypes.GetProjectQuery
>;
export const invokeReActAgent = /* GraphQL */ `query InvokeReActAgent(
  $chatSessionId: ID!
  $foundationModelId: String
  $respondToAgent: Boolean
) {
  invokeReActAgent(
    chatSessionId: $chatSessionId
    foundationModelId: $foundationModelId
    respondToAgent: $respondToAgent
  ) {
    success
    __typename
  }
}
` as GeneratedQuery<
  APITypes.InvokeReActAgentQueryVariables,
  APITypes.InvokeReActAgentQuery
>;
export const listChatMessageByChatSessionIdAndCreatedAt = /* GraphQL */ `query ListChatMessageByChatSessionIdAndCreatedAt(
  $chatSessionId: ID!
  $createdAt: ModelStringKeyConditionInput
  $filter: ModelChatMessageFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listChatMessageByChatSessionIdAndCreatedAt(
    chatSessionId: $chatSessionId
    createdAt: $createdAt
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      chatSessionId
      chatSessionIdUnderscoreFieldName
      createdAt
      id
      owner
      responseComplete
      role
      toolCallId
      toolCalls
      toolName
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListChatMessageByChatSessionIdAndCreatedAtQueryVariables,
  APITypes.ListChatMessageByChatSessionIdAndCreatedAtQuery
>;
export const listChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAt = /* GraphQL */ `query ListChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAt(
  $chatSessionIdUnderscoreFieldName: String!
  $createdAt: ModelStringKeyConditionInput
  $filter: ModelChatMessageFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAt(
    chatSessionIdUnderscoreFieldName: $chatSessionIdUnderscoreFieldName
    createdAt: $createdAt
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      chatSessionId
      chatSessionIdUnderscoreFieldName
      createdAt
      id
      owner
      responseComplete
      role
      toolCallId
      toolCalls
      toolName
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAtQueryVariables,
  APITypes.ListChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAtQuery
>;
export const listChatMessages = /* GraphQL */ `query ListChatMessages(
  $filter: ModelChatMessageFilterInput
  $limit: Int
  $nextToken: String
) {
  listChatMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      chatSessionId
      chatSessionIdUnderscoreFieldName
      createdAt
      id
      owner
      responseComplete
      role
      toolCallId
      toolCalls
      toolName
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListChatMessagesQueryVariables,
  APITypes.ListChatMessagesQuery
>;
export const listChatSessions = /* GraphQL */ `query ListChatSessions(
  $filter: ModelChatSessionFilterInput
  $limit: Int
  $nextToken: String
) {
  listChatSessions(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      id
      name
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListChatSessionsQueryVariables,
  APITypes.ListChatSessionsQuery
>;
export const listDummyModelToAddIamDirectives = /* GraphQL */ `query ListDummyModelToAddIamDirectives(
  $filter: ModelDummyModelToAddIamDirectiveFilterInput
  $limit: Int
  $nextToken: String
) {
  listDummyModelToAddIamDirectives(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      createdAt
      id
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDummyModelToAddIamDirectivesQueryVariables,
  APITypes.ListDummyModelToAddIamDirectivesQuery
>;
export const listProjects = /* GraphQL */ `query ListProjects(
  $filter: ModelProjectFilterInput
  $limit: Int
  $nextToken: String
) {
  listProjects(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      description
      foundationModelId
      id
      name
      owner
      procedureS3Path
      reportS3Path
      result
      sourceChatSessionId
      status
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProjectsQueryVariables,
  APITypes.ListProjectsQuery
>;
