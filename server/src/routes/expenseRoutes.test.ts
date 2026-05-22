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
    id: "route-user",
    name: "Route User",
    email: "route@example.com",
};

function authCookie() {
    return `${AUTH_COOKIE_NAME}=${signAuthToken({ userId: user.id })}`;
}

const routeEntries = [
    {
        id: "expense-1",
        amount: 25,
        category: "Food & Drink",
        subcategory: null,
        description: "Lunch, with team",
        merchant: 'Cafe "One"',
        date: new Date(Date.UTC(2026, 4, 10)),
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "expense-2",
        amount: 40,
        category: "Transportation",
        subcategory: "Gas",
        description: "Gas refill",
        merchant: "Shell",
        date: new Date(Date.UTC(2026, 4, 10)),
        userId: user.id,
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
        date: new Date(Date.UTC(2026, 4, 11)),
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "income-2",
        amount: 50,
        category: "Income",
        subcategory: "Refund",
        description: "Returned item",
        merchant: null,
        date: new Date(Date.UTC(2026, 4, 11)),
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

let originalFindUser: typeof prisma.user.findUnique;
let originalExpenseFindMany: typeof prisma.expense.findMany;
let originalExpenseCreate: typeof prisma.expense.create;

beforeEach(() => {
    originalFindUser = prisma.user.findUnique;
    originalExpenseFindMany = prisma.expense.findMany;
    originalExpenseCreate = prisma.expense.create;

    prisma.user.findUnique = (() =>
        Promise.resolve(user)) as unknown as typeof prisma.user.findUnique;
    prisma.expense.findMany = (() =>
        Promise.resolve(routeEntries)) as unknown as typeof prisma.expense.findMany;
    prisma.expense.create = ((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
            id: "created-expense",
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
        })) as unknown as typeof prisma.expense.create;
});

afterEach(() => {
    prisma.user.findUnique = originalFindUser;
    prisma.expense.findMany = originalExpenseFindMany;
    prisma.expense.create = originalExpenseCreate;
});

test("protected expense routes reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/expenses");

    assert.equal(response.status, 401);
    assert.equal(response.body.error, "Authentication required");
});

test("expense creation scopes new entries to the authenticated user", async () => {
    const response = await request(app)
        .post("/api/expenses")
        .set("Cookie", authCookie())
        .send({
            amount: "42.50",
            category: "Transportation",
            subcategory: "Gas",
            description: "Gas refill",
            merchant: "Shell",
            date: "2026-05-12",
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.id, "created-expense");
    assert.equal(response.body.userId, user.id);
    assert.equal(response.body.amount, 42.5);
    assert.equal(response.body.category, "Transportation");
    assert.equal(response.body.subcategory, "Gas");
});

test("expense creation rejects non-positive amounts", async () => {
    const response = await request(app)
        .post("/api/expenses")
        .set("Cookie", authCookie())
        .send({
            amount: -1,
            category: "Food & Drink",
            date: "2026-05-12",
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Amount must be greater than zero");
});

test("summary separates spending, income, net, and counts", async () => {
    const response = await request(app)
        .get("/api/expenses/summary?startDate=2026-05-01&endDate=2026-05-31")
        .set("Cookie", authCookie());

    assert.equal(response.status, 200);
    assert.equal(response.body.total, 65);
    assert.equal(response.body.income, 1050);
    assert.equal(response.body.net, 985);
    assert.deepEqual(response.body.byCategory, {
        "Food & Drink": 25,
        Transportation: 40,
    });
    assert.equal(response.body.count, 2);
    assert.equal(response.body.incomeCount, 2);
});

test("insights returns period-based spending, income, trend, and top category", async () => {
    const response = await request(app)
        .get("/api/expenses/insights?startDate=2026-05-10&endDate=2026-05-11")
        .set("Cookie", authCookie());

    assert.equal(response.status, 200);
    assert.equal(response.body.totalSpending, 65);
    assert.equal(response.body.totalIncome, 1050);
    assert.equal(response.body.net, 985);
    assert.deepEqual(response.body.byCategory, [
        { category: "Transportation", amount: 40 },
        { category: "Food & Drink", amount: 25 },
    ]);
    assert.deepEqual(response.body.bySubcategory, [
        {
            category: "Transportation",
            subcategories: [{ subcategory: "Gas", amount: 40 }],
        },
        {
            category: "Income",
            subcategories: [
                { subcategory: "Salary", amount: 1000 },
                { subcategory: "Refund", amount: 50 },
            ],
        },
    ]);
    assert.deepEqual(response.body.dailyTrend, [
        { date: "2026-05-10", spending: 65, income: 0 },
        { date: "2026-05-11", spending: 0, income: 1050 },
    ]);
    assert.deepEqual(response.body.topCategory, {
        category: "Transportation",
        amount: 40,
    });
});

test("CSV export includes entries and escapes CSV fields", async () => {
    const response = await request(app)
        .get("/api/expenses/export?startDate=2026-05-01&endDate=2026-05-31")
        .set("Cookie", authCookie());

    assert.equal(response.status, 200);
    assert.match(response.text, /^Date,Category,Subcategory,Merchant,Description,Amount/);
    assert.match(response.text, /"Cafe ""One""","Lunch, with team",25/);
    assert.match(response.text, /2026-05-11,Income,Salary,,Pay,1000/);
    assert.match(response.text, /2026-05-11,Income,Refund,,Returned item,50/);
});
