import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/cloudfront-signer";
import { VemeConfig } from "./environment";
import { VemeResponse, LoginResponse, VemeService } from "./types";

export const createVemeService = (config: VemeConfig): VemeService => {
    const getSignedUrl = (url: string): string => {
        return awsGetSignedUrl({
            url,
            keyPairId: config.AWS_ACCESS_KEY_ID,
            privateKey: config.AWS_PRIVATE_KEY,
            dateLessThan: new Date(
                (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
            ).toISOString(),
        });
    };

    const login = async (): Promise<LoginResponse> => {
        try {
            const urlData = new URLSearchParams();
            urlData.append("email_id", "dev@veme.com");
            urlData.append("wallet_address", "0x0000000000000000000000000000000000000000");

            const response = await fetch(`${config.BASE_URL}/user/signup`, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${config.ENCODED_CREDENTIALS}`,
                    "Api-Key": config.VEME_API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: urlData.toString(),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to login: ${response.status} ${errorData}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error logging in:", error);
            throw error;
        }
    };

    const createCaptionVeme = async (
        userPrompt: string,
        emotion?: string
    ): Promise<VemeResponse> => {
        try {
            const loginResponse = await login();
            const { user_id, "access-token": accessToken } = loginResponse.result;

            const urlData = new URLSearchParams();
            urlData.append("user_id", user_id);
            urlData.append("user_prompt", userPrompt);
            if (emotion) {
                urlData.append("emotion", emotion);
            }

            const response = await fetch(
                `${config.BASE_URL}/home/create-caption-veme`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${config.ENCODED_CREDENTIALS}`,
                        "Api-Key": config.VEME_API_KEY,
                        "Access-Token": accessToken,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: urlData.toString(),
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(
                    `Failed to create caption veme: ${response.status} ${errorData}`
                );
            }

            const data = await response.json();

            // Sign URLs for each veme in the result array
            if (data.result && Array.isArray(data.result)) {
                for (const veme of data.result) {
                    if (veme.veme_url) {
                        veme.veme_link = getSignedUrl(veme.veme_url);
                    }
                }
            }

            return data;
        } catch (error) {
            console.error("Error creating caption veme:", error);
            throw error;
        }
    };

    return {
        login,
        createCaptionVeme,
        getSignedUrl,
    };
};