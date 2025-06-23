import { getConfiguredAmplifyClient, setAmplifyEnvVars } from "../../utils/amplifyUtils";

import { loadOutputs } from '../utils';
import { getDeployedResourceArn, getLambdaEnvironmentVariables } from "../../utils/testUtils";

import { handler } from '../../amplify/functions/reActAgent/handler';


const main = async () => {
    await setAmplifyEnvVars();
    const amplifyClient = getConfiguredAmplifyClient()
    const outputs = loadOutputs()
    const rootStackName = outputs.custom.rootStackName
    await getLambdaEnvironmentVariables(await getDeployedResourceArn(rootStackName, 'reActAgentlambda'))
    process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = outputs.data.url

    // Create a dummy event for the handler
    const dummyEvent = {
        arguments: {
            chatSessionId: "test-session-123",  // Required - must be a non-null string
            foundationModelId: "anthropic.claude-3-5-haiku-20241022-v1:0",  // Optional - will default to process.env.AGENT_MODEL_ID
            respondToAgent: false,  // Optional - determines if agent should create a tool response
            userId: "test-user-123"  // Optional if identity.sub is provided
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
        done: () => {},
        fail: () => {},
        succeed: () => {}
    };

    // Mock callback function
    const mockCallback = () => {};

    console.log('Invoking ReActAgent handler with dummy event...');
    await handler(dummyEvent, mockContext, mockCallback);
    console.log('Handler execution completed');

}

main().catch(error => {
    console.error('Error in test:', error);
    process.exit(1);
})
