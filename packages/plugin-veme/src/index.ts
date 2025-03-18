import { IAgentRuntime } from "@elizaos/core";
import { validateVemeConfig } from "./environment";
import { createVemeService } from "./services";
import { vemeExamples } from "./examples";
import { createVemeActions } from "./actions";

export async function initializeVemePlugin(runtime: IAgentRuntime) {
    const config = await validateVemeConfig(runtime);
    const vemeService = createVemeService(config);

    // Register all actions
    const actions = createVemeActions(vemeService);
    actions.forEach(action => runtime.registerAction(action));

    return {
        examples: vemeExamples,
        service: vemeService
    };
}