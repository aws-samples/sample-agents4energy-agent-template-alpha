/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type ChatMessage = {
  __typename: "ChatMessage",
  chatSession?: ChatSession | null,
  chatSessionId?: string | null,
  chatSessionIdUnderscoreFieldName?: string | null,
  content?: ChatMessageContent | null,
  createdAt?: string | null,
  id: string,
  owner?: string | null,
  responseComplete?: boolean | null,
  role?: ChatMessageRole | null,
  toolCallId?: string | null,
  toolCalls?: string | null,
  toolName?: string | null,
  updatedAt: string,
};

export type ChatSession = {
  __typename: "ChatSession",
  createdAt: string,
  id: string,
  messages?: ModelChatMessageConnection | null,
  name?: string | null,
  owner?: string | null,
  updatedAt: string,
  workSteps?:  Array<WorkStep | null > | null,
};

export type ModelChatMessageConnection = {
  __typename: "ModelChatMessageConnection",
  items:  Array<ChatMessage | null >,
  nextToken?: string | null,
};

export type WorkStep = {
  __typename: "WorkStep",
  description?: string | null,
  name?: string | null,
  result?: string | null,
  status?: WorkStepStatus | null,
};

export enum WorkStepStatus {
  completed = "completed",
  failed = "failed",
  in_progress = "in_progress",
  pending = "pending",
}


export type ChatMessageContent = {
  __typename: "ChatMessageContent",
  text?: string | null,
};

export enum ChatMessageRole {
  ai = "ai",
  human = "human",
  tool = "tool",
}


export type DummyModelToAddIamDirective = {
  __typename: "DummyModelToAddIamDirective",
  createdAt: string,
  id: string,
  owner?: string | null,
  responseStreamChunk?: ResponseStreamChunk | null,
  updatedAt: string,
};

export type ResponseStreamChunk = {
  __typename: "ResponseStreamChunk",
  chatSessionId: string,
  chunkText: string,
  index: number,
};

export type ProjectProposal = {
  __typename: "ProjectProposal",
  createdAt: string,
  description?: string | null,
  financial?: ProjectProposalFinancial | null,
  id: string,
  name?: string | null,
  owner?: string | null,
  procedure?: string | null,
  result?: string | null,
  status?: ProjectProposalStatus | null,
  updatedAt: string,
};

export type ProjectProposalFinancial = {
  __typename: "ProjectProposalFinancial",
  NPV10?: number | null,
  cost?: number | null,
  discountedRevenue?: number | null,
  risk?: number | null,
};

export enum ProjectProposalStatus {
  completed = "completed",
  failed = "failed",
  in_progress = "in_progress",
  pending = "pending",
}


export type EventInvocationResponse = {
  __typename: "EventInvocationResponse",
  success: boolean,
};

export type ModelStringKeyConditionInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
};

export type ModelChatMessageFilterInput = {
  and?: Array< ModelChatMessageFilterInput | null > | null,
  chatSessionId?: ModelIDInput | null,
  chatSessionIdUnderscoreFieldName?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelChatMessageFilterInput | null,
  or?: Array< ModelChatMessageFilterInput | null > | null,
  owner?: ModelStringInput | null,
  responseComplete?: ModelBooleanInput | null,
  role?: ModelChatMessageRoleInput | null,
  toolCallId?: ModelStringInput | null,
  toolCalls?: ModelStringInput | null,
  toolName?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelBooleanInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelChatMessageRoleInput = {
  eq?: ChatMessageRole | null,
  ne?: ChatMessageRole | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelChatSessionFilterInput = {
  and?: Array< ModelChatSessionFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelChatSessionFilterInput | null,
  or?: Array< ModelChatSessionFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelChatSessionConnection = {
  __typename: "ModelChatSessionConnection",
  items:  Array<ChatSession | null >,
  nextToken?: string | null,
};

export type ModelDummyModelToAddIamDirectiveFilterInput = {
  and?: Array< ModelDummyModelToAddIamDirectiveFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelDummyModelToAddIamDirectiveFilterInput | null,
  or?: Array< ModelDummyModelToAddIamDirectiveFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelDummyModelToAddIamDirectiveConnection = {
  __typename: "ModelDummyModelToAddIamDirectiveConnection",
  items:  Array<DummyModelToAddIamDirective | null >,
  nextToken?: string | null,
};

export type ModelProjectProposalFilterInput = {
  and?: Array< ModelProjectProposalFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  description?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelProjectProposalFilterInput | null,
  or?: Array< ModelProjectProposalFilterInput | null > | null,
  owner?: ModelStringInput | null,
  procedure?: ModelStringInput | null,
  result?: ModelStringInput | null,
  status?: ModelProjectProposalStatusInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelProjectProposalStatusInput = {
  eq?: ProjectProposalStatus | null,
  ne?: ProjectProposalStatus | null,
};

export type ModelProjectProposalConnection = {
  __typename: "ModelProjectProposalConnection",
  items:  Array<ProjectProposal | null >,
  nextToken?: string | null,
};

export type ModelChatMessageConditionInput = {
  and?: Array< ModelChatMessageConditionInput | null > | null,
  chatSessionId?: ModelIDInput | null,
  chatSessionIdUnderscoreFieldName?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  not?: ModelChatMessageConditionInput | null,
  or?: Array< ModelChatMessageConditionInput | null > | null,
  owner?: ModelStringInput | null,
  responseComplete?: ModelBooleanInput | null,
  role?: ModelChatMessageRoleInput | null,
  toolCallId?: ModelStringInput | null,
  toolCalls?: ModelStringInput | null,
  toolName?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateChatMessageInput = {
  chatSessionId?: string | null,
  chatSessionIdUnderscoreFieldName?: string | null,
  content?: ChatMessageContentInput | null,
  createdAt?: string | null,
  id?: string | null,
  owner?: string | null,
  responseComplete?: boolean | null,
  role?: ChatMessageRole | null,
  toolCallId?: string | null,
  toolCalls?: string | null,
  toolName?: string | null,
};

export type ChatMessageContentInput = {
  text?: string | null,
};

export type ModelChatSessionConditionInput = {
  and?: Array< ModelChatSessionConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelChatSessionConditionInput | null,
  or?: Array< ModelChatSessionConditionInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateChatSessionInput = {
  id?: string | null,
  name?: string | null,
  workSteps?: Array< WorkStepInput | null > | null,
};

export type WorkStepInput = {
  description?: string | null,
  name?: string | null,
  result?: string | null,
  status?: WorkStepStatus | null,
};

export type ModelDummyModelToAddIamDirectiveConditionInput = {
  and?: Array< ModelDummyModelToAddIamDirectiveConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelDummyModelToAddIamDirectiveConditionInput | null,
  or?: Array< ModelDummyModelToAddIamDirectiveConditionInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateDummyModelToAddIamDirectiveInput = {
  id?: string | null,
  responseStreamChunk?: ResponseStreamChunkInput | null,
};

export type ResponseStreamChunkInput = {
  chatSessionId: string,
  chunkText: string,
  index: number,
};

export type ModelProjectProposalConditionInput = {
  and?: Array< ModelProjectProposalConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  description?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelProjectProposalConditionInput | null,
  or?: Array< ModelProjectProposalConditionInput | null > | null,
  owner?: ModelStringInput | null,
  procedure?: ModelStringInput | null,
  result?: ModelStringInput | null,
  status?: ModelProjectProposalStatusInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateProjectProposalInput = {
  description?: string | null,
  financial?: ProjectProposalFinancialInput | null,
  id?: string | null,
  name?: string | null,
  procedure?: string | null,
  result?: string | null,
  status?: ProjectProposalStatus | null,
};

export type ProjectProposalFinancialInput = {
  NPV10?: number | null,
  cost?: number | null,
  discountedRevenue?: number | null,
  risk?: number | null,
};

export type DeleteChatMessageInput = {
  id: string,
};

export type DeleteChatSessionInput = {
  id: string,
};

export type DeleteDummyModelToAddIamDirectiveInput = {
  id: string,
};

export type DeleteProjectProposalInput = {
  id: string,
};

export type UpdateChatMessageInput = {
  chatSessionId?: string | null,
  chatSessionIdUnderscoreFieldName?: string | null,
  content?: ChatMessageContentInput | null,
  createdAt?: string | null,
  id: string,
  owner?: string | null,
  responseComplete?: boolean | null,
  role?: ChatMessageRole | null,
  toolCallId?: string | null,
  toolCalls?: string | null,
  toolName?: string | null,
};

export type UpdateChatSessionInput = {
  id: string,
  name?: string | null,
  workSteps?: Array< WorkStepInput | null > | null,
};

export type UpdateDummyModelToAddIamDirectiveInput = {
  id: string,
  responseStreamChunk?: ResponseStreamChunkInput | null,
};

export type UpdateProjectProposalInput = {
  description?: string | null,
  financial?: ProjectProposalFinancialInput | null,
  id: string,
  name?: string | null,
  procedure?: string | null,
  result?: string | null,
  status?: ProjectProposalStatus | null,
};

export type ModelSubscriptionChatMessageFilterInput = {
  and?: Array< ModelSubscriptionChatMessageFilterInput | null > | null,
  chatSessionId?: ModelSubscriptionIDInput | null,
  chatSessionIdUnderscoreFieldName?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionChatMessageFilterInput | null > | null,
  owner?: ModelStringInput | null,
  responseComplete?: ModelSubscriptionBooleanInput | null,
  role?: ModelSubscriptionStringInput | null,
  toolCallId?: ModelSubscriptionStringInput | null,
  toolCalls?: ModelSubscriptionStringInput | null,
  toolName?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionBooleanInput = {
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelSubscriptionChatSessionFilterInput = {
  and?: Array< ModelSubscriptionChatSessionFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionChatSessionFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionDummyModelToAddIamDirectiveFilterInput = {
  and?: Array< ModelSubscriptionDummyModelToAddIamDirectiveFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionDummyModelToAddIamDirectiveFilterInput | null > | null,
  owner?: ModelStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionProjectProposalFilterInput = {
  and?: Array< ModelSubscriptionProjectProposalFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionProjectProposalFilterInput | null > | null,
  owner?: ModelStringInput | null,
  procedure?: ModelSubscriptionStringInput | null,
  result?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type GetChatMessageQueryVariables = {
  id: string,
};

export type GetChatMessageQuery = {
  getChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type GetChatSessionQueryVariables = {
  id: string,
};

export type GetChatSessionQuery = {
  getChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type GetDummyModelToAddIamDirectiveQueryVariables = {
  id: string,
};

export type GetDummyModelToAddIamDirectiveQuery = {
  getDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type GetProjectProposalQueryVariables = {
  id: string,
};

export type GetProjectProposalQuery = {
  getProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type InvokeAgentQueryVariables = {
  chatSessionId: string,
  userInput: string,
};

export type InvokeAgentQuery = {
  invokeAgent?:  {
    __typename: "EventInvocationResponse",
    success: boolean,
  } | null,
};

export type ListChatMessageByChatSessionIdAndCreatedAtQueryVariables = {
  chatSessionId: string,
  createdAt?: ModelStringKeyConditionInput | null,
  filter?: ModelChatMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListChatMessageByChatSessionIdAndCreatedAtQuery = {
  listChatMessageByChatSessionIdAndCreatedAt?:  {
    __typename: "ModelChatMessageConnection",
    items:  Array< {
      __typename: "ChatMessage",
      chatSessionId?: string | null,
      chatSessionIdUnderscoreFieldName?: string | null,
      createdAt?: string | null,
      id: string,
      owner?: string | null,
      responseComplete?: boolean | null,
      role?: ChatMessageRole | null,
      toolCallId?: string | null,
      toolCalls?: string | null,
      toolName?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAtQueryVariables = {
  chatSessionIdUnderscoreFieldName: string,
  createdAt?: ModelStringKeyConditionInput | null,
  filter?: ModelChatMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAtQuery = {
  listChatMessageByChatSessionIdUnderscoreFieldNameAndCreatedAt?:  {
    __typename: "ModelChatMessageConnection",
    items:  Array< {
      __typename: "ChatMessage",
      chatSessionId?: string | null,
      chatSessionIdUnderscoreFieldName?: string | null,
      createdAt?: string | null,
      id: string,
      owner?: string | null,
      responseComplete?: boolean | null,
      role?: ChatMessageRole | null,
      toolCallId?: string | null,
      toolCalls?: string | null,
      toolName?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListChatMessagesQueryVariables = {
  filter?: ModelChatMessageFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListChatMessagesQuery = {
  listChatMessages?:  {
    __typename: "ModelChatMessageConnection",
    items:  Array< {
      __typename: "ChatMessage",
      chatSessionId?: string | null,
      chatSessionIdUnderscoreFieldName?: string | null,
      createdAt?: string | null,
      id: string,
      owner?: string | null,
      responseComplete?: boolean | null,
      role?: ChatMessageRole | null,
      toolCallId?: string | null,
      toolCalls?: string | null,
      toolName?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListChatSessionsQueryVariables = {
  filter?: ModelChatSessionFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListChatSessionsQuery = {
  listChatSessions?:  {
    __typename: "ModelChatSessionConnection",
    items:  Array< {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListDummyModelToAddIamDirectivesQueryVariables = {
  filter?: ModelDummyModelToAddIamDirectiveFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListDummyModelToAddIamDirectivesQuery = {
  listDummyModelToAddIamDirectives?:  {
    __typename: "ModelDummyModelToAddIamDirectiveConnection",
    items:  Array< {
      __typename: "DummyModelToAddIamDirective",
      createdAt: string,
      id: string,
      owner?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListProjectProposalsQueryVariables = {
  filter?: ModelProjectProposalFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProjectProposalsQuery = {
  listProjectProposals?:  {
    __typename: "ModelProjectProposalConnection",
    items:  Array< {
      __typename: "ProjectProposal",
      createdAt: string,
      description?: string | null,
      id: string,
      name?: string | null,
      owner?: string | null,
      procedure?: string | null,
      result?: string | null,
      status?: ProjectProposalStatus | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreateChatMessageMutationVariables = {
  condition?: ModelChatMessageConditionInput | null,
  input: CreateChatMessageInput,
};

export type CreateChatMessageMutation = {
  createChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateChatSessionMutationVariables = {
  condition?: ModelChatSessionConditionInput | null,
  input: CreateChatSessionInput,
};

export type CreateChatSessionMutation = {
  createChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type CreateDummyModelToAddIamDirectiveMutationVariables = {
  condition?: ModelDummyModelToAddIamDirectiveConditionInput | null,
  input: CreateDummyModelToAddIamDirectiveInput,
};

export type CreateDummyModelToAddIamDirectiveMutation = {
  createDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type CreateProjectProposalMutationVariables = {
  condition?: ModelProjectProposalConditionInput | null,
  input: CreateProjectProposalInput,
};

export type CreateProjectProposalMutation = {
  createProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type DeleteChatMessageMutationVariables = {
  condition?: ModelChatMessageConditionInput | null,
  input: DeleteChatMessageInput,
};

export type DeleteChatMessageMutation = {
  deleteChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteChatSessionMutationVariables = {
  condition?: ModelChatSessionConditionInput | null,
  input: DeleteChatSessionInput,
};

export type DeleteChatSessionMutation = {
  deleteChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type DeleteDummyModelToAddIamDirectiveMutationVariables = {
  condition?: ModelDummyModelToAddIamDirectiveConditionInput | null,
  input: DeleteDummyModelToAddIamDirectiveInput,
};

export type DeleteDummyModelToAddIamDirectiveMutation = {
  deleteDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type DeleteProjectProposalMutationVariables = {
  condition?: ModelProjectProposalConditionInput | null,
  input: DeleteProjectProposalInput,
};

export type DeleteProjectProposalMutation = {
  deleteProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type PublishResponseStreamChunkMutationVariables = {
  chatSessionId: string,
  chunkText: string,
  index: number,
};

export type PublishResponseStreamChunkMutation = {
  publishResponseStreamChunk?:  {
    __typename: "ResponseStreamChunk",
    chatSessionId: string,
    chunkText: string,
    index: number,
  } | null,
};

export type UpdateChatMessageMutationVariables = {
  condition?: ModelChatMessageConditionInput | null,
  input: UpdateChatMessageInput,
};

export type UpdateChatMessageMutation = {
  updateChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateChatSessionMutationVariables = {
  condition?: ModelChatSessionConditionInput | null,
  input: UpdateChatSessionInput,
};

export type UpdateChatSessionMutation = {
  updateChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type UpdateDummyModelToAddIamDirectiveMutationVariables = {
  condition?: ModelDummyModelToAddIamDirectiveConditionInput | null,
  input: UpdateDummyModelToAddIamDirectiveInput,
};

export type UpdateDummyModelToAddIamDirectiveMutation = {
  updateDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type UpdateProjectProposalMutationVariables = {
  condition?: ModelProjectProposalConditionInput | null,
  input: UpdateProjectProposalInput,
};

export type UpdateProjectProposalMutation = {
  updateProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type OnCreateChatMessageSubscriptionVariables = {
  filter?: ModelSubscriptionChatMessageFilterInput | null,
  owner?: string | null,
};

export type OnCreateChatMessageSubscription = {
  onCreateChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateChatSessionSubscriptionVariables = {
  filter?: ModelSubscriptionChatSessionFilterInput | null,
  owner?: string | null,
};

export type OnCreateChatSessionSubscription = {
  onCreateChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type OnCreateDummyModelToAddIamDirectiveSubscriptionVariables = {
  filter?: ModelSubscriptionDummyModelToAddIamDirectiveFilterInput | null,
  owner?: string | null,
};

export type OnCreateDummyModelToAddIamDirectiveSubscription = {
  onCreateDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type OnCreateProjectProposalSubscriptionVariables = {
  filter?: ModelSubscriptionProjectProposalFilterInput | null,
  owner?: string | null,
};

export type OnCreateProjectProposalSubscription = {
  onCreateProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteChatMessageSubscriptionVariables = {
  filter?: ModelSubscriptionChatMessageFilterInput | null,
  owner?: string | null,
};

export type OnDeleteChatMessageSubscription = {
  onDeleteChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteChatSessionSubscriptionVariables = {
  filter?: ModelSubscriptionChatSessionFilterInput | null,
  owner?: string | null,
};

export type OnDeleteChatSessionSubscription = {
  onDeleteChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type OnDeleteDummyModelToAddIamDirectiveSubscriptionVariables = {
  filter?: ModelSubscriptionDummyModelToAddIamDirectiveFilterInput | null,
  owner?: string | null,
};

export type OnDeleteDummyModelToAddIamDirectiveSubscription = {
  onDeleteDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteProjectProposalSubscriptionVariables = {
  filter?: ModelSubscriptionProjectProposalFilterInput | null,
  owner?: string | null,
};

export type OnDeleteProjectProposalSubscription = {
  onDeleteProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateChatMessageSubscriptionVariables = {
  filter?: ModelSubscriptionChatMessageFilterInput | null,
  owner?: string | null,
};

export type OnUpdateChatMessageSubscription = {
  onUpdateChatMessage?:  {
    __typename: "ChatMessage",
    chatSession?:  {
      __typename: "ChatSession",
      createdAt: string,
      id: string,
      name?: string | null,
      owner?: string | null,
      updatedAt: string,
    } | null,
    chatSessionId?: string | null,
    chatSessionIdUnderscoreFieldName?: string | null,
    content?:  {
      __typename: "ChatMessageContent",
      text?: string | null,
    } | null,
    createdAt?: string | null,
    id: string,
    owner?: string | null,
    responseComplete?: boolean | null,
    role?: ChatMessageRole | null,
    toolCallId?: string | null,
    toolCalls?: string | null,
    toolName?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateChatSessionSubscriptionVariables = {
  filter?: ModelSubscriptionChatSessionFilterInput | null,
  owner?: string | null,
};

export type OnUpdateChatSessionSubscription = {
  onUpdateChatSession?:  {
    __typename: "ChatSession",
    createdAt: string,
    id: string,
    messages?:  {
      __typename: "ModelChatMessageConnection",
      nextToken?: string | null,
    } | null,
    name?: string | null,
    owner?: string | null,
    updatedAt: string,
    workSteps?:  Array< {
      __typename: "WorkStep",
      description?: string | null,
      name?: string | null,
      result?: string | null,
      status?: WorkStepStatus | null,
    } | null > | null,
  } | null,
};

export type OnUpdateDummyModelToAddIamDirectiveSubscriptionVariables = {
  filter?: ModelSubscriptionDummyModelToAddIamDirectiveFilterInput | null,
  owner?: string | null,
};

export type OnUpdateDummyModelToAddIamDirectiveSubscription = {
  onUpdateDummyModelToAddIamDirective?:  {
    __typename: "DummyModelToAddIamDirective",
    createdAt: string,
    id: string,
    owner?: string | null,
    responseStreamChunk?:  {
      __typename: "ResponseStreamChunk",
      chatSessionId: string,
      chunkText: string,
      index: number,
    } | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateProjectProposalSubscriptionVariables = {
  filter?: ModelSubscriptionProjectProposalFilterInput | null,
  owner?: string | null,
};

export type OnUpdateProjectProposalSubscription = {
  onUpdateProjectProposal?:  {
    __typename: "ProjectProposal",
    createdAt: string,
    description?: string | null,
    financial?:  {
      __typename: "ProjectProposalFinancial",
      NPV10?: number | null,
      cost?: number | null,
      discountedRevenue?: number | null,
      risk?: number | null,
    } | null,
    id: string,
    name?: string | null,
    owner?: string | null,
    procedure?: string | null,
    result?: string | null,
    status?: ProjectProposalStatus | null,
    updatedAt: string,
  } | null,
};

export type RecieveResponseStreamChunkSubscriptionVariables = {
  chatSessionId: string,
};

export type RecieveResponseStreamChunkSubscription = {
  recieveResponseStreamChunk?:  {
    __typename: "ResponseStreamChunk",
    chatSessionId: string,
    chunkText: string,
    index: number,
  } | null,
};
