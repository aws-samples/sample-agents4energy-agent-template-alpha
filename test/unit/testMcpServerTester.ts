import { getConfiguredAmplifyClient, setAmplifyEnvVars } from "../../utils/amplifyUtils";

import { loadOutputs } from '../utils';
import { getDeployedResourceArn, getLambdaEnvironmentVariables } from "../../utils/testUtils";

import { handler } from '../../amplify/functions/mcpServerTest/handler';
import { createChatSession } from "../../amplify/functions/graphql/mutations";
import * as APITypes from "../../amplify/functions/graphql/API";
import { createChatMessage } from "../../utils/graphqlStatements";

// const prompt = `Create a plot showing the the length vs weight of common fruits and vegetables.`
const prompt = 'Why is AWS the best place for energy related workloads?'

const main = async () => {
  await setAmplifyEnvVars();
  // const amplifyClient = getConfiguredAmplifyClient()
  const outputs = loadOutputs()
  const rootStackName = outputs.custom.rootStackName
  await getLambdaEnvironmentVariables(await getDeployedResourceArn(rootStackName, 'mcpServerTestlambda'))
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = outputs.data.url

  // Create a dummy event for the handler
  const dummyEvent = {
    arguments: {
      mcpServerId: "b8f6fe94-49cf-4b4b-b205-004277d9e756"
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

main()
