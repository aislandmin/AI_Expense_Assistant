import assert from "node:assert/strict";
import test from "node:test";
import {
    parseExpenseWithOpenAi,
    parseExpenseWithRules,
} from "./expenseParserService";

function toDateString(date: Date) {
    return date.toISOString().split("T")[0];
}

test("rule parser detects transportation gas details", () => {
    const parsedExpense = parseExpenseWithRules("Shell gas $50 yesterday");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    assert.deepEqual(parsedExpense, {
        amount: 50,
        category: "Transportation",
        subcategory: "Gas",
        description: "Shell gas $50 yesterday",
        merchant: "Shell",
        date: toDateString(yesterday),
    });
});

test("rule parser separates income from spending categories", () => {
    const parsedExpense = parseExpenseWithRules("salary 2500 today");

    assert.equal(parsedExpense?.amount, 2500);
    assert.equal(parsedExpense?.category, "Income");
    assert.equal(parsedExpense?.subcategory, "Salary");
    assert.equal(parsedExpense?.merchant, null);
});

test("rule parser classifies refunds as income with a refund subcategory", () => {
    const parsedExpense = parseExpenseWithRules("refund 45 for returned shoes");

    assert.equal(parsedExpense?.amount, 45);
    assert.equal(parsedExpense?.category, "Income");
    assert.equal(parsedExpense?.subcategory, "Refund");
    assert.equal(parsedExpense?.description, "refund 45 for returned shoes");
});

test("rule parser returns null when no amount is present", () => {
    assert.equal(parseExpenseWithRules("coffee at Starbucks"), null);
});

test("OpenAI parser returns null when API key is not configured", async () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
        assert.equal(await parseExpenseWithOpenAi("coffee $5"), null);
    } finally {
        process.env.OPENAI_API_KEY = previousApiKey;
    }
});
