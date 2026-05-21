import express from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest } from "../types/authenticatedRequest";

const router = express.Router();

function getUserId(req: express.Request) {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
        throw new Error("Authenticated user is missing");
    }

    return user.id;
}

function escapeCsvField(value: string | number | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    const escapedText = text.replace(/"/g, '""');

    if (/[",\r\n]/.test(escapedText)) {
        return `"${escapedText}"`;
    }

    return escapedText;
}

function formatCsvDate(date: Date) {
    return date.toISOString().split("T")[0];
}

function parseDateQuery(value: unknown) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
}

function parsePositiveIntegerQuery(
    value: unknown,
    fallback: number,
    max: number
) {
    const parsedValue = typeof value === "string" ? Number(value) : fallback;

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        return fallback;
    }

    return Math.min(parsedValue, max);
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}

function validateExpenseInput(body: {
    amount?: unknown;
    category?: unknown;
    subcategory?: unknown;
    description?: unknown;
    merchant?: unknown;
    date?: unknown;
}) {
    const { amount, category, subcategory, description, merchant, date } = body;

    if (amount === undefined || amount === null || category === undefined || !date) {
        return {
            error: "Amount, category, and date are required",
        };
    }

    const numericAmount = Number(amount);
    const expenseDate = new Date(String(date));

    if (!Number.isFinite(numericAmount)) {
        return { error: "Amount must be a valid number" };
    }

    if (typeof category !== "string" || category.trim() === "") {
        return { error: "Category must be a non-empty string" };
    }

    if (Number.isNaN(expenseDate.getTime())) {
        return { error: "Date must be a valid date" };
    }

    return {
        data: {
            amount: numericAmount,
            category: category.trim(),
            subcategory:
                typeof subcategory === "string" && subcategory.trim()
                    ? subcategory.trim()
                    : null,
            description:
                typeof description === "string" && description.trim()
                    ? description.trim()
                    : null,
            merchant:
                typeof merchant === "string" && merchant.trim()
                    ? merchant.trim()
                    : null,
            date: expenseDate,
        },
    };
}

router.post("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        const validationResult = validateExpenseInput(req.body);

        if ("error" in validationResult) {
            res.status(400).json({ error: validationResult.error });
            return;
        }

        const expense = await prisma.expense.create({
            data: {
                ...validationResult.data,
                userId,
            },
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create expense" });
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        const { limit, page, startDate, endDate } = req.query;
        const isPaginatedRequest = limit !== undefined || page !== undefined;
        const dateFilter: { gte?: Date; lt?: Date } = {};
        const orderBy = [
            {
                createdAt: "desc" as const,
            },
            {
                date: "desc" as const,
            },
        ];

        if (startDate || endDate) {
            const parsedStartDate = parseDateQuery(startDate);
            const parsedEndDate = parseDateQuery(endDate);

            if (!parsedStartDate || !parsedEndDate) {
                res.status(400).json({
                    error: "Valid startDate and endDate query parameters are required",
                });
                return;
            }

            if (parsedStartDate > parsedEndDate) {
                res.status(400).json({
                    error: "startDate must be before or equal to endDate",
                });
                return;
            }

            dateFilter.gte = parsedStartDate;
            dateFilter.lt = addDays(parsedEndDate, 1);
        }

        if (isPaginatedRequest) {
            const pageSize = parsePositiveIntegerQuery(limit, 25, 100);
            const currentPage = parsePositiveIntegerQuery(page, 1, 100000);
            const where = {
                userId,
                ...(dateFilter.gte || dateFilter.lt ? { date: dateFilter } : {}),
            };
            const [expenses, total] = await Promise.all([
                prisma.expense.findMany({
                    where,
                    orderBy,
                    skip: (currentPage - 1) * pageSize,
                    take: pageSize,
                }),
                prisma.expense.count({
                    where,
                }),
            ]);

            res.json({
                items: expenses,
                total,
                page: currentPage,
                limit: pageSize,
                hasMore: currentPage * pageSize < total,
            });
            return;
        }

        const expenses = await prisma.expense.findMany({
            where: {
                userId,
                ...(dateFilter.gte || dateFilter.lt ? { date: dateFilter } : {}),
            },
            orderBy,
        });

        res.json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const userId = getUserId(req);
        const validationResult = validateExpenseInput(req.body);

        if ("error" in validationResult) {
            res.status(400).json({ error: validationResult.error });
            return;
        }

        const existingExpense = await prisma.expense.findFirst({
            where: {
                id: req.params.id,
                userId,
            },
        });

        if (!existingExpense) {
            res.status(404).json({ error: "Expense not found" });
            return;
        }

        const expense = await prisma.expense.update({
            where: {
                id: req.params.id,
            },
            data: validationResult.data,
        });

        res.json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update expense" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const userId = getUserId(req);
        const result = await prisma.expense.deleteMany({
            where: {
                id: req.params.id,
                userId,
            },
        });

        if (result.count === 0) {
            res.status(404).json({ error: "Expense not found" });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});

router.get("/export", async (req, res) => {
    try {
        const userId = getUserId(req);
        const { year, month, startDate, endDate } = req.query;
        const dateFilter: { gte?: Date; lt?: Date } = {};

        if (year || month) {
            const selectedYear = Number(year);
            const selectedMonth = Number(month);

            if (
                !Number.isInteger(selectedYear) ||
                !Number.isInteger(selectedMonth) ||
                selectedMonth < 1 ||
                selectedMonth > 12
            ) {
                res.status(400).json({
                    error: "Valid year and month query parameters are required",
                });
                return;
            }

            dateFilter.gte = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
            dateFilter.lt = new Date(Date.UTC(selectedYear, selectedMonth, 1));
        } else if (startDate || endDate) {
            const parsedStartDate = parseDateQuery(startDate);
            const parsedEndDate = parseDateQuery(endDate);

            if (!parsedStartDate || !parsedEndDate) {
                res.status(400).json({
                    error: "Valid startDate and endDate query parameters are required",
                });
                return;
            }

            if (parsedStartDate > parsedEndDate) {
                res.status(400).json({
                    error: "startDate must be before or equal to endDate",
                });
                return;
            }

            dateFilter.gte = parsedStartDate;
            dateFilter.lt = addDays(parsedEndDate, 1);
        }

        const expenses = await prisma.expense.findMany({
            where: {
                userId,
                ...(dateFilter.gte || dateFilter.lt ? { date: dateFilter } : {}),
            },
            orderBy: {
                date: "desc",
            },
        });

        const header = [
            "Date",
            "Category",
            "Subcategory",
            "Merchant",
            "Description",
            "Amount",
        ];
        const rows = expenses.map((expense) => [
            formatCsvDate(expense.date),
            expense.category,
            expense.subcategory,
            expense.merchant,
            expense.description,
            Number(expense.amount),
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map(escapeCsvField).join(","))
            .join("\r\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="expenses.csv"'
        );

        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to export expenses" });
    }
});

router.get("/insights", async (req, res) => {
    try {
        const userId = getUserId(req);
        const { startDate, endDate } = req.query;
        const parsedStartDate = parseDateQuery(startDate);
        const parsedEndDate = parseDateQuery(endDate);

        if (!parsedStartDate || !parsedEndDate) {
            res.status(400).json({
                error: "Valid startDate and endDate query parameters are required",
            });
            return;
        }

        if (parsedStartDate > parsedEndDate) {
            res.status(400).json({
                error: "startDate must be before or equal to endDate",
            });
            return;
        }

        const expenses = await prisma.expense.findMany({
            where: {
                userId,
                date: {
                    gte: parsedStartDate,
                    lt: addDays(parsedEndDate, 1),
                },
            },
            orderBy: {
                date: "asc",
            },
        });

        const spendingEntries = expenses.filter(
            (expense) => expense.category !== "Income"
        );
        const incomeEntries = expenses.filter(
            (expense) => expense.category === "Income"
        );

        const totalSpending = spendingEntries.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
        );
        const totalIncome = incomeEntries.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
        );
        const net = totalIncome - totalSpending;

        const categoryTotals = spendingEntries.reduce<Record<string, number>>(
            (acc, expense) => {
                acc[expense.category] =
                    (acc[expense.category] || 0) + Number(expense.amount);
                return acc;
            },
            {}
        );

        const byCategory = Object.entries(categoryTotals)
            .map(([category, amount]) => ({
                category,
                amount,
            }))
            .sort((a, b) => b.amount - a.amount);

        const dailyTrendMap: Record<string, { spending: number; income: number }> = {};
        for (
            let date = new Date(parsedStartDate);
            date <= parsedEndDate;
            date = addDays(date, 1)
        ) {
            dailyTrendMap[formatCsvDate(date)] = {
                spending: 0,
                income: 0,
            };
        }

        for (const expense of expenses) {
            const dateKey = formatCsvDate(expense.date);

            if (!dailyTrendMap[dateKey]) {
                dailyTrendMap[dateKey] = {
                    spending: 0,
                    income: 0,
                };
            }

            if (expense.category === "Income") {
                dailyTrendMap[dateKey].income += Number(expense.amount);
            } else {
                dailyTrendMap[dateKey].spending += Number(expense.amount);
            }
        }

        const dailyTrend = Object.entries(dailyTrendMap).map(([date, totals]) => ({
            date,
            spending: totals.spending,
            income: totals.income,
        }));

        const topCategory = byCategory[0] ?? null;
        const insights = [
            topCategory
                ? `Your highest spending category was ${topCategory.category}.`
                : "No spending was recorded for this period.",
            `Your net amount for this period was ${formatCurrency(net)}.`,
        ];

        res.json({
            startDate: formatCsvDate(parsedStartDate),
            endDate: formatCsvDate(parsedEndDate),
            totalSpending,
            totalIncome,
            net,
            byCategory,
            dailyTrend,
            topCategory,
            insights,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate insights" });
    }
});

router.get("/summary", async (req, res) => {
    try {
        const userId = getUserId(req);
        const { year, month, startDate, endDate } = req.query;
        let selectedYear: number | null = null;
        let selectedMonth: number | null = null;
        let startDateFilter: Date;
        let endDateFilter: Date;

        if (startDate || endDate) {
            const parsedStartDate = parseDateQuery(startDate);
            const parsedEndDate = parseDateQuery(endDate);

            if (!parsedStartDate || !parsedEndDate) {
                res.status(400).json({
                    error: "Valid startDate and endDate query parameters are required",
                });
                return;
            }

            if (parsedStartDate > parsedEndDate) {
                res.status(400).json({
                    error: "startDate must be before or equal to endDate",
                });
                return;
            }

            startDateFilter = parsedStartDate;
            endDateFilter = addDays(parsedEndDate, 1);
        } else {
            selectedYear = Number(year);
            selectedMonth = Number(month);

            if (
                !Number.isInteger(selectedYear) ||
                !Number.isInteger(selectedMonth) ||
                selectedMonth < 1 ||
                selectedMonth > 12
            ) {
                res.status(400).json({
                    error: "Valid year and month query parameters are required",
                });
                return;
            }

            startDateFilter = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
            endDateFilter = new Date(Date.UTC(selectedYear, selectedMonth, 1));
        }

        const expenses = await prisma.expense.findMany({
            where: {
                userId,
                date: {
                    gte: startDateFilter,
                    lt: endDateFilter,
                },
            },
        });

        const spendingExpenses = expenses.filter(
            (expense) => expense.category !== "Income"
        );
        const incomeEntries = expenses.filter(
            (expense) => expense.category === "Income"
        );

        const total = spendingExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
        );
        const income = incomeEntries.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0
        );

        const byCategory = spendingExpenses.reduce<Record<string, number>>((acc, expense) => {
            const category = expense.category;
            acc[category] = (acc[category] || 0) + Number(expense.amount);
            return acc;
        }, {});

        res.json({
            year: selectedYear,
            month: selectedMonth,
            startDate: formatCsvDate(startDateFilter),
            endDate: formatCsvDate(addDays(endDateFilter, -1)),
            total,
            income,
            net: income - total,
            byCategory,
            count: spendingExpenses.length,
            incomeCount: incomeEntries.length,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

export default router;
