import express from "express";
import {
    parseExpenseWithOpenAi,
    parseExpenseWithRules,
} from "../services/expenseParserService";

import { answerFinancialQuestion } from "../services/financialAskService";
import { AuthenticatedRequest } from "../types/authenticatedRequest";

const router = express.Router();

router.post("/parse-expense", async (req, res) => {
    const { text } = req.body;

    if (typeof text !== "string" || text.trim() === "") {
        res.status(400).json({ error: "Text is required" });
        return;
    }

    try {
        const aiParsedExpense = await parseExpenseWithOpenAi(text.trim());

        if (aiParsedExpense) {
            res.json(aiParsedExpense);
            return;
        }
    } catch (error) {
        console.error("OpenAI parser failed. Falling back to rules.", error);
    }

    const fallbackParsedExpense = parseExpenseWithRules(text.trim());

    if (!fallbackParsedExpense) {
        res.status(400).json({
            error: "Could not parse the expense. Try something like 'Gas $50 today'.",
        });
        return;
    }

    res.json(fallbackParsedExpense);
});

router.post("/ask", async (req, res) => {
    const { question } = req.body;

    if (typeof question !== "string" || question.trim() === "") {
        res.status(400).json({ error: "Question text is required" });
        return;
    }

    try {
        const userId = (req as AuthenticatedRequest).user?.id;

        if (!userId) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        const answer = await answerFinancialQuestion(question.trim(), userId);
        res.json(answer);
    } catch (error) {
        console.error("Failed to answer financial question", error);
        res.status(500).json({ error: "Failed to answer question" });
    }
});

export default router;
