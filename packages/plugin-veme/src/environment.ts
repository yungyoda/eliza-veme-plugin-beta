import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const vemeEnvSchema = z.object({
    VEME_API_KEY: z.string().min(1, "Veme API key is required"),
    AWS_ACCESS_KEY_ID: z.string().min(1, "AWS Access Key ID is required"),
    AWS_PRIVATE_KEY: z.string().min(1, "AWS Private Key is required"),
    BASE_URL: z.string().min(1, "Base URL is required"),
    ENCODED_CREDENTIALS: z.string().min(1, "Encoded credentials are required"),
});

export type VemeConfig = z.infer<typeof vemeEnvSchema>;

export async function validateVemeConfig(
    runtime: IAgentRuntime
): Promise<VemeConfig> {
    try {
        const config = {
            VEME_API_KEY: runtime.getSetting("VEME_API_KEY"),
            AWS_ACCESS_KEY_ID: runtime.getSetting("AWS_ACCESS_KEY_ID"),
            AWS_PRIVATE_KEY: runtime.getSetting("AWS_PRIVATE_KEY"),
            BASE_URL: runtime.getSetting("BASE_URL"),
            ENCODED_CREDENTIALS: runtime.getSetting("ENCODED_CREDENTIALS"),
        };
        return vemeEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Veme API configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}