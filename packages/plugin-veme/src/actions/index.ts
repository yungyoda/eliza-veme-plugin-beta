import { Action } from "@elizaos/core";
import { VemeService } from "../types";
import { createVemeAction } from "./createVeme";
import { postVemeAction } from "./postVeme";

export function createVemeActions(service: VemeService): Action[] {
    return [
        createVemeAction(service),
        postVemeAction(service)
    ];
}