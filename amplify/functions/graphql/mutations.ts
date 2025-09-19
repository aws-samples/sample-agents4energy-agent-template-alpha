/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createChatMessage = /* GraphQL */ `mutation CreateChatMessage(
  $condition: ModelChatMessageConditionInput
  $input: CreateChatMessageInput!
) {
  createChatMessage(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateChatMessageMutationVariables,
  APITypes.CreateChatMessageMutation
>;
export const createChatSession = /* GraphQL */ `mutation CreateChatSession(
  $condition: ModelChatSessionConditionInput
  $input: CreateChatSessionInput!
) {
  createChatSession(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateChatSessionMutationVariables,
  APITypes.CreateChatSessionMutation
>;
export const createDummyModelToAddIamDirective = /* GraphQL */ `mutation CreateDummyModelToAddIamDirective(
  $condition: ModelDummyModelToAddIamDirectiveConditionInput
  $input: CreateDummyModelToAddIamDirectiveInput!
) {
  createDummyModelToAddIamDirective(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateDummyModelToAddIamDirectiveMutationVariables,
  APITypes.CreateDummyModelToAddIamDirectiveMutation
>;
export const createMcpServer = /* GraphQL */ `mutation CreateMcpServer(
  $condition: ModelMcpServerConditionInput
  $input: CreateMcpServerInput!
) {
  createMcpServer(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateMcpServerMutationVariables,
  APITypes.CreateMcpServerMutation
>;
export const createProject = /* GraphQL */ `mutation CreateProject(
  $condition: ModelProjectConditionInput
  $input: CreateProjectInput!
) {
  createProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateProjectMutationVariables,
  APITypes.CreateProjectMutation
>;
export const createSettings = /* GraphQL */ `mutation CreateSettings(
  $condition: ModelSettingsConditionInput
  $input: CreateSettingsInput!
) {
  createSettings(condition: $condition, input: $input) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateSettingsMutationVariables,
  APITypes.CreateSettingsMutation
>;
export const deleteChatMessage = /* GraphQL */ `mutation DeleteChatMessage(
  $condition: ModelChatMessageConditionInput
  $input: DeleteChatMessageInput!
) {
  deleteChatMessage(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteChatMessageMutationVariables,
  APITypes.DeleteChatMessageMutation
>;
export const deleteChatSession = /* GraphQL */ `mutation DeleteChatSession(
  $condition: ModelChatSessionConditionInput
  $input: DeleteChatSessionInput!
) {
  deleteChatSession(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteChatSessionMutationVariables,
  APITypes.DeleteChatSessionMutation
>;
export const deleteDummyModelToAddIamDirective = /* GraphQL */ `mutation DeleteDummyModelToAddIamDirective(
  $condition: ModelDummyModelToAddIamDirectiveConditionInput
  $input: DeleteDummyModelToAddIamDirectiveInput!
) {
  deleteDummyModelToAddIamDirective(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteDummyModelToAddIamDirectiveMutationVariables,
  APITypes.DeleteDummyModelToAddIamDirectiveMutation
>;
export const deleteMcpServer = /* GraphQL */ `mutation DeleteMcpServer(
  $condition: ModelMcpServerConditionInput
  $input: DeleteMcpServerInput!
) {
  deleteMcpServer(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteMcpServerMutationVariables,
  APITypes.DeleteMcpServerMutation
>;
export const deleteProject = /* GraphQL */ `mutation DeleteProject(
  $condition: ModelProjectConditionInput
  $input: DeleteProjectInput!
) {
  deleteProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteProjectMutationVariables,
  APITypes.DeleteProjectMutation
>;
export const deleteSettings = /* GraphQL */ `mutation DeleteSettings(
  $condition: ModelSettingsConditionInput
  $input: DeleteSettingsInput!
) {
  deleteSettings(condition: $condition, input: $input) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteSettingsMutationVariables,
  APITypes.DeleteSettingsMutation
>;
export const publishResponseStreamChunk = /* GraphQL */ `mutation PublishResponseStreamChunk(
  $chatSessionId: String!
  $chunkText: String!
  $index: Int!
) {
  publishResponseStreamChunk(
    chatSessionId: $chatSessionId
    chunkText: $chunkText
    index: $index
  ) {
    chatSessionId
    chunkText
    index
    __typename
  }
}
` as GeneratedMutation<
  APITypes.PublishResponseStreamChunkMutationVariables,
  APITypes.PublishResponseStreamChunkMutation
>;
export const updateChatMessage = /* GraphQL */ `mutation UpdateChatMessage(
  $condition: ModelChatMessageConditionInput
  $input: UpdateChatMessageInput!
) {
  updateChatMessage(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateChatMessageMutationVariables,
  APITypes.UpdateChatMessageMutation
>;
export const updateChatSession = /* GraphQL */ `mutation UpdateChatSession(
  $condition: ModelChatSessionConditionInput
  $input: UpdateChatSessionInput!
) {
  updateChatSession(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateChatSessionMutationVariables,
  APITypes.UpdateChatSessionMutation
>;
export const updateDummyModelToAddIamDirective = /* GraphQL */ `mutation UpdateDummyModelToAddIamDirective(
  $condition: ModelDummyModelToAddIamDirectiveConditionInput
  $input: UpdateDummyModelToAddIamDirectiveInput!
) {
  updateDummyModelToAddIamDirective(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateDummyModelToAddIamDirectiveMutationVariables,
  APITypes.UpdateDummyModelToAddIamDirectiveMutation
>;
export const updateMcpServer = /* GraphQL */ `mutation UpdateMcpServer(
  $condition: ModelMcpServerConditionInput
  $input: UpdateMcpServerInput!
) {
  updateMcpServer(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateMcpServerMutationVariables,
  APITypes.UpdateMcpServerMutation
>;
export const updateProject = /* GraphQL */ `mutation UpdateProject(
  $condition: ModelProjectConditionInput
  $input: UpdateProjectInput!
) {
  updateProject(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateProjectMutationVariables,
  APITypes.UpdateProjectMutation
>;
export const updateSettings = /* GraphQL */ `mutation UpdateSettings(
  $condition: ModelSettingsConditionInput
  $input: UpdateSettingsInput!
) {
  updateSettings(condition: $condition, input: $input) {
    createdAt
    id
    name
    owner
    updatedAt
    value
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateSettingsMutationVariables,
  APITypes.UpdateSettingsMutation
>;
