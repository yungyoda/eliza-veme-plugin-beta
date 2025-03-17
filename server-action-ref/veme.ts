"use server";

import { z } from "zod";
import { baseUrl, VEME_API_KEY, encodedCredentials } from "@/utils/auth";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

const CreateCaptionVemeSchema = z.object({
  user_id: z.string(),
  access_token: z.string(),
  user_prompt: z.string(),
  emotion: z.string().optional(),
  language: z.string().optional().default("en"),
});

export type CreateCaptionVemeSchema = z.infer<typeof CreateCaptionVemeSchema>;

interface CaptionVemeResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    veme_id: string;
    veme_url: string;
    veme_context: string;
    veme_emotion: string;
    veme_thumb_url: string;
    veme_gif_url: string;
    veme_small_gif_url: string;
    clip_medium_gif_url: string;
    veme_duration: number;
    description_output: string;
    veme_title: string;
    gpt_captions: string[];
    veme_link?: string; // Signed URL will be added here
  }>;
  gpt_captions: string[];
}

export async function createCaptionVeme(input: CreateCaptionVemeSchema) {
  try {
    const validatedFields = CreateCaptionVemeSchema.parse(input);

    // Create URLSearchParams for application/x-www-form-urlencoded
    const urlData = new URLSearchParams();
    Object.entries(validatedFields).forEach(([key, value]) => {
      if (value && key !== "access_token") {
        urlData.append(key, value);
      }
    });
    console.log("creating veme");
    // console.log("urlData, ", urlData);

    // console.log("input, ", input);

    let response;
    if (baseUrl === "https://dev-api.veme.pro/api/v1.0") {
      response = await fetch(`https://dev-api.veme.pro/api/v1.1/home/create-caption-veme`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlData.toString(),
      });
    } else {
      if (baseUrl === "https://prod-api.veme.pro/api/v1.0") {
        response = await fetch(`https://prod-api.veme.pro/api/v1.1/home/create-caption-veme`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            "Api-Key": VEME_API_KEY!,
            "Access-Token": input.access_token,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: urlData.toString(),
        });
      } else {
        throw new Error("Invalid base URL");
      }
    }


    // console.log("response, ", response);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to create caption veme: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as CaptionVemeResponse;

    // Sign URLs for each veme in the result array
    if (data.result && Array.isArray(data.result)) {
      for (const veme of data.result) {
        if (veme.veme_url) {
          try {
            // Sign the veme_url
            const signedUrl = getSignedUrl({
              url: veme.veme_url,
              keyPairId: process.env.AWS_ACCESS_KEY_ID!,
              privateKey: process.env.AWS_PRIVATE_KEY!,
              dateLessThan: new Date(
                (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
              ).toISOString(),
            });

            // Add the signed URL to the veme object
            veme.veme_link = signedUrl;
          } catch (error) {
            console.error("Error signing URL:", error);
          }
        }
      }
    }

    console.log("create veme data, ", data);
    return data;
  } catch (error) {
    console.error("Error creating caption veme:", error);
    throw error;
  }
}

export async function getPreferences(input: {
  user_id: string;
  access_token: string;
}) {
  try {
    const response = await fetch(
      `${baseUrl}/profile/get-preferences?user_id=${input.user_id}&language=en`,
      {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("response, ", response);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch preferences: ${response.status} ${errorData}`
      );
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Error fetching preferences:", error);
    throw error;
  }
}

interface UserPreferenceResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    category: string;
    sub_category: string[];
  }>;
}

export async function getUserPreference(input: {
  user_id: string;
  access_token: string;
}) {
  try {
    const response = await fetch(
      `${baseUrl}/profile/get-user-preference?user_id=${input.user_id}&language=en`,
      {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch user preferences: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as UserPreferenceResponse;
    return data.result;
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    throw error;
  }
}

interface Article {
  article_title: string;
  article_link: string;
  headline: string;
  sentiment: string;
  trendingTopic: string;
  keywords: string;
  redefined_caption: string;
}

interface TrendingTopicsResponse {
  error_code: number;
  error_string: string;
  result: {
    [category: string]: Article[];
  };
}

export async function getTrendingTopics(input: {
  user_id: string;
  access_token: string;
  language?: string;
}): Promise<TrendingTopicsResponse> {
  try {
    const response = await fetch(
      `${baseUrl}/home/get-trending-topics?user_id=${input.user_id}&language=${input.language || "en"
      }`,
      {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );


    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch trending topics: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as TrendingTopicsResponse;
    console.log("trending topics data, ", data);
    return data;
  } catch (error) {
    console.error("Error fetching trending topics:", error);
    throw error;
  }
}

export async function logout(input: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  try {
    const urlData = new URLSearchParams();
    urlData.append("user_id", input.user_id);
    if (input.language) {
      urlData.append("language", input.language);
    }

    const response = await fetch(`${baseUrl}/user/logout`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(`Failed to logout: ${response.status} ${errorData}`);
    }

    return true;
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
}

interface UpdateBrandDetailsResponse {
  error_code: number;
  error_string: string;
  result: {
    brand_color: string;
    brand_logo: string;
    brand_font: string;
  };
}

export async function updateBrandDetails(input: {
  user_id: string;
  access_token: string;
  brand_color: string;
  brand_logo: string;
  brand_name: string;
  brand_font: string;
  language?: string;
}) {
  try {
    const formData = new FormData();
    formData.append("user_id", input.user_id);
    formData.append("brand_color", input.brand_color);
    formData.append("brand_logo", input.brand_logo);
    formData.append("brand_name", input.brand_name);
    formData.append("brand_font", input.brand_font);
    if (input.language) {
      formData.append("language", input.language);
    }

    const response = await fetch(`${baseUrl}/profile/update-brand-details`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token,
        // 'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to update brand details: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as UpdateBrandDetailsResponse;
    return data.result;
  } catch (error) {
    console.error("Error updating brand details:", error);
    throw error;
  }
}

interface UpdateUserPreferenceResponse {
  error_code: number;
  error_string: string;
  result: {
    preferences: Record<string, string[]>;
  };
}

export async function updateUserPreference(input: {
  user_id: string;
  access_token: string;
  preference_json_data: Record<string, string>;
  language?: string;
}) {
  try {
    const formData = new FormData();
    formData.append("user_id", input.user_id);

    // Format the preferences as an array of objects and stringify
    const formattedPreferences = Object.entries(input.preference_json_data).map(
      ([key, value]) => ({
        [key]: value,
      })
    );
    formData.append(
      "preference_json_data",
      JSON.stringify(formattedPreferences)
    );

    if (input.language) {
      formData.append("language", input.language);
    }

    const response = await fetch(`${baseUrl}/profile/update-user-preference`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to update user preferences: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as UpdateUserPreferenceResponse;
    return data.result;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
}

interface GetBrandDetailResponse {
  error_code: number;
  error_string: string;
  result: {
    brand_details: Record<string, string>;
    brand_meta_details: Array<Record<string, unknown>>;
  };
}

export async function getBrandDetail(input: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  try {
    const params = new URLSearchParams({
      user_id: input.user_id,
    });

    if (input.language) {
      params.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/profile/get-brand-detail?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to get brand details: ${response.status} ${errorData}`
      );
    }
    // sign the brand_logo_url
    const data = (await response.json()) as GetBrandDetailResponse;
    if (data.result.brand_meta_details[0]?.brand_logo_url) {
      data.result.brand_meta_details[0].brand_logo_url = getSignedUrl({
        url: data.result.brand_meta_details[0].brand_logo_url as string,
        keyPairId: process.env.AWS_ACCESS_KEY_ID!,
        privateKey: process.env.AWS_PRIVATE_KEY!,
        dateLessThan: new Date(
          (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
        ).toISOString(),
      });
    }

    return data.result;

  } catch (error) {
    console.error("Error getting brand details:", error);
    throw error;
  }
}

interface FavoriteVemeResponse {
  error_code: number;
  error_string: string;
  result: {
    success: boolean;
  };
}

export async function favoriteVeme(input: {
  user_id: string;
  access_token: string;
  veme_id: string;
  is_favorite: boolean;
}) {
  try {
    const urlData = new URLSearchParams();
    urlData.append("user_id", input.user_id);
    urlData.append("veme_id", input.veme_id);

    const response = await fetch(`${baseUrl}/favourite/favourite-veme`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to favorite veme: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as FavoriteVemeResponse;
    return data.result.success;
  } catch (error) {
    console.error("Error favoriting veme:", error);
    throw error;
  }
}

interface GetFavoriteVemesResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    veme_id: string;
    veme_url: string;
    // ... other veme properties
    is_favorited: boolean;
  }>;
}

export async function getFavoriteVemes(input: {
  user_id: string;
  access_token: string;
  page?: number;
  limit?: number;
}) {
  try {
    const response = await fetch(
      `${baseUrl}/home/get-favorite-vemes?user_id=${input.user_id}&page=${input.page || 1
      }&limit=${input.limit || 10}`,
      {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch favorite vemes: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as GetFavoriteVemesResponse;
    return data.result;
  } catch (error) {
    console.error("Error fetching favorite vemes:", error);
    throw error;
  }
}

interface SavePaymentPlanResponse {
  error_code: number;
  error_string: string;
  result: {
    success: boolean;
  };
}

export async function savePaymentPlan(input: {
  user_id: string;
  payment_plan: string;
  payment_plan_amount: number;
  payment_plan_id: string;
  access_token?: string;
  language?: string;
}) {
  try {
    const urlData = new URLSearchParams();
    urlData.append("user_id", input.user_id);
    urlData.append("payment_plan", input.payment_plan);
    urlData.append("payment_plan_amount", String(input.payment_plan_amount));
    if (input.language) {
      urlData.append("language", input.language);
    }
    console.log("urlData", urlData);

    const response = await fetch(`${baseUrl}/payment/save-payment-plan`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token ?? "",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to save payment plan: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as SavePaymentPlanResponse;
    return data.result.success;
  } catch (error) {
    console.error("Error saving payment plan:", error);
    throw error;
  }
}

interface CancelPaymentPlanResponse {
  error_code: number;
  error_string: string;
  result: {
    success: boolean;
  };
}

export async function cancelPaymentPlan(input: {
  user_id: string;
  access_token?: string;
  language?: string;
}) {
  try {
    const formData = new FormData();
    formData.append("user_id", input.user_id);
    if (input.language) {
      formData.append("language", input.language);
    }

    const response = await fetch(`${baseUrl}/payment/cancel-payment-plan`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token ?? "",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to cancel payment plan: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as CancelPaymentPlanResponse;
    console.log("data", data);
    return data.result.success;
  } catch (error) {
    console.error("Error canceling payment plan:", error);
    throw error;
  }
}

interface VemeLibraryImagesResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    media_id: string;
    media_url: string;
    media_type: string;
  }>;
  next_count: number;
  next_url: string;
}

export async function getVemeLibraryImages(input: {
  user_id: string;
  count?: number;
  language?: string;
  access_token: string;
}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("user_id", input.user_id);
    if (input.count) {
      params.append("count", input.count.toString());
    }
    if (input.language) {
      params.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/image-library/veme-library-images?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch library images: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as VemeLibraryImagesResponse;

    // Sign URLs for each image in the result array
    if (data.result && Array.isArray(data.result)) {
      for (const image of data.result) {
        if (image.media_url) {
          try {
            // Sign the media_url
            const signedUrl = getSignedUrl({
              url: image.media_url,
              keyPairId: process.env.AWS_ACCESS_KEY_ID!,
              privateKey: process.env.AWS_PRIVATE_KEY!,
              dateLessThan: new Date(
                (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
              ).toISOString(),
            });

            // Update the media_url with signed URL
            image.media_url = signedUrl;
          } catch (error) {
            console.error("Error signing URL:", error);
          }
        }
      }
    }

    return data;
  } catch (error) {
    console.error("Error fetching library images:", error);
    throw error;
  }
}

interface UserImagesResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    media_id: string;
    media_url: string;
    media_type: string;
  }>;
  next_count: number;
  next_url: string;
}

export async function getUserImages(input: {
  user_id: string;
  access_token: string;
  count?: number;
  language?: string;
}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("user_id", input.user_id);
    if (input.count) {
      params.append("count", input.count.toString());
    }
    if (input.language) {
      params.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/image-library/user-images?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    // Sign URLs for each image in the response
    if (response.ok) {
      const data = (await response.json()) as UserImagesResponse;
      if (data.result && Array.isArray(data.result)) {
        for (const image of data.result) {
          if (image.media_url) {
            try {
              // Sign the media_url
              const signedUrl = getSignedUrl({
                url: image.media_url,
                keyPairId: process.env.AWS_ACCESS_KEY_ID!,
                privateKey: process.env.AWS_PRIVATE_KEY!,
                dateLessThan: new Date(
                  (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
                ).toISOString(),
              });

              // Add the signed URL to the image object
              image.media_url = signedUrl;
            } catch (error) {
              console.error("Error signing URL:", error);
            }
          }
        }
      }
      return data;
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch user images: ${response.status} ${errorData}`
      );
    }

    console.log("response, ", response);

    const data = (await response.json()) as UserImagesResponse;
    console.log("user images data, ", data);
    console.log("user images data.result, ", data.result);
    return data;
  } catch (error) {
    console.error("Error fetching user images:", error);
    throw error;
  }
}

interface ForYouPreferenceResponse {
  error_code: number;
  error_string: string;
  result: Array<string>;
}

export async function getForYouPreference(input: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("user_id", input.user_id);
    if (input.language) {
      params.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/home/get-foryou-preference?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch for you preferences: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as ForYouPreferenceResponse;
    return data.result;
  } catch (error) {
    console.error("Error fetching for you preferences:", error);
    throw error;
  }
}

export interface PaymentHistoryResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    payment_id: string;
    payment_date: string;
    payment_amount: number;
    payment_status: string;
    payment_plan: string;
  }>;
}

export async function getPaymentHistory(input: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("user_id", input.user_id);
    if (input.language) {
      params.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/payment/get-payment-history?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch payment history: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as PaymentHistoryResponse;
    return data.result;
  } catch (error) {
    console.error("Error fetching payment history:", error);
    throw error;
  }
}

interface GetUserCreditsResponse {
  error_code: number;
  error_string: string;
  result: {
    user_total_credit: number;
    current_payment_plan?: string;
  };
}

export async function getUserCredits(input: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("user_id", input.user_id);
    if (input.language) {
      params.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/credit/get-user-credits?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch user credits: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as GetUserCreditsResponse;
    // console.log("user credits data.result, ", data.result);

    return data.result;
  } catch (error) {
    console.error("Error fetching user credits:", error);
    throw error;
  }
}

interface SaveImageResponse {
  error_code: number;
  error_string: string;
  result: {
    message: string;
  };
}

export async function saveImageToLibrary(input: {
  user_id: string;
  access_token: string;
  image: File;
  language?: string;
}) {
  try {
    const formData = new FormData();
    formData.append("user_id", input.user_id);
    formData.append("image", input.image);
    if (input.language) {
      formData.append("language", input.language);
    }
    console.log("formData, ", formData);

    const response = await fetch(`${baseUrl}/image-library/save-image`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY ?? "",
        "Access-Token": input.access_token,
      },
      body: formData,
    });

    console.log("response, ", response);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(`Failed to save image: ${response.status} ${errorData}`);
    }

    const data = (await response.json()) as SaveImageResponse;
    console.log("save image response:", data);
    return data.result;
  } catch (error) {
    console.error("Error saving image:", error);
    throw error;
  }
}

interface LoginResponse {
  result: {
    user_id: string;
    "access-token": string;
    user_email: string;
    user_fullname: string;
    user_profile_thumb: string;
  };
}

export async function walletLogin(input: {
  email_id: string;
  wallet_address: string;
  referral_code?: string;
}) {
  try {
    const urlData = new URLSearchParams();
    urlData.append("email_id", input.email_id);
    urlData.append("wallet_address", input.wallet_address);
    if (input.referral_code) {
      urlData.append("referral_code", input.referral_code);
    }
    const response = await fetch(`${baseUrl}/user/signup`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Api-Key": VEME_API_KEY!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to login: ${response.status} ${errorData}`);
    }

    const data = (await response.json()) as LoginResponse;
    return data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

interface ClipLibraryCategoriesResponse {
  error_code: number;
  error_string: string;
  result: string[];
}

export async function getClipLibraryCategories(input: { user_id: string; access_token: string; language?: string }) {
  try {
    const urlData = new URLSearchParams({
      user_id: input.user_id,
      ...(input.language && { language: input.language }),
    });

    const response = await fetch(
      `${baseUrl}/web-ai-clip/get-category?${urlData.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to fetch clip library categories: ${response.status} ${errorData}`);
    }

    const data = (await response.json()) as ClipLibraryCategoriesResponse;
    return data;

  } catch (error) {
    console.error("Error fetching clip library:", error);
    throw error;
  }
}


interface ClipLibraryResponse {
  error_code: number;
  error_string: string;
  result: Record<string, Array<{
    clip_id: string;
    clip_duration: number;
    clip_s3_url: string;
    clip_gpt_description: string;
    clip_tags: string[];
    clip_width: number;
    clip_height: number;
    clip_size: number;
  }>>;
  category: string[];
}

export async function getClipLibrary(input: { user_id: string; access_token: string; language?: string }) {
  try {
    const urlData = new URLSearchParams({
      user_id: input.user_id,
      ...(input.language && { language: input.language }),
    });

    const response = await fetch(
      `${baseUrl}/web-ai-clip/get-clip-library-clip?${urlData.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
        },
      }
    );

    console.log("response, ", response);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to fetch clip library: ${response.status} ${errorData}`);
    }

    const data = (await response.json()) as ClipLibraryResponse;
    console.log("data, ", data);

    // Sign the video URLs for each category
    const signedResults: Record<string, Array<{
      clip_id: string;
      clip_duration: number;
      clip_s3_url: string;
      clip_gpt_description: string;
      clip_tags: string[];
      clip_width: number;
      clip_height: number;
      clip_size: number;
    }>> = {};

    for (const [category, clips] of Object.entries(data.result)) {
      signedResults[category] = clips.map(clip => ({
        ...clip,
        clip_s3_url: getSignedUrl({
          url: clip.clip_s3_url,
          keyPairId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
          privateKey: process.env.NEXT_PUBLIC_AWS_PRIVATE_KEY!,
          dateLessThan: new Date(
            (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
          ).toISOString(),
        })
      }));
    }

    return {
      ...data,
      result: signedResults
    };

  } catch (error) {
    console.error("Error fetching clip library:", error);
    throw error;
  }
}


export async function generateClipCaptions(input: {
  user_id: string;
  clip_id: string;
  category: string;
  language?: string;
  access_token: string;
}) {
  try {
    const formData = new FormData();
    formData.append("user_id", input.user_id);
    formData.append("clip_id", input.clip_id);
    formData.append("category", input.category);
    if (input.language) {
      formData.append("language", input.language);
    }
    console.log("create captions formData, ", formData);
    const response = await fetch(
      `${baseUrl}/web-ai-clip/generate-clip-caption`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to generate captions: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log("create captions data, ", data);
    return data;

  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
}

interface CategoryClipLibraryResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    clip_id: string;
    clip_duration: number;
    clip_s3_url: string;
    clip_gpt_description: string;
    clip_s3_thumburl: string;
    clip_tags: string[];
    clip_width: number;
    clip_height: number;
    clip_size: number;
  }>;
}
export async function getCategoryClipLibrary(input: {
  user_id: string;
  category: string;
  access_token: string;
  count?: string;
  language?: string;
}) {
  try {
    const urlData = new URLSearchParams({
      user_id: input.user_id,
      category: input.category,
      ...(input.count && { count: input.count }),
      ...(input.language && { language: input.language }),
    });

    const response = await fetch(
      `${baseUrl}/web-ai-clip/get-category-cliplibrary-clip?${urlData.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to fetch category clip library: ${response.status} ${errorData}`);
    }

    const data = (await response.json()) as CategoryClipLibraryResponse;

    // Sign the video URLs and thumbnail URLs
    const signedResults = data.result.map(clip => ({
      ...clip,
      clip_s3_url: getSignedUrl({
        url: clip.clip_s3_url,
        keyPairId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        privateKey: process.env.NEXT_PUBLIC_AWS_PRIVATE_KEY!,
        dateLessThan: new Date(
          (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
        ).toISOString(),
      }),
      clip_s3_thumburl: getSignedUrl({
        url: clip.clip_s3_thumburl,
        keyPairId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
        privateKey: process.env.NEXT_PUBLIC_AWS_PRIVATE_KEY!,
        dateLessThan: new Date(
          (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
        ).toISOString(),
      })
    }));

    console.log("signed clip results, ", signedResults);

    return signedResults;

  } catch (error) {
    console.error("Error fetching category clip library:", error);
    throw error;
  }
}

export interface TrendingVemeResult {
  metaphore_response: string;
  suggested_clip: {
    veme_id: string;
    veme_title: string;
    sub_reddit_class: string;
    veme_duration: number;
    veme_url: string;
    clip_s3_thumburl?: string;
    description_output: string;
    similarity: number;
    veme_caption: string;
  };
  article_title: string;
  article_summary: string;
  article_link: string;
  keywords: string[];
  gpt_captions?: string[];
}

export interface TrendingVemesResponse {
  error_code: number;
  error_string: string;
  result: {
    [category: string]: TrendingVemeResult[];
  };
}

export async function getTrendingVemes(input: {
  user_id: string;
  access_token: string;
  language?: string;
}): Promise<TrendingVemesResponse> {
  try {
    const urlData = new URLSearchParams({
      user_id: input.user_id,
      ...(input.language && { language: input.language }),
    });

    const response = await fetch(
      `${baseUrl}/home/get-pro-user-trending-vemes?${urlData.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `Failed to fetch trending vemes: ${response.status}`;
      try {
        const parsedError = JSON.parse(errorData);
        errorMessage += ` - ${parsedError.error_string || errorData}`;
      } catch {
        errorMessage += ` ${errorData}`;
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as TrendingVemesResponse;

    if (!data.result || Object.keys(data.result).length === 0) {
      console.warn("No trending vemes found in response");
      return {
        error_code: data.error_code,
        error_string: data.error_string,
        result: {}
      };
    }

    // Sign all video URLs in each category
    const signedResults = Object.fromEntries(
      Object.entries(data.result).map(([category, vemes]) => [
        category,
        vemes.map(veme => {
          const signedUrl = getSignedUrl({
            url: veme.suggested_clip.veme_url,
            keyPairId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
            privateKey: process.env.NEXT_PUBLIC_AWS_PRIVATE_KEY!,
            dateLessThan: new Date(
              (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
            ).toISOString(),
          });

          // Also sign the thumbnail URL if present
          let signedThumbUrl = veme.suggested_clip.clip_s3_thumburl;
          if (signedThumbUrl) {
            signedThumbUrl = getSignedUrl({
              url: signedThumbUrl,
              keyPairId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
              privateKey: process.env.NEXT_PUBLIC_AWS_PRIVATE_KEY!,
              dateLessThan: new Date(
                (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
              ).toISOString(),
            });
          }

          return {
            ...veme,
            suggested_clip: {
              ...veme.suggested_clip,
              veme_url: signedUrl,
              ...(signedThumbUrl && { clip_s3_thumburl: signedThumbUrl })
            }
          };
        })
      ])
    );

    // console.log("signed results, ", signedResults);
    // const firstClipDuration = Object.values(signedResults)[0][0].suggested_clip.veme_duration;
    // console.log("first clip duration, ", firstClipDuration);


    return {
      error_code: data.error_code,
      error_string: data.error_string,
      result: signedResults
    };

  } catch (error) {
    console.error("Error fetching trending vemes:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while fetching trending vemes");
  }
}

export async function createVemeFromTrendingTopic(input: {
  user_id: string;
  access_token: string;
  headline: string;
  trending_topic_text: string;
  keywords: string;
  emotion?: string;
  language?: string;
}) {
  try {
    const formData = new FormData();
    formData.append("user_id", input.user_id);
    formData.append("headline", input.headline);
    formData.append("trending_topic_text", input.trending_topic_text);
    formData.append("keywords", input.keywords);
    if (input.emotion) {
      formData.append("emotion", input.emotion);
    }
    if (input.language) {
      formData.append("language", input.language);
    }

    const response = await fetch(
      `${baseUrl}/home/create-vemes-from-trending-topic`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": input.access_token,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create veme from trending topic: ${response.status} ${errorData}`);
    }

    const data = await response.json();

    // Sign URLs in the response if they exist
    if (data.result && Array.isArray(data.result)) {
      for (const veme of data.result) {
        if (veme.veme_url) {
          try {
            const signedUrl = getSignedUrl({
              url: veme.veme_url,
              keyPairId: process.env.AWS_ACCESS_KEY_ID!,
              privateKey: process.env.AWS_PRIVATE_KEY!,
              dateLessThan: new Date(
                (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
              ).toISOString(),
            });
            veme.veme_link = signedUrl;
          } catch (error) {
            console.error("Error signing URL:", error);
          }
        }
      }
    }

    return data;
  } catch (error) {
    console.error("Error creating veme from trending topic:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while creating veme from trending topic");
  }
}

interface VemeDetailResponse {
  error_code: number;
  error_string: string;
  result: {
    veme_id: string;
    veme_url: string;
    veme_title?: string;
    header_text?: string;
    veme_hashtags?: string[];
    veme_description?: string;
    veme_date_seconds?: number;
    veme_user_id?: string;
    user_fullname?: string;
    user_profile_pic?: string;
    is_liked?: number;
    veme_like_count?: number;
    veme_views_count?: number;
    veme_comment_count?: number;
    veme_share_count?: number;
    veme_link?: string;
    // Add any other properties that might be in the response
  };
}

export async function getVeme(input: {
  user_id: string;
  veme_id: string;
  access_token: string;
}) {
  try {
    const response = await fetch(
      `${baseUrl}/veme/get-veme-detail?user_id=${input.user_id}&veme_id=${input.veme_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY ?? "",
          "Access-Token": input.access_token,
        },
      }
    );

    console.log("veme detail response, ", response);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to fetch veme: ${response.status} ${errorData}`
      );
    }

    const data = (await response.json()) as VemeDetailResponse;

    // Sign the video URL
    if (data.result && data.result.veme_url) {
      const signedUrl = getSignedUrl({
        url: data.result.veme_url,
        keyPairId: process.env.AWS_ACCESS_KEY_ID!,
        privateKey: process.env.AWS_PRIVATE_KEY!,
        dateLessThan: new Date(
          (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
        ).toISOString(),
      });

      console.log("signed url, ", signedUrl);

      // Store both URLs
      data.result.veme_link = signedUrl;
    }

    console.log("veme detail data, ", data);

    return data;
  } catch (error) {
    console.error("Error fetching veme:", error);
    throw error;
  }
}

interface GetUserVemesResponse {
  error_code: number;
  error_string: string;
  result: Array<{
    veme_id: string;
    veme_description: string;
    veme_url: string;
    veme_image: string;
    header_text: string;
    footer_text: string;
    add_to_bot_or_not: number;
    veme_create_date: number;
    veme_user_id: string;
    veme_width: number;
    veme_height: number;
    veme_size: number;
    veme_duration: number;
    remotion_payload: [];
    veme_link?: string;
  }>;
  next_count: number;
  next_url: string;
}

export async function getUserVemes(input: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  try {
    if (!input.user_id || !input.access_token) {
      console.error("Missing required parameters user_id or access_token");
      return {
        error_code: 400,
        error_string: "Missing required parameters",
        result: [],
        next_count: 0,
        next_url: ""
      };
    }

    // Create an AbortController to implement timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(
        `${baseUrl}/veme/get-user-vemes?user_id=${input.user_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            "Api-Key": VEME_API_KEY!,
            "Access-Token": input.access_token,
          },
          signal: controller.signal
        }
      );

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("API Error Response:", errorData);
        
        return {
          error_code: response.status,
          error_string: `API Error: ${response.statusText}. ${errorData}`,
          result: [],
          next_count: 0,
          next_url: ""
        };
      }

      const data = (await response.json()) as GetUserVemesResponse;

      // Process each veme_url in the result array
      if (data.result && Array.isArray(data.result)) {
        for (const veme of data.result) {
          if (veme.veme_url) {
            try {
              // Sign the veme_url
              const signedUrl = getSignedUrl({
                url: veme.veme_url,
                keyPairId: process.env.AWS_ACCESS_KEY_ID!,
                privateKey: process.env.AWS_PRIVATE_KEY!,
                dateLessThan: new Date(
                  (Math.floor(Date.now() / 1000) + 60 * 60 * 24) * 1000
                ).toISOString(),
              });

              // Store both URLs
              veme.veme_link = signedUrl;
            } catch (error) {
              console.error("Error signing URL:", error);
              // Continue even if signing fails - we'll use the original URL
            }
          }
        }
      }

      return data;
    } catch (caughtError: unknown) {
      // Make sure to clear the timeout if there's an error
      clearTimeout(timeoutId);
      
      // Check for AbortError in a type-safe way
      const isAbortError = caughtError instanceof Error && 
                           caughtError.name === 'AbortError';
                           
      if (isAbortError) {
        console.error("Request timed out");
        return {
          error_code: 408,
          error_string: "Request timeout. Please try again.",
          result: [],
          next_count: 0,
          next_url: ""
        };
      }
      
      throw caughtError; // Re-throw other errors
    }
  } catch (caughtError: unknown) {
    console.error("Error fetching user vemes:", caughtError);
    
    let errorMessage = 'Unknown error';
    if (caughtError instanceof Error) {
      errorMessage = caughtError.message;
    }
    
    // Return a structured error response instead of throwing
    return {
      error_code: 500,
      error_string: `Error fetching vemes: ${errorMessage}`,
      result: [],
      next_count: 0,
      next_url: ""
    };
  }
}

export async function regenerateProUserTrendingVemes({
  user_id,
  access_token,
  language = "en",
}: {
  user_id: string;
  access_token: string;
  language?: string;
}) {
  console.log("Regenerating pro user trending vemes...");
  console.log("User ID:", user_id);
  console.log("Language:", language);

  try {
    // Build query parameters
    const params = new URLSearchParams({
      user_id,
      language,
    });

    const response = await fetch(
      `${baseUrl}/home/regenerate-pro-user-trending-vemes`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Api-Key": VEME_API_KEY!,
          "Access-Token": access_token,
        },
        body: params,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(
        `Failed to regenerate vemes: ${response.status} ${errorData}`
      );
    }

    console.log("Successfully regenerated vemes");
    const data = await response.json();
    console.log("Regenerated vemes data, ", data);
    return data;

  } catch (error) {
    console.error("Error regenerating pro user trending vemes:", error);
    throw error;
  }
}
