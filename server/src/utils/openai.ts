import OpenAI from "openai";

let openai: OpenAI | null = null;

export function getOpenAiClient() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return null;
    }

    if (!openai) {
        openai = new OpenAI({ apiKey });
    }

    return openai;
}

