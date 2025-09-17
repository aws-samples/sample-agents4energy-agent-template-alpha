import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const knowledgeBaseSchema = z.object({
    query: z.string().describe("The question or query to search for in the knowledge base. Should be related to petrophysics, geology, or geophysics.")
});

const client = new BedrockAgentRuntimeClient({ 
    region: process.env.AWS_REGION || "us-east-1" 
});

export const knowledgeBaseTool = tool(
    async ({ query }) => {
        try {
            const command = new RetrieveAndGenerateCommand({
                input: {
                    text: query
                },
                retrieveAndGenerateConfiguration: {
                    type: "KNOWLEDGE_BASE",
                    knowledgeBaseConfiguration: {
                        knowledgeBaseId: "WLMPDD7FSP",
                        modelArn: "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
                    }
                }
            });

            const response = await client.send(command);
            
            if (response.output?.text) {
                return response.output.text;
            } else {
                return "No relevant information found in the knowledge base.";
            }
        } catch (error: any) {
            console.error("Knowledge base query error:", error);
            return `Error querying knowledge base: ${error.message}`;
        }
    },
    {
        name: "knowledgeBaseTool",
        description: "Query the Bedrock knowledge base for information about petrophysics, geology, and geophysics. Use this tool when you need specific technical information or explanations about these topics.",
        schema: knowledgeBaseSchema,
    }
);
