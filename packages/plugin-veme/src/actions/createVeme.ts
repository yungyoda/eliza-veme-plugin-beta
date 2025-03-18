import { Action } from "@elizaos/core";
import { VemeService } from "../types";

export const createVemeAction = (service: VemeService): Action => ({
    name: "CREATE_VEME",
    description: "Create a veme with a caption based on the user's prompt and emotion",
    parameters: {
        type: "object",
        properties: {
            userPrompt: {
                type: "string",
                description: "The prompt to generate the veme caption"
            },
            emotion: {
                type: "string",
                description: "The emotion to convey in the veme",
                enum: ["funny", "motivational", "dramatic", "happy", "sad"]
            }
        },
        required: ["userPrompt"]
    },
    handler: async ({ userPrompt, emotion }: { userPrompt: string; emotion?: string }) => {
        try {
            const response = await service.createCaptionVeme(userPrompt, emotion);
            return {
                success: true,
                data: response
            };
        } catch (error) {
            console.error("Error creating veme:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }
});