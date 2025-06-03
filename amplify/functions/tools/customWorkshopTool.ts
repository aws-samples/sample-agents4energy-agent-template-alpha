import { tool } from "@langchain/core/tools";
import { z } from "zod";

// This schema tells the agent which arguments to call the tool with.
const permeabilityCalculatorSchema = z.object({
    porosity: z.number().describe("Porosity (fraction)"),
    grainSize: z.number().describe("Average grain size (mm)"),
    rockType: z.enum(["sandstone", "limestone", "dolomite"]).describe("Type of reservoir rock")
});

export const permeabilityCalculator = tool(
    async ({ porosity, grainSize, rockType }) => {
        // Simplified Kozeny-Carman equation
        let constant = 0;
        switch(rockType) {
          case "sandstone":
            constant = 150;
            break;
          case "limestone":
            constant = 225;
            break;
          case "dolomite":
            constant = 300;
            break;
        }
        
        // k = (porosity^3 * d^2) / (constant * (1-porosity)^2)
        const permeability = (Math.pow(porosity, 3) * Math.pow(grainSize, 2)) / 
                             (constant * Math.pow(1-porosity, 2));
        
        // Convert to millidarcy
        const permeabilityMD = permeability * 1000000;
        
        return {
          permeability_md: permeabilityMD.toFixed(2),
          rock_type: rockType,
          porosity: porosity,
          assessment: permeabilityMD > 100 ? "Good reservoir quality" : "Poor reservoir quality"
        }
    },
    {
      name: "permeabilityCalculator",
      description: "Calculate estimated permeability based on rock properties",
      schema: permeabilityCalculatorSchema,
  }
);