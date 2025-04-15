import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Command } from "@langchain/langgraph";

import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { invokeAgent } from '../graphql/queries';
import { Schema } from '../../data/resource';

const agentHandoffToolSchema = z.object({
    agentName: z.string(),
    agentDescription: z.string(),
    agentInstructions: z.string(),
})

export const agentHandoffTool = tool(
    async (agentHandoffToolArgs) => {
        const amplifyClient = getConfiguredAmplifyClient();
        const { agentName, agentDescription, agentInstructions } = agentHandoffToolArgs;

        const chatSessionId = process.env.CHAT_SESSION_ID;
        if (!chatSessionId) {
            throw new Error("CHAT_SESSION_ID environment variable is not set");
        }

        // Invoke the new agent via GraphQL
        const response = await amplifyClient.graphql({
            query: invokeAgent,
            variables: { 
                chatSessionId,
                userInput: JSON.stringify({
                    agentName,
                    agentDescription,
                    agentInstructions
                })
            },
        });

        if (!response.data?.invokeAgent?.success) {
            throw new Error("Failed to invoke agent");
        }

        // Return a Command to transition to end state
        return new Command({
            command: "end",
            kwargs: {
                message: `Successfully handed off to agent: ${agentName}`
            }
        });
    },
    {
        name: "agentHandoffTool",
        description: `Use this tool to hand off the conversation to another agent with specific instructions.
The agent will be invoked with the provided name, description, and instructions.
This will end the current agent's execution.`,
        schema: agentHandoffToolSchema,
    }
);