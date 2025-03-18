import { ActionExample } from "@elizaos/core";

export const vemeExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you create a funny veme about AI?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll create a funny veme about AI taking over the world!",
                action: "CREATE_VEME",
                parameters: {
                    userPrompt: "Create a funny veme about AI taking over the world",
                    emotion: "funny"
                }
            },
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "I need some motivation today",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me create an inspiring veme to lift your spirits!",
                action: "CREATE_VEME",
                parameters: {
                    userPrompt: "Create a motivational veme about never giving up",
                    emotion: "motivational"
                }
            },
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you create a dramatic veme about climate change?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll create a dramatic veme to raise awareness about climate change.",
                action: "CREATE_VEME",
                parameters: {
                    userPrompt: "Create a dramatic veme about climate change",
                    emotion: "dramatic"
                }
            },
        }
    ]
];