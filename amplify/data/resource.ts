import { type ClientSchema, a, defineData, defineFunction } from '@aws-amplify/backend';

export const reActAgentFunction = defineFunction({
  name: 'reActAgent',
  entry: '../functions/reActAgent/handler.ts',
  timeoutSeconds: 900,
  environment: {
    // AGENT_MODEL_ID: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
    AGENT_MODEL_ID: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    // AGENT_MODEL_ID: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    // AGENT_MODEL_ID: 'us.anthropic.claude-sonnet-4-20250514-v1:0',

    // MODEL_ID: 'us.anthropic.claude-3-sonnet-20240229-v1:0',
    // MODEL_ID: 'us.amazon.nova-pro-v1:0'
    // TEXT_TO_TABLE_MODEL_ID: 'us.amazon.nova-pro-v1:0'
    // TEXT_TO_TABLE_MODEL_ID: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    // TEXT_TO_TABLE_MODEL_ID: 'amazon.nova-lite-v1:0',
    TEXT_TO_TABLE_MODEL_ID: 'us.anthropic.claude-3-haiku-20240307-v1:0',
    TEXT_TO_TABLE_CONCURRENCY: '10',

    ORIGIN_BASE_PATH: process.env.ORIGIN_BASE_PATH || ''
  }
});

export const mcpAgentInvoker = defineFunction({
  name: 'mcpAgentInvoker',
  entry: '../functions/mcpAgentInvoker/handler.ts',
  timeoutSeconds: 900,
});

export const mcpServerTestFunction = defineFunction({
  name: 'mcpServerTest',
  entry: '../functions/mcpServerTest/handler.ts',
  timeoutSeconds: 900,
});

export const schema = a.schema({
  Project: a.model({
    name: a.string(),
    description: a.string(),
    status: a.enum(["drafting", "proposed", "approved", "rejected", "scheduled", "in_progress", "completed", "failed"]),
    result: a.string(),
    procedureS3Path: a.string(),
    reportS3Path: a.string().required(),
    sourceChatSessionId: a.id(),
    financial: a.customType({
      revenuePresentValue: a.float(),
      cost: a.float(),
      NPV10: a.float(),
      successProbability: a.float(),
      incrimentalGasRateMCFD: a.float(),
      incrimentalOilRateBOPD: a.float(),
    }),
    foundationModelId: a.string(),
    nextAction: a.customType({
      buttonTextBeforeClick: a.string(),
      buttonTextAfterClick: a.string(),
    })
  })
    .authorization((allow) => [allow.owner(), allow.authenticated(), allow.guest()]),

  HeaderEntry: a.customType({
    key: a.string(),
    value: a.string(),
  }),

  Tool: a.customType({
    name: a.string(),
    description: a.string(),
    schema: a.string()
  }),

  McpServer: a.model({
    name: a.string().required().authorization((allow) => [allow.authenticated()]),
    url: a.string().authorization(allow => [allow.owner()]),
    headers: a.ref("HeaderEntry").array().authorization(allow => [allow.owner()]),
    signRequestsWithAwsCreds: a.boolean().default(false),
    enabled: a.boolean().default(true),
    tools: a.ref("Tool").array()
  }).authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  ChatSession: a.model({
    name: a.string(),
    messages: a.hasMany("ChatMessage", "chatSessionId"),
  })
    .authorization((allow) => [allow.owner(), allow.authenticated(), allow.guest()]),

  ChatMessage: a
    .model({
      chatSessionId: a.id(),
      chatSession: a.belongsTo("ChatSession", 'chatSessionId'),

      //Chat message fields
      content: a.customType({
        text: a.string(),
      }),
      role: a.enum(["human", "ai", "tool"]),
      responseComplete: a.boolean(),
      chatSessionIdUnderscoreFieldName: a.string(), //This is so that when invoking multiple agents, an agent can query it's own messages

      //auto-generated fields
      owner: a.string(),
      createdAt: a.datetime(),

      //langchain fields
      toolCallId: a.string(),
      toolName: a.string(),
      toolCalls: a.string(),
    })
    .secondaryIndexes((index) => [
      index("chatSessionId").sortKeys(["createdAt"]),
      index("chatSessionIdUnderscoreFieldName").sortKeys(["createdAt"])
    ])
    .authorization((allow) => [allow.owner(), allow.authenticated(), allow.guest()]),

  //These assets enable token level streaming from the model
  ResponseStreamChunk: a.customType({
    chunkText: a.string().required(),
    index: a.integer().required(),
    chatSessionId: a.string().required()
  }),

  DummyModelToAddIamDirective: a.model({//This is required to add the IAM directive to the ResponseStreamChunk type
    responseStreamChunk: a.ref('ResponseStreamChunk')
  })
    .authorization((allow) => [allow.owner()]),

  publishResponseStreamChunk: a.mutation()
    .arguments({
      chunkText: a.string().required(),
      index: a.integer().required(),
      chatSessionId: a.string().required(),
    })
    .returns(a.ref('ResponseStreamChunk'))
    // .returns(a.string())
    .handler(a.handler.custom({ entry: './publishMessageStreamChunk.js' }))
    .authorization(allow => [allow.authenticated()]),

  recieveResponseStreamChunk: a
    .subscription()
    .for(a.ref('publishResponseStreamChunk'))
    .arguments({ chatSessionId: a.string().required() })
    .handler(a.handler.custom({ entry: './receiveMessageStreamChunk.js' }))
    .authorization(allow => [allow.authenticated()]),

  invokeReActAgent: a.query()
    .arguments({
      chatSessionId: a.id().required(),
      foundationModelId: a.string(), // Optionally, chose the foundation model to use for the agent
      respondToAgent: a.boolean(), //When an agent is invoked by another agent, the agent will create a tool response message with it's output
      userId: a.string(), //When invoking the agent programatically, specify which user should be the owner of the message
      // origin: a.string(), //When invoking the agent programatically, specify the host origin for serving files
    })
    .handler(a.handler.function(reActAgentFunction).async())
    .authorization((allow) => [allow.authenticated()]),

  testMcpServer: a.query()
    .arguments({
      mcpServerId: a.string().required()
    })
    .returns(
      a.customType({
        tools: a.ref("Tool").array(),
        // tools: a.customType({
        //   name: a.string(),
        //   description: a.string(),
        //   schema: a.string()
        // }).array(),
        error: a.string()
      })
    )
    .handler(a.handler.function(mcpServerTestFunction))
    .authorization((allow) => [allow.authenticated()]),

})
  .authorization((allow) => [
    allow.resource(reActAgentFunction),
    allow.resource(mcpServerTestFunction)
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
