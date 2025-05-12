import { z } from "zod";
import { Schema } from '../amplify/data/resource';
import React from "react";

import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

const zodStringDate = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, should be YYYY-MM-DD")
    .describe("The date in YYYY-MM-DD format")



// export type Message = (
//     Schema["ChatMessage"]["createType"]
// )
export type Message = Omit<Schema["ChatMessage"]["createType"], "role"> & {
    role?: "human" | "ai" | "tool" | "ai-stream" | null | undefined;
  };


export type PublishMessageCommandInput = {
    chatSessionId: string,
    fieldName: string,
    owner: string,
    message: HumanMessage | AIMessage | ToolMessage,
    responseComplete?: boolean,
}
