import { createChatMessage, createChatSession } from "../../amplify/functions/graphql/mutations";
import { invokeReActAgent, listChatMessageByChatSessionIdAndCreatedAt } from "../../utils/graphqlStatements";

import { getConfiguredAmplifyClient, setAmplifyEnvVars } from "../../utils/amplifyUtils";
import * as APITypes from "../../amplify/functions/graphql/API";


import { loadOutputs } from '../utils';
import { getDeployedResourceArn, getLambdaEnvironmentVariables } from "../../utils/testUtils";

const prompt = `
Use the calculator tool to add 5532432 and 523223.
`

const main = async () => {
    await setAmplifyEnvVars();
    const amplifyClient = getConfiguredAmplifyClient()
    const outputs = loadOutputs()
    const rootStackName = outputs.custom.rootStackName
    await getLambdaEnvironmentVariables(await getDeployedResourceArn(rootStackName, 'reActAgentlambda'))

    // Create a new chat session
    console.log('Creating new chat session');
    const { data: newChatSession, errors: newChatSessionErrors } = await amplifyClient.graphql({
        query: createChatSession,
        variables: {
            input: {
                name: `Test Chat Session`
            }
        }
    });

    if (newChatSessionErrors) {
        console.error(newChatSessionErrors);
        // process.exit(1);
    }

    console.log('Chat session id: ', newChatSession.createChatSession.id)

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
        // process.exit(1);
    }

    console.log('Human chat message created')

    const invokeReActAgentResponse = await amplifyClient.graphql({
        query: invokeReActAgent,
        variables: {
            chatSessionId: newChatSession.createChatSession.id,
            userId: 'test-user'
        },
    });

    console.log('Agent invoked')

    let responseComplete = false;
    const waitStartTime = Date.now();
    while (!responseComplete) {
        const { data, errors: lastMessageErrors } = await amplifyClient.graphql({
            query: listChatMessageByChatSessionIdAndCreatedAt,
            variables: {
                chatSessionId: newChatSession.createChatSession.id,
                sortDirection: APITypes.ModelSortDirection.DESC,
                limit: 1
            }
        });
        if (lastMessageErrors) {
            console.error(lastMessageErrors);
            process.exit(1);
        }

        const messages = data.listChatMessageByChatSessionIdAndCreatedAt.items;
        if (messages.length > 0) {
            const lastMessage = messages[0];
            responseComplete = lastMessage.responseComplete || false;
            if (responseComplete) console.log('Assistant response complete. Final response: \n', lastMessage.content?.text);
        }

        if (!responseComplete) {
            const elapsedSeconds = Math.floor((Date.now() - waitStartTime) / 1000);
            console.log(`Waiting for assistant to finish analysis... (${elapsedSeconds} seconds)`);
            // Wait x seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

}

main().catch(error => {
    console.error('Error in test:', error);
    process.exit(1);
})