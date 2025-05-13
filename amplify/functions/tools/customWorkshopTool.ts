import { tool } from "@langchain/core/tools";
import { z } from "zod";

const customWorkshopToolSchema = z.object({
    title: z.string(),
    firstNumber: z.number(),
    secondNumber: z.number(),
    operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
})

export const customWrokshopTool = tool(
    async (args) => {
        const {firstNumber, secondNumber, operation} = args

        console.log("The custom workshop tool has begun executing")
        // Put business logic here
        
        let calculationResult: number = 0

        switch (operation) {
            case 'add':
                calculationResult = firstNumber + secondNumber
        }



        return {
            customField: "Hello from the tool!",
            calculationResult: calculationResult,
            ...args,
        }
    },
    {
        name: "toolNameHere",
        description: `
Descirbe both when the tool should be used, and give advice on how the agent should use the tool.
`,
        schema: customWorkshopToolSchema,
    }
);