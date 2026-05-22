import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import request from "supertest";
import app from "../index";
import {
    AUTH_COOKIE_NAME,
    signAuthToken,
} from "../utils/authToken";
import prisma from "../utils/prisma";

const user = {
    id: "ai-route-user",
    name: "AI Route User",
    email: "ai-route@example.com",
};

function authCookie() {
    return `${AUTH_COOKIE_NAME}=${signAuthToken({ userId: user.id })}`;
}

let originalFindUser: typeof prisma.user.findUnique;
let originalExpenseFindMany: typeof prisma.expense.findMany;
let previousApiKey: string | undefined;

beforeEach(() => {
    originalFindUser = prisma.user.findUnique;
    originalExpenseFindMany = prisma.expense.findMany;
    previousApiKey = process.env.OPENAI_API_KEY;

    delete process.env.OPENAI_API_KEY;
    prisma.user.findUnique = (() =>
        Promise.resolve(user)) as unknown as typeof prisma.user.findUnique;
    prisma.expense.findMany = (() =>
        Promise.resolve([
            {
                id: "gas-1",
                amount: 60,
                category: "Transportation",
                subcategory: "Gas",
                description: "Gas",
                merchant: "Shell",
                date: new Date(Date.UTC(2026, 4, 15)),
                userId: user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "refund-1",
                amount: 35,
                category: "Income",
                subcategory: "Refund",
                description: "Returned item",
                merchant: null,
                date: new Date(Date.UTC(2026, 4, 16)),
                userId: user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ])) as unknown as typeof prisma.expense.findMany;
});

afterEach(() => {
    prisma.user.findUnique = originalFindUser;
    prisma.expense.findMany = originalExpenseFindMany;
    if (previousApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
    } else {
        process.env.OPENAI_API_KEY = previousApiKey;
    }
});

test("Quick Add endpoint falls back to deterministic parsing without OpenAI", async () => {
    const response = await request(app)
        .post("/api/ai/parse-expense")
        .set("Cookie", authCookie())
        .send({ text: "Shell gas $60 today" });

    assert.equal(response.status, 200);
    assert.equal(response.body.amount, 60);
    assert.equal(response.body.category, "Transportation");
    assert.equal(response.body.subcategory, "Gas");
    assert.equal(response.body.merchant, "Shell");
});

test("Ask endpoint returns grounded answers without exposing OpenAI to the client", async () => {
    const response = await request(app)
        .post("/api/ai/ask")
        .set("Cookie", authCookie())
        .send({ question: "How much did I spend on gas this month?" });

    assert.equal(response.status, 200);
    assert.equal(response.body.intent, "category_total");
    assert.equal(response.body.data.amount, 60);
    assert.match(response.body.answer, /\$60\.00/);
});

test("Ask endpoint answers refund income questions by Income subcategory", async () => {
    const response = await request(app)
        .post("/api/ai/ask")
        .set("Cookie", authCookie())
        .send({ question: "How much did I get in refunds this month?" });

    assert.equal(response.status, 200);
    assert.equal(response.body.intent, "income_total");
    assert.equal(response.body.data.income, 35);
    assert.equal(response.body.data.subcategory, "Refund");
});
