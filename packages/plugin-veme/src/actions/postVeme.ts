import { Action } from "@elizaos/core";
import { VemeService } from "../types";

export const postVemeAction = (service: VemeService): Action => ({
    name: "POST_VEME",
    description: "Post a veme to a social media platform or chat",
    parameters: {
        type: "object",
        properties: {
            vemeId: {
                type: "string",
                description: "The ID of the veme to post"
            },
            platform: {
                type: "string",
                description: "The platform to post to",
                enum: ["chat", "x", "twitter"]
            },
            caption: {
                type: "string",
                description: "Optional custom caption for the post"
            }
        },
        required: ["vemeId", "platform"]
    },
    handler: async ({ vemeId, platform, caption }: { vemeId: string; platform: string; caption?: string }) => {
        try {
            // First get the veme details
            const loginResponse = await service.login();
            const { user_id, "access-token": accessToken } = loginResponse.result;

            // Get veme details
            const response = await fetch(
                `${process.env.BASE_URL}/veme/get-veme-detail?user_id=${user_id}&veme_id=${vemeId}`,
                {
                    headers: {
                        Authorization: `Basic ${process.env.ENCODED_CREDENTIALS}`,
                        "Api-Key": process.env.VEME_API_KEY!,
                        "Access-Token": accessToken,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get veme details: ${response.status}`);
            }

            const vemeData = await response.json();
            const vemeUrl = vemeData.result.veme_link || vemeData.result.veme_url;

            // Format the post content
            const postContent = caption || vemeData.result.veme_title || "Check out this veme!";

            // Handle different platforms
            switch (platform.toLowerCase()) {
                case "chat":
                    return {
                        success: true,
                        data: {
                            type: "veme",
                            url: vemeUrl,
                            caption: postContent
                        }
                    };
                case "x":
                case "twitter":
                    // Here you would integrate with Twitter/X API
                    // For now, we'll return the formatted content
                    return {
                        success: true,
                        data: {
                            type: "tweet",
                            content: `${postContent}\n${vemeUrl}`,
                            media: vemeUrl
                        }
                    };
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }
        } catch (error) {
            console.error("Error posting veme:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }
});