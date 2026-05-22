import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { answerFinancialQuestion } from "./financialAskService";
import prisma from "../utils/prisma";

const userId = "test-user";

const sampleEntries = [
    {
        id: "expense-1",
        amount: 50,
        category: "Transportation",
        subcategory: "Gas",
        description: "Gas",
        merchant: "Shell",
        date: new Date(Date.UTC(2026, 4, 1)),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "expense-2",
        amount: 30,
        category: "Food & Drink",
        subcategory: null,
        description: "Lunch",
        merchant: null,
        date: new Date(Date.UTC(2026, 4, 2)),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "income-1",
        amount: 1000,
        category: "Income",
        subcategory: "Salary",
        description: "Pay",
        merchant: null,
        date: new Date(Date.UTC(2026, 4, 3)),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "refund-1",
        amount: 100,
        category: "Income",
        subcategory: "Refund",
        description: "Returned shoes",
        merchant: null,
        date: new Date(Date.UTC(2026, 4, 4)),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

let originalFindMany: typeof prisma.expense.findMany;
let previousApiKey: string | undefined;

beforeEach(() => {
    originalFindMany = prisma.expense.findMany;
    previousApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    prisma.expense.findMany = (() =>
        Promise.resolve(sampleEntries)) as unknown as typeof prisma.expense.findMany;
});

afterEach(() => {
    prisma.expense.findMany = originalFindMany;
    if (previousApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
    } else {
        process.env.OPENAI_API_KEY = previousApiKey;
    }
});

test("Ask AI answers gas spending using category and subcategory filters", async () => {
    const response = await answerFinancialQuestion(
        "How much did I spend on gas this month?",
        userId
    );

    assert.equal(response.intent, "category_total");
    assert.equal(response.data.category, "Transportation");
    assert.equal(response.data.subcategory, "Gas");
    assert.equal(response.data.amount, 50);
    assert.equal(response.data.count, 1);
    assert.match(response.answer, /\$50\.00/);
});

test("Ask AI monthly summary excludes income from spending totals", async () => {
    const response = await answerFinancialQuestion("summarize this month", userId);

    assert.equal(response.intent, "monthly_summary");
    assert.equal(response.data.total, 80);
    assert.equal(response.data.income, 1100);
    assert.equal(response.data.net, 1020);
    assert.deepEqual(response.data.byCategory, {
        Transportation: 50,
        "Food & Drink": 30,
    });
    assert.equal(response.data.count, 2);
    assert.equal(response.data.incomeCount, 2);
});

test("Ask AI filters income totals by refund subcategory", async () => {
    const response = await answerFinancialQuestion(
        "How much did I get in refunds this month?",
        userId
    );

    assert.equal(response.intent, "income_total");
    assert.equal(response.data.income, 100);
    assert.equal(response.data.subcategory, "Refund");
    assert.equal(response.data.count, 1);
    assert.match(response.answer, /\$100\.00/);
    assert.match(response.answer, /refunds/);
});

test("Ask AI reports the highest spending category only from spending entries", async () => {
    const response = await answerFinancialQuestion("where is my money going?", userId);

    assert.equal(response.intent, "top_category");
    assert.equal(response.data.category, "Transportation");
    assert.equal(response.data.amount, 50);
});
