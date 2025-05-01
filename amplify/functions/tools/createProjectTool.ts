import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { Schema } from '../../data/resource';
import { createProject } from '../graphql/mutations';
import { ProjectStatus } from '../graphql/API';

const createProjectToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    status: z.nativeEnum(ProjectStatus).pipe(z.enum([ProjectStatus.drafting, ProjectStatus.proposed])),
    result: z.string().optional(),
    procedureS3Path: z.string().optional(),
    reportS3Path: z.string().describe("The path to the executive report for the project. Should always be an .html file."),
    financial: z.object({
        revenuePresentValue: z.number().describe("Over the economic life of the project, the present value of the revenue is the sum of the discounted cash flows."),
        cost: z.number().describe("The cost of the project."),
        // NPV10: z.number().optional().describe("Subtract the cost from the present value of the revenue to get the NPV10."),
        successProbability: z.number().optional().describe("The probability that the project will be successful."),
        incrimentalGasRateMCFD: z.number().optional(),
        incrimentalOilRateBOPD: z.number().optional(),
    }).describe("This information should ALWAYS come from outputs of the pysparkTool or files which the pysparkTool created."),
    nextAction: z.object({
        buttonTextBeforeClick: z.string(),
        buttonTextAfterClick: z.string(),
    }).describe("Recommend an action like: 'Schedule Job', 'Send procedure to rig manager', or something else that should be done based on the analysis."),
});

export const createProjectToolBuilder = (props: {
    sourceChatSessionId: string;
    foundationModelId: string;
}) => tool(
    async (args) => {
        try {
            const amplifyClient = getConfiguredAmplifyClient();
            
            // Create the project with initial status as pending if not specified
            const projectData = {
                ...args,
                status: args.status || "drafting",
                sourceChatSessionId: props.sourceChatSessionId,
                foundationModelId: props.foundationModelId,
            };

            const result = await amplifyClient.graphql({
                query: createProject,
                variables: {
                    input: projectData
                }
            });

            if (result.errors) throw new Error("Failed to create project: " + result.errors.map(e => e.message).join(", "));
            if (!result.data) throw new Error("Failed to create project: No data returned");
            
            return {
                status: "success",
                message: `Successfully created project: ${projectData.name}`,
                project: result.data.createProject
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                status: "error",
                message: `Failed to create project: ${errorMessage} \n\n ${JSON.stringify(error)}`
            };
        }
    },
    {
        name: "createProject",
        description: "Creates a new project with the specified details. Use the drafting status if more information is needed.",
        schema: createProjectToolSchema
    }
);

const typeChecks = () => {
    const testProject: Schema["Project"]["createType"] = {} as z.infer<typeof createProjectToolSchema>;
}