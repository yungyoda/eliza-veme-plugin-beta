export interface VemeResponse {
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
        veme_link?: string;
    }>;
    gpt_captions: string[];
}

export interface LoginResponse {
    result: {
        user_id: string;
        "access-token": string;
        user_email: string;
        user_fullname: string;
        user_profile_thumb: string;
    };
}

export interface VemeService {
    login: () => Promise<LoginResponse>;
    createCaptionVeme: (userPrompt: string, emotion?: string) => Promise<VemeResponse>;
    getSignedUrl: (url: string) => string;
}