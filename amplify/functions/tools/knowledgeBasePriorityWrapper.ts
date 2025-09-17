import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { knowledgeBaseTool } from "./knowledgeBaseTool";

/**
 * Wrapper to enforce knowledge base priority for geological topics
 */
export class KnowledgeBasePriorityEnforcer {
    private static geologicalKeywords = [
        'geological', 'geology', 'geophysical', 'geophysics', 'petrophysical', 'petrophysics',
        'formation', 'rock', 'reservoir', 'seismic', 'well log', 'porosity', 'permeability',
        'saturation', 'lithology', 'facies', 'stratigraphy', 'structural', 'sedimentary',
        'carbonate', 'sandstone', 'shale', 'mudstone', 'limestone', 'dolomite'
    ];

    static isGeologicalQuery(query: string): boolean {
        return this.geologicalKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    static async enforceKnowledgeBasePriority(query: string): Promise<string> {
        if (this.isGeologicalQuery(query)) {
            try {
                const kbResult = await knowledgeBaseTool.invoke({ query });
                if (kbResult && !kbResult.includes("No relevant information")) {
                    return `KNOWLEDGE BASE RESULT (PRIMARY SOURCE): ${kbResult}`;
                } else {
                    return `KNOWLEDGE BASE CHECKED: No relevant information found. You may now use other sources as fallback for: "${query}"`;
                }
            } catch (error) {
                return `KNOWLEDGE BASE ERROR: ${error}. You may use other sources as fallback.`;
            }
        }
        return ""; // Not a geological query, no KB enforcement needed
    }
}

/**
 * Validation function to prevent synthetic data creation
 */
export function validateDataRequirement(operation: string, dataAvailable: boolean): string {
    if (!dataAvailable && (operation.includes('plot') || operation.includes('graph') || operation.includes('chart'))) {
        return "ERROR: Cannot create plots without real data. Synthetic data creation is prohibited unless explicitly requested by user.";
    }
    return "";
}
