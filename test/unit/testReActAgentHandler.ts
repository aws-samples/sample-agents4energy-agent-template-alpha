import { getConfiguredAmplifyClient, setAmplifyEnvVars } from "../../utils/amplifyUtils";

import { loadOutputs } from '../utils';
import { getDeployedResourceArn, getLambdaEnvironmentVariables } from "../../utils/testUtils";

import { handler } from '../../amplify/functions/reActAgent/handler';
import { createChatSession } from "../../amplify/functions/graphql/mutations";
import * as APITypes from "../../amplify/functions/graphql/API";
import { createChatMessage } from "../../utils/graphqlStatements";

const prompt = `Use the calculator tool to add 3525232 and 4522`

const main = async () => {
  await setAmplifyEnvVars();
  const amplifyClient = getConfiguredAmplifyClient()
  const outputs = loadOutputs()
  const rootStackName = outputs.custom.rootStackName
  await getLambdaEnvironmentVariables(await getDeployedResourceArn(rootStackName, 'reActAgentlambda'))
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = outputs.data.url

  // Create a new chat session
  console.log('Creating new chat session');
  const { data: newChatSession, errors: newChatSessionErrors } = await amplifyClient.graphql({
    query: createChatSession,
    variables: {
      input: {
        name: `Test chat session`
      }
    }
  });
  if (newChatSessionErrors) {
    console.error(newChatSessionErrors);
    process.exit(1);
  }
  console.log('Created chat session with id: ', newChatSession.createChatSession.id);

  const { errors: newChatMessageErrors } = await amplifyClient.graphql({
    query: createChatMessage,
    variables: {
      input: {
        chatSessionId: newChatSession.createChatSession.id,
        content: {
          text: prompt
        },
        role: APITypes.ChatMessageRole.human
      }
    }
  });

  if (newChatMessageErrors) {
    console.error(newChatMessageErrors);
    process.exit(1);
  }


  // Create a dummy event for the handler
  const dummyEvent = {
    arguments: {
      chatSessionId: newChatSession.createChatSession.id, 
    },
    identity: {
      sub: "test-user-123",  // Used as userId if arguments.userId is not provided
      claims: {},
      username: "test-user",
      sourceIp: ["127.0.0.1"],
      defaultAuthStrategy: "ALLOW",
      groups: null,
      issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example"
    },
    source: null,
    request: {
      headers: {
        "content-type": "application/json"
      },
      domainName: null
    },
    info: {
      selectionSetList: ["__typename"],
      selectionSetGraphQL: "{\n  __typename\n}",
      parentTypeName: "Query",
      fieldName: "invokeReActAgent",
      variables: {}
    },
    prev: null,
    stash: {}
  };

  // Mock context object
  const mockContext = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: "test-function",
    functionVersion: "$LATEST",
    invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test-function",
    memoryLimitInMB: "128",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/test-function",
    logStreamName: "2023/06/23/[$LATEST]abcdef123456",
    identity: undefined,
    clientContext: undefined,
    getRemainingTimeInMillis: () => 3000,
    done: () => { },
    fail: () => { },
    succeed: () => { }
  };

  // Mock callback function
  const mockCallback = () => { };

  console.log('Invoking ReActAgent handler with dummy event...');
  await handler(dummyEvent, mockContext, mockCallback);
  console.log('Handler execution completed');

}

main().catch(error => {
  console.error('Error in test:', error);
  process.exit(1);
})
