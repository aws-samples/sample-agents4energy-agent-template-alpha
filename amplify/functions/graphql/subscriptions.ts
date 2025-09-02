/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateChatMessage = /* GraphQL */ `subscription OnCreateChatMessage(
  $filter: ModelSubscriptionChatMessageFilterInput
  $owner: String
) {
  onCreateChatMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateChatMessageSubscriptionVariables,
  APITypes.OnCreateChatMessageSubscription
>;
export const onCreateChatSession = /* GraphQL */ `subscription OnCreateChatSession(
  $filter: ModelSubscriptionChatSessionFilterInput
  $owner: String
) {
  onCreateChatSession(filter: $filter, owner: $owner) {
    createdAt
    id
    messages {
      nextToken
      __typename
    }
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateChatSessionSubscriptionVariables,
  APITypes.OnCreateChatSessionSubscription
>;
export const onCreateDummyModelToAddIamDirective = /* GraphQL */ `subscription OnCreateDummyModelToAddIamDirective(
  $filter: ModelSubscriptionDummyModelToAddIamDirectiveFilterInput
  $owner: String
) {
  onCreateDummyModelToAddIamDirective(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateDummyModelToAddIamDirectiveSubscriptionVariables,
  APITypes.OnCreateDummyModelToAddIamDirectiveSubscription
>;
export const onCreateMcpServer = /* GraphQL */ `subscription OnCreateMcpServer(
  $filter: ModelSubscriptionMcpServerFilterInput
  $owner: String
) {
  onCreateMcpServer(filter: $filter, owner: $owner) {
    createdAt
    enabled
    headers {
      key
      value
      __typename
    }
    id
    name
    owner
    signRequestsWithAwsCreds
    tools {
      description
      name
      schema
      __typename
    }
    updatedAt
    url
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateMcpServerSubscriptionVariables,
  APITypes.OnCreateMcpServerSubscription
>;
export const onCreateProject = /* GraphQL */ `subscription OnCreateProject(
  $filter: ModelSubscriptionProjectFilterInput
  $owner: String
) {
  onCreateProject(filter: $filter, owner: $owner) {
    createdAt
    description
    financial {
      NPV10
      cost
      incrimentalGasRateMCFD
      incrimentalOilRateBOPD
      revenuePresentValue
      successProbability
      __typename
    }
    foundationModelId
    id
    name
    nextAction {
      buttonTextAfterClick
      buttonTextBeforeClick
      __typename
    }
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
` as GeneratedSubscription<
  APITypes.OnCreateProjectSubscriptionVariables,
  APITypes.OnCreateProjectSubscription
>;
export const onDeleteChatMessage = /* GraphQL */ `subscription OnDeleteChatMessage(
  $filter: ModelSubscriptionChatMessageFilterInput
  $owner: String
) {
  onDeleteChatMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteChatMessageSubscriptionVariables,
  APITypes.OnDeleteChatMessageSubscription
>;
export const onDeleteChatSession = /* GraphQL */ `subscription OnDeleteChatSession(
  $filter: ModelSubscriptionChatSessionFilterInput
  $owner: String
) {
  onDeleteChatSession(filter: $filter, owner: $owner) {
    createdAt
    id
    messages {
      nextToken
      __typename
    }
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteChatSessionSubscriptionVariables,
  APITypes.OnDeleteChatSessionSubscription
>;
export const onDeleteDummyModelToAddIamDirective = /* GraphQL */ `subscription OnDeleteDummyModelToAddIamDirective(
  $filter: ModelSubscriptionDummyModelToAddIamDirectiveFilterInput
  $owner: String
) {
  onDeleteDummyModelToAddIamDirective(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteDummyModelToAddIamDirectiveSubscriptionVariables,
  APITypes.OnDeleteDummyModelToAddIamDirectiveSubscription
>;
export const onDeleteMcpServer = /* GraphQL */ `subscription OnDeleteMcpServer(
  $filter: ModelSubscriptionMcpServerFilterInput
  $owner: String
) {
  onDeleteMcpServer(filter: $filter, owner: $owner) {
    createdAt
    enabled
    headers {
      key
      value
      __typename
    }
    id
    name
    owner
    signRequestsWithAwsCreds
    tools {
      description
      name
      schema
      __typename
    }
    updatedAt
    url
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteMcpServerSubscriptionVariables,
  APITypes.OnDeleteMcpServerSubscription
>;
export const onDeleteProject = /* GraphQL */ `subscription OnDeleteProject(
  $filter: ModelSubscriptionProjectFilterInput
  $owner: String
) {
  onDeleteProject(filter: $filter, owner: $owner) {
    createdAt
    description
    financial {
      NPV10
      cost
      incrimentalGasRateMCFD
      incrimentalOilRateBOPD
      revenuePresentValue
      successProbability
      __typename
    }
    foundationModelId
    id
    name
    nextAction {
      buttonTextAfterClick
      buttonTextBeforeClick
      __typename
    }
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
` as GeneratedSubscription<
  APITypes.OnDeleteProjectSubscriptionVariables,
  APITypes.OnDeleteProjectSubscription
>;
export const onUpdateChatMessage = /* GraphQL */ `subscription OnUpdateChatMessage(
  $filter: ModelSubscriptionChatMessageFilterInput
  $owner: String
) {
  onUpdateChatMessage(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateChatMessageSubscriptionVariables,
  APITypes.OnUpdateChatMessageSubscription
>;
export const onUpdateChatSession = /* GraphQL */ `subscription OnUpdateChatSession(
  $filter: ModelSubscriptionChatSessionFilterInput
  $owner: String
) {
  onUpdateChatSession(filter: $filter, owner: $owner) {
    createdAt
    id
    messages {
      nextToken
      __typename
    }
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateChatSessionSubscriptionVariables,
  APITypes.OnUpdateChatSessionSubscription
>;
export const onUpdateDummyModelToAddIamDirective = /* GraphQL */ `subscription OnUpdateDummyModelToAddIamDirective(
  $filter: ModelSubscriptionDummyModelToAddIamDirectiveFilterInput
  $owner: String
) {
  onUpdateDummyModelToAddIamDirective(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateDummyModelToAddIamDirectiveSubscriptionVariables,
  APITypes.OnUpdateDummyModelToAddIamDirectiveSubscription
>;
export const onUpdateMcpServer = /* GraphQL */ `subscription OnUpdateMcpServer(
  $filter: ModelSubscriptionMcpServerFilterInput
  $owner: String
) {
  onUpdateMcpServer(filter: $filter, owner: $owner) {
    createdAt
    enabled
    headers {
      key
      value
      __typename
    }
    id
    name
    owner
    signRequestsWithAwsCreds
    tools {
      description
      name
      schema
      __typename
    }
    updatedAt
    url
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateMcpServerSubscriptionVariables,
  APITypes.OnUpdateMcpServerSubscription
>;
export const onUpdateProject = /* GraphQL */ `subscription OnUpdateProject(
  $filter: ModelSubscriptionProjectFilterInput
  $owner: String
) {
  onUpdateProject(filter: $filter, owner: $owner) {
    createdAt
    description
    financial {
      NPV10
      cost
      incrimentalGasRateMCFD
      incrimentalOilRateBOPD
      revenuePresentValue
      successProbability
      __typename
    }
    foundationModelId
    id
    name
    nextAction {
      buttonTextAfterClick
      buttonTextBeforeClick
      __typename
    }
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
` as GeneratedSubscription<
  APITypes.OnUpdateProjectSubscriptionVariables,
  APITypes.OnUpdateProjectSubscription
>;
export const recieveResponseStreamChunk = /* GraphQL */ `subscription RecieveResponseStreamChunk($chatSessionId: String!) {
  recieveResponseStreamChunk(chatSessionId: $chatSessionId) {
    chatSessionId
    chunkText
    index
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.RecieveResponseStreamChunkSubscriptionVariables,
  APITypes.RecieveResponseStreamChunkSubscription
>;
