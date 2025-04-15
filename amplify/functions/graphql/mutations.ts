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
export const createProjectProposal = /* GraphQL */ `mutation CreateProjectProposal(
  $condition: ModelProjectProposalConditionInput
  $input: CreateProjectProposalInput!
) {
  createProjectProposal(condition: $condition, input: $input) {
    createdAt
    description
    financial {
      NPV10
      cost
      discountedRevenue
      risk
      __typename
    }
    id
    name
    owner
    procedure
    result
    status
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateProjectProposalMutationVariables,
  APITypes.CreateProjectProposalMutation
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
export const deleteProjectProposal = /* GraphQL */ `mutation DeleteProjectProposal(
  $condition: ModelProjectProposalConditionInput
  $input: DeleteProjectProposalInput!
) {
  deleteProjectProposal(condition: $condition, input: $input) {
    createdAt
    description
    financial {
      NPV10
      cost
      discountedRevenue
      risk
      __typename
    }
    id
    name
    owner
    procedure
    result
    status
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteProjectProposalMutationVariables,
  APITypes.DeleteProjectProposalMutation
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
export const updateProjectProposal = /* GraphQL */ `mutation UpdateProjectProposal(
  $condition: ModelProjectProposalConditionInput
  $input: UpdateProjectProposalInput!
) {
  updateProjectProposal(condition: $condition, input: $input) {
    createdAt
    description
    financial {
      NPV10
      cost
      discountedRevenue
      risk
      __typename
    }
    id
    name
    owner
    procedure
    result
    status
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateProjectProposalMutationVariables,
  APITypes.UpdateProjectProposalMutation
>;
