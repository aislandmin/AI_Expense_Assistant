import prisma from "../utils/prisma";
import { getOpenAiClient } from "../utils/openai";

type AskIntent =
    | "category_total"
    | "spending_total"
    | "income_total"
    | "compare_months"
    | "top_category"
    | "monthly_summary"
    | "unsupported";

type AskPeriod = "today" | "yesterday" | "this_month" | "last_month";

interface ParsedAskIntent {
    intent: AskIntent;
    category: string | null;
    subcategory: string | null;
    period: AskPeriod;
    month: number | null;
}

interface DateRange {
    year: number;
    month: number | null;
    startDate: Date;
    endDate: Date;
    label: string;
}

export interface AskResponse {
    intent: AskIntent;
    answer: string;
    data: Record<string, unknown>;
}

const categoryAliases: Record<string, string> = {
    bill: "Bills & Utilities",
    bills: "Bills & Utilities",
    clothing: "Clothing",
    clothes: "Clothing",
    coffee: "Food & Drink",
    dining: "Food & Drink",
    food: "Food & Drink",
    gas: "Transportation",
    groceries: "Groceries",
    grocery: "Groceries",
    health: "Health",
    home: "Home & Rent",
    housing: "Home & Rent",
    income: "Income",
    rent: "Home & Rent",
    refund: "Income",
    refunds: "Income",
    return: "Income",
    returned: "Income",
    reimbursed: "Income",
    reimbursement: "Income",
    shopping: "Other",
    transportation: "Transportation",
    travel: "Travel",
    utilities: "Bills & Utilities",
};

const subcategoryAliases: Record<string, string> = {
    electricity: "Electricity",
    fuel: "Gas",
    gas: "Gas",
    hydro: "Electricity",
    insurance: "Insurance",
    internet: "Internet",
    parking: "Parking",
    phone: "Phone",
    pay: "Salary",
    paycheck: "Salary",
    refund: "Refund",
    refunds: "Refund",
    return: "Refund",
    returned: "Refund",
    reimbursed: "Reimbursement",
    reimbursement: "Reimbursement",
    salary: "Salary",
    subscription: "Subscription",
    transit: "Transit",
    bus: "Transit",
    rideshare: "Rideshare",
    uber: "Rideshare",
    taxi: "Taxi",
    maintenance: "Maintenance",
    water: "Water",
    gift: "Gift",
};

const allowedCategories = [
    "Groceries",
    "Food & Drink",
    "Transportation",
    "Bills & Utilities",
    "Home & Rent",
    "Clothing",
    "Health",
    "Education",
    "Entertainment",
    "Travel",
    "Income",
    "Other",
];

const monthNames: Record<string, number> = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12,
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(amount);
}

function normalizeText(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9& ]/g, " ");
}

function getMonthRange(offset = 0): DateRange {
    const now = new Date();
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth() + offset;
    const startDate = new Date(Date.UTC(year, monthIndex, 1));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 1));

    return {
        year: startDate.getUTCFullYear(),
        month: startDate.getUTCMonth() + 1,
        startDate,
        endDate,
        label: getMonthLabel(startDate),
    };
}

function getNamedMonthRange(month: number): DateRange {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    return {
        year,
        month,
        startDate,
        endDate,
        label: getMonthLabel(startDate),
    };
}

function getDayRange(offset: number): DateRange {
    const now = new Date();
    const startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)
    );
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    return {
        year: startDate.getUTCFullYear(),
        month: startDate.getUTCMonth() + 1,
        startDate,
        endDate,
        label: offset === -1 ? "yesterday" : "today",
    };
}

function getRequestedRange(parsedIntent: ParsedAskIntent) {
    if (parsedIntent.month) {
        return getNamedMonthRange(parsedIntent.month);
    }

    const { period } = parsedIntent;
    if (period === "yesterday") {
        return getDayRange(-1);
    }

    if (period === "today") {
        return getDayRange(0);
    }

    return period === "last_month" ? getMonthRange(-1) : getMonthRange(0);
}

function getMonthLabel(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function parseCategory(question: string) {
    const normalizedQuestion = normalizeText(question);
    const match = Object.entries(categoryAliases).find(([keyword]) =>
        normalizedQuestion.includes(keyword)
    );

    return match?.[1] ?? null;
}

function parseSubcategory(question: string) {
    const normalizedQuestion = normalizeText(question);
    const match = Object.entries(subcategoryAliases).find(([keyword]) =>
        normalizedQuestion.includes(keyword)
    );

    return match?.[1] ?? null;
}

function canonicalizeSubcategory(subcategory: string | null) {
    if (!subcategory) {
        return null;
    }

    const normalizedSubcategory = normalizeText(subcategory).replace(/\s/g, "");
    const matchingAlias = Object.entries(subcategoryAliases).find(([, value]) =>
        normalizeText(value).replace(/\s/g, "") === normalizedSubcategory
    );

    return matchingAlias?.[1] ?? subcategory;
}

function getCategoryForSubcategory(subcategory: string) {
    if (
        [
            "Electricity",
            "Insurance",
            "Internet",
            "Phone",
            "Subscription",
            "Water",
        ].includes(subcategory)
    ) {
        return "Bills & Utilities";
    }

    if (["Salary", "Refund", "Reimbursement", "Gift"].includes(subcategory)) {
        return "Income";
    }

    return "Transportation";
}

function parsePeriod(question: string): AskPeriod {
    const normalizedQuestion = normalizeText(question);

    if (normalizedQuestion.includes("yesterday")) {
        return "yesterday";
    }

    if (normalizedQuestion.includes("today")) {
        return "today";
    }

    return normalizedQuestion.includes("last month") ? "last_month" : "this_month";
}

function parseMonth(question: string) {
    const normalizedQuestion = normalizeText(question);
    const match = Object.entries(monthNames).find(([monthName]) =>
        normalizedQuestion.includes(monthName)
    );

    return match?.[1] ?? null;
}

function isIncomeQuestion(normalizedQuestion: string) {
    return (
        normalizedQuestion.includes("income") ||
        normalizedQuestion.includes("salary") ||
        normalizedQuestion.includes("refund") ||
        normalizedQuestion.includes("return") ||
        normalizedQuestion.includes("reimbursed") ||
        normalizedQuestion.includes("reimbursement") ||
        normalizedQuestion.includes("gift") ||
        normalizedQuestion.includes("earned") ||
        normalizedQuestion.includes("get paid") ||
        normalizedQuestion.includes("got paid") ||
        normalizedQuestion.includes("money came in") ||
        normalizedQuestion.includes("how much did i get")
    );
}

async function findExpensesForRange(dateRange: DateRange, userId: string) {
    return prisma.expense.findMany({
        where: {
            userId,
            date: {
                gte: dateRange.startDate,
                lt: dateRange.endDate,
            },
        },
    });
}

function splitIncomeAndSpending(expenses: Awaited<ReturnType<typeof findExpensesForRange>>) {
    const spending = expenses.filter(
        (expense) => expense.category !== "Income"
    );
    const income = expenses.filter(
        (expense) => expense.category === "Income"
    );

    return { spending, income };
}

function sumExpenses(expenses: Awaited<ReturnType<typeof findExpensesForRange>>) {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function getByCategory(expenses: Awaited<ReturnType<typeof findExpensesForRange>>) {
    return expenses.reduce<Record<string, number>>((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
    }, {});
}

function parseRuleBasedIntent(question: string): ParsedAskIntent {
    const normalizedQuestion = normalizeText(question);
    const period = parsePeriod(question);
    const month = parseMonth(question);

    if (isIncomeQuestion(normalizedQuestion)) {
        return {
            intent: "income_total",
            category: "Income",
            subcategory: parseSubcategory(question),
            period,
            month,
        };
    }

    if (
        (normalizedQuestion.includes("how much") ||
            normalizedQuestion.includes("total")) &&
        (normalizedQuestion.includes("spend") ||
            normalizedQuestion.includes("spent")) &&
        !parseCategory(question)
    ) {
        return {
            intent: "spending_total",
            category: null,
            subcategory: null,
            period,
            month,
        };
    }

    if (
        normalizedQuestion.includes("compare") ||
        normalizedQuestion.includes("more this month") ||
        normalizedQuestion.includes("this month than last month")
    ) {
        return {
            intent: "compare_months",
            category: null,
            subcategory: null,
            period,
            month,
        };
    }

    if (
        normalizedQuestion.includes("most") ||
        normalizedQuestion.includes("top category") ||
        normalizedQuestion.includes("cost the most") ||
        normalizedQuestion.includes("where is my money going")
    ) {
        return {
            intent: "top_category",
            category: null,
            subcategory: null,
            period,
            month,
        };
    }

    if (
        normalizedQuestion.includes("summary") ||
        normalizedQuestion.includes("summarize") ||
        normalizedQuestion.includes("how am i doing")
    ) {
        return {
            intent: "monthly_summary",
            category: null,
            subcategory: null,
            period,
            month,
        };
    }

    if (
        normalizedQuestion.includes("how much") ||
        normalizedQuestion.includes("total")
    ) {
        return {
            intent: "category_total",
            category: parseCategory(question),
            subcategory: parseSubcategory(question),
            period,
            month,
        };
    }

    return {
        intent: "unsupported",
        category: null,
        subcategory: null,
        period,
        month,
    };
}

function validateParsedAskIntent(value: unknown): ParsedAskIntent | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const parsedValue = value as Partial<ParsedAskIntent>;

    if (
        parsedValue.intent !== "category_total" &&
        parsedValue.intent !== "spending_total" &&
        parsedValue.intent !== "income_total" &&
        parsedValue.intent !== "compare_months" &&
        parsedValue.intent !== "top_category" &&
        parsedValue.intent !== "monthly_summary" &&
        parsedValue.intent !== "unsupported"
    ) {
        return null;
    }

    if (
        parsedValue.period !== "this_month" &&
        parsedValue.period !== "last_month" &&
        parsedValue.period !== "today" &&
        parsedValue.period !== "yesterday"
    ) {
        return null;
    }

    if (
        parsedValue.category !== null &&
        parsedValue.category !== undefined &&
        (typeof parsedValue.category !== "string" ||
            !allowedCategories.includes(parsedValue.category))
    ) {
        return null;
    }

    if (
        parsedValue.subcategory !== null &&
        parsedValue.subcategory !== undefined &&
        typeof parsedValue.subcategory !== "string"
    ) {
        return null;
    }

    if (
        parsedValue.month !== null &&
        parsedValue.month !== undefined &&
        (!Number.isInteger(parsedValue.month) ||
            parsedValue.month < 1 ||
            parsedValue.month > 12)
    ) {
        return null;
    }

    return {
        intent: parsedValue.intent,
        category: parsedValue.category ?? null,
        subcategory: parsedValue.subcategory ?? null,
        period: parsedValue.period,
        month: parsedValue.month ?? null,
    };
}

function applyQuestionOverrides(
    question: string,
    parsedIntent: ParsedAskIntent
): ParsedAskIntent {
    const category = parseCategory(question);
    const subcategory = parseSubcategory(question);

    if (
        category &&
        (parsedIntent.intent === "spending_total" ||
            (parsedIntent.intent === "category_total" && !parsedIntent.category))
    ) {
        return {
            ...parsedIntent,
            intent: "category_total",
            category,
            subcategory: canonicalizeSubcategory(subcategory),
        };
    }

    if (
        subcategory &&
        (parsedIntent.intent === "spending_total" ||
            parsedIntent.intent === "income_total")
    ) {
        const category = getCategoryForSubcategory(subcategory);
        return {
            ...parsedIntent,
            intent: category === "Income" ? "income_total" : "category_total",
            category,
            subcategory: canonicalizeSubcategory(subcategory),
        };
    }

    return parsedIntent;
}

async function parseAskIntentWithOpenAi(
    question: string
): Promise<ParsedAskIntent | null> {
    const openai = getOpenAiClient();

    if (!openai) {
        return null;
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await openai.chat.completions.create({
        model,
        messages: [
            {
                role: "system",
                content:
                        `Classify one personal finance question into a structured intent. Do not calculate or invent financial data. Choose category only from: ${allowedCategories.join(", ")}. If the question asks total spending without a category, use spending_total. If the question asks about gas, parking, transit, rideshare, taxi, or maintenance, use category Transportation and set subcategory to the specific transportation type. If the question asks about phone, internet, water, electricity, insurance, or subscription bills, use category Bills & Utilities and set the matching subcategory. If the question asks about eating out, restaurants, coffee, lunch, dinner, or food spending, use Food & Drink. If it asks about income, salary, getting paid, earned money, refunds, reimbursements, gifts, or money coming in, use income_total and category Income. For Income, set subcategory to Salary, Refund, Reimbursement, Gift, or Other when obvious. If it asks where money is going or biggest spending, use top_category. If the user says today or yesterday, set period accordingly. If the user names a month like April, set month to that month number. If no supported intent fits, use unsupported.`,
            },
            {
                role: "user",
                content: question,
            },
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "financial_question_intent",
                strict: true,
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        intent: {
                            type: "string",
                            enum: [
                                "category_total",
                                "spending_total",
                                "income_total",
                                "compare_months",
                                "top_category",
                                "monthly_summary",
                                "unsupported",
                            ],
                        },
                        category: {
                            anyOf: [
                                {
                                    type: "string",
                                    enum: allowedCategories,
                                },
                                { type: "null" },
                            ],
                        },
                        subcategory: {
                            anyOf: [{ type: "string" }, { type: "null" }],
                            description:
                                "Optional subcategory such as Gas, Parking, Transit, Rideshare, Taxi, Maintenance, Salary, Refund, Reimbursement, or Gift.",
                        },
                        period: {
                            type: "string",
                            enum: [
                                "today",
                                "yesterday",
                                "this_month",
                                "last_month",
                            ],
                        },
                        month: {
                            anyOf: [
                                {
                                    type: "integer",
                                    minimum: 1,
                                    maximum: 12,
                                },
                                { type: "null" },
                            ],
                            description:
                                "Numeric month from 1 to 12 when the user names a month like April. Otherwise null.",
                        },
                    },
                    required: [
                        "intent",
                        "category",
                        "subcategory",
                        "period",
                        "month",
                    ],
                },
            },
        },
    });

    const content = response.choices[0]?.message?.content;

    if (typeof content !== "string") {
        return null;
    }

    return validateParsedAskIntent(JSON.parse(content));
}

async function answerCategoryTotal(
    parsedIntent: ParsedAskIntent,
    userId: string
): Promise<AskResponse> {
    const category = parsedIntent.category;

    if (!category) {
        return {
            intent: "category_total",
            answer:
                "I can answer that once I can identify the category. Try asking about Food & Drink, Transportation, Groceries, Bills & Utilities, or another saved category.",
            data: {},
        };
    }

    const dateRange = getRequestedRange(parsedIntent);
    const expenses = await findExpensesForRange(dateRange, userId);
    const categoryExpenses = expenses.filter(
        (expense) =>
            expense.category === category &&
            (!parsedIntent.subcategory ||
                expense.subcategory === parsedIntent.subcategory)
    );
    const amount = sumExpenses(categoryExpenses);
    const categoryLabel = parsedIntent.subcategory
        ? `${category} / ${parsedIntent.subcategory}`
        : category;

    return {
        intent: "category_total",
        answer: `You spent ${formatCurrency(amount)} on ${categoryLabel} for ${dateRange.label}.`,
        data: {
            category,
            subcategory: parsedIntent.subcategory,
            amount,
            year: dateRange.year,
            month: dateRange.month,
            count: categoryExpenses.length,
        },
    };
}

async function answerSpendingTotal(
    parsedIntent: ParsedAskIntent,
    userId: string
): Promise<AskResponse> {
    const dateRange = getRequestedRange(parsedIntent);
    const expenses = await findExpensesForRange(dateRange, userId);
    const { spending } = splitIncomeAndSpending(expenses);
    const total = sumExpenses(spending);

    return {
        intent: "spending_total",
        answer: `You spent ${formatCurrency(total)} for ${dateRange.label}.`,
        data: {
            year: dateRange.year,
            month: dateRange.month,
            total,
            count: spending.length,
            period: parsedIntent.period,
        },
    };
}

async function answerIncomeTotal(
    parsedIntent: ParsedAskIntent,
    userId: string
): Promise<AskResponse> {
    const dateRange = getRequestedRange(parsedIntent);
    const expenses = await findExpensesForRange(dateRange, userId);
    const incomeEntries = expenses.filter(
        (expense) =>
            expense.category === "Income" &&
            (!parsedIntent.subcategory ||
                expense.subcategory === parsedIntent.subcategory)
    );
    const income = sumExpenses(incomeEntries);
    const incomeLabels: Record<string, string> = {
        Gift: "gifts",
        Refund: "refunds",
        Reimbursement: "reimbursements",
        Salary: "salary",
    };
    const incomeLabel = parsedIntent.subcategory
        ? incomeLabels[parsedIntent.subcategory] ?? parsedIntent.subcategory.toLowerCase()
        : "income";

    return {
        intent: "income_total",
        answer: `You recorded ${formatCurrency(income)} in ${incomeLabel} for ${dateRange.label}.`,
        data: {
            year: dateRange.year,
            month: dateRange.month,
            income,
            subcategory: parsedIntent.subcategory,
            count: incomeEntries.length,
        },
    };
}

async function answerCompareMonths(userId: string): Promise<AskResponse> {
    const thisMonth = getMonthRange(0);
    const lastMonth = getMonthRange(-1);
    const [thisMonthExpenses, lastMonthExpenses] = await Promise.all([
        findExpensesForRange(thisMonth, userId),
        findExpensesForRange(lastMonth, userId),
    ]);

    const thisMonthTotal = sumExpenses(
        splitIncomeAndSpending(thisMonthExpenses).spending
    );
    const lastMonthTotal = sumExpenses(
        splitIncomeAndSpending(lastMonthExpenses).spending
    );
    const difference = thisMonthTotal - lastMonthTotal;
    const thisMonthLabel = thisMonth.label;
    const lastMonthLabel = lastMonth.label;

    let comparison = `You spent the same amount in ${thisMonthLabel} as ${lastMonthLabel}.`;

    if (difference > 0) {
        comparison = `You spent ${formatCurrency(difference)} more in ${thisMonthLabel} than ${lastMonthLabel}.`;
    }

    if (difference < 0) {
        comparison = `You spent ${formatCurrency(Math.abs(difference))} less in ${thisMonthLabel} than ${lastMonthLabel}.`;
    }

    return {
        intent: "compare_months",
        answer: `${comparison} ${thisMonthLabel}: ${formatCurrency(thisMonthTotal)}. ${lastMonthLabel}: ${formatCurrency(lastMonthTotal)}.`,
        data: {
            thisMonth: {
                year: thisMonth.year,
                month: thisMonth.month,
                total: thisMonthTotal,
            },
            lastMonth: {
                year: lastMonth.year,
                month: lastMonth.month,
                total: lastMonthTotal,
            },
            difference,
        },
    };
}

async function answerTopCategory(
    parsedIntent: ParsedAskIntent,
    userId: string
): Promise<AskResponse> {
    const dateRange = getRequestedRange(parsedIntent);
    const expenses = await findExpensesForRange(dateRange, userId);
    const { spending } = splitIncomeAndSpending(expenses);
    const byCategory = getByCategory(spending);
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    if (!topCategory) {
        return {
            intent: "top_category",
            answer: `I did not find any spending records for ${dateRange.label}.`,
            data: {
                year: dateRange.year,
                month: dateRange.month,
                byCategory,
            },
        };
    }

    return {
        intent: "top_category",
        answer: `Your highest spending category for ${dateRange.label} was ${topCategory[0]} at ${formatCurrency(topCategory[1])}.`,
        data: {
            category: topCategory[0],
            amount: topCategory[1],
            year: dateRange.year,
            month: dateRange.month,
            byCategory,
        },
    };
}

async function answerMonthlySummary(
    parsedIntent: ParsedAskIntent,
    userId: string
): Promise<AskResponse> {
    const dateRange = getRequestedRange(parsedIntent);
    const expenses = await findExpensesForRange(dateRange, userId);
    const { spending, income } = splitIncomeAndSpending(expenses);
    const total = sumExpenses(spending);
    const incomeTotal = sumExpenses(income);
    const net = incomeTotal - total;
    const byCategory = getByCategory(spending);

    return {
        intent: "monthly_summary",
        answer: `For ${dateRange.label}, you spent ${formatCurrency(total)}, recorded ${formatCurrency(incomeTotal)} in income, and your net was ${formatCurrency(net)}.`,
        data: {
            year: dateRange.year,
            month: dateRange.month,
            total,
            income: incomeTotal,
            net,
            byCategory,
            count: spending.length,
            incomeCount: income.length,
        },
    };
}

async function executeParsedIntent(
    parsedIntent: ParsedAskIntent,
    userId: string
): Promise<AskResponse> {
    const { intent } = parsedIntent;

    if (intent === "category_total") {
        return answerCategoryTotal(parsedIntent, userId);
    }

    if (intent === "spending_total") {
        return answerSpendingTotal(parsedIntent, userId);
    }

    if (intent === "income_total") {
        return answerIncomeTotal(parsedIntent, userId);
    }

    if (intent === "compare_months") {
        return answerCompareMonths(userId);
    }

    if (intent === "top_category") {
        return answerTopCategory(parsedIntent, userId);
    }

    if (intent === "monthly_summary") {
        return answerMonthlySummary(parsedIntent, userId);
    }

    return {
        intent: "unsupported",
        answer:
            "I can answer spending totals by category, compare this month with last month, find your top category, or summarize monthly spending.",
        data: {
            supportedIntents: [
                "category_total",
                "spending_total",
                "income_total",
                "compare_months",
                "top_category",
                "monthly_summary",
            ],
        },
    };
}

export async function answerFinancialQuestion(
    question: string,
    userId: string
): Promise<AskResponse> {
    try {
        const aiParsedIntent = await parseAskIntentWithOpenAi(question);

        if (aiParsedIntent) {
            return executeParsedIntent(
                applyQuestionOverrides(question, aiParsedIntent),
                userId
            );
        }
    } catch (error) {
        console.error("OpenAI intent parser failed. Falling back to rules.", error);
    }

    return executeParsedIntent(
        applyQuestionOverrides(question, parseRuleBasedIntent(question)),
        userId
    );
}
