export interface ParsedExpense {
    amount: number;
    category: string;
    subcategory: string | null;
    description: string;
    merchant: string | null;
    date: string;
}

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

const categoryByKeyword: Record<string, string> = {
    apparel: "Clothing",
    bus: "Transportation",
    clothes: "Clothing",
    clothing: "Clothing",
    coffee: "Food & Drink",
    dinner: "Food & Drink",
    education: "Education",
    entertainment: "Entertainment",
    food: "Food & Drink",
    foodbasics: "Groceries",
    gas: "Transportation",
    groceries: "Groceries",
    grocery: "Groceries",
    gym: "Health",
    health: "Health",
    home: "Home & Rent",
    hotel: "Travel",
    house: "Home & Rent",
    housing: "Home & Rent",
    income: "Income",
    insurance: "Bills & Utilities",
    internet: "Bills & Utilities",
    lunch: "Food & Drink",
    meat: "Groceries",
    nofrills: "Groceries",
    norills: "Groceries",
    pants: "Clothing",
    phone: "Bills & Utilities",
    rent: "Home & Rent",
    restaurant: "Food & Drink",
    salary: "Income",
    shirt: "Clothing",
    shoes: "Clothing",
    snack: "Food & Drink",
    shell: "Transportation",
    starbucks: "Food & Drink",
    subscription: "Bills & Utilities",
    taxi: "Transportation",
    tuition: "Education",
    uber: "Transportation",
    utilities: "Bills & Utilities",
    vacation: "Travel",
};

const merchantAliases = [
    { aliases: ["foodbasics", "foodbasic"], name: "FoodBasics" },
    { aliases: ["nofrills", "norills", "nofrill"], name: "No Frills" },
    { aliases: ["shell"], name: "Shell" },
    { aliases: ["starbucks"], name: "Starbucks" },
    { aliases: ["uber"], name: "Uber" },
];

const categoryByMerchant: Record<string, string> = {
    FoodBasics: "Groceries",
    "No Frills": "Groceries",
};

const subcategoryByKeyword: Record<string, string> = {
    bus: "Transit",
    electricity: "Electricity",
    fuel: "Gas",
    gas: "Gas",
    hydro: "Electricity",
    insurance: "Insurance",
    internet: "Internet",
    parking: "Parking",
    phone: "Phone",
    shell: "Gas",
    subway: "Transit",
    subscription: "Subscription",
    taxi: "Taxi",
    transit: "Transit",
    uber: "Rideshare",
    water: "Water",
};

const subcategoryByMerchant: Record<string, string> = {
    Shell: "Gas",
    Uber: "Rideshare",
};

function toDateString(date: Date) {
    return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function parseDate(text: string) {
    const lowerText = text.toLowerCase();
    const explicitDate = lowerText.match(/\bon\s+(\d{4}-\d{2}-\d{2})\b/);

    if (explicitDate) {
        const parsedDate = new Date(`${explicitDate[1]}T00:00:00.000Z`);

        if (Number.isNaN(parsedDate.getTime())) {
            return null;
        }

        return explicitDate[1];
    }

    const today = new Date();

    if (lowerText.includes("yesterday")) {
        return toDateString(addDays(today, -1));
    }

    return toDateString(today);
}

function parseAmount(text: string) {
    const amountMatch = text.match(/\$?\b(\d+(?:\.\d{1,2})?)\b/);

    if (!amountMatch) {
        return null;
    }

    const amount = Number(amountMatch[1]);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function normalizeForMatching(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalizeMerchant(merchant: string | null | undefined) {
    if (!merchant) {
        return null;
    }

    const normalizedMerchant = normalizeForMatching(merchant);
    const match = merchantAliases.find((merchantAlias) =>
        merchantAlias.aliases.includes(normalizedMerchant)
    );

    return match?.name ?? merchant.trim();
}

function canonicalizeCategory(category: string, merchant: string | null) {
    if (merchant && categoryByMerchant[merchant]) {
        return categoryByMerchant[merchant];
    }

    const normalizedCategory = normalizeForMatching(category);
    const matchingCategory = allowedCategories.find(
        (allowedCategory) =>
            normalizeForMatching(allowedCategory) === normalizedCategory
    );

    if (matchingCategory) {
        return matchingCategory;
    }

    const legacyCategories: Record<string, string> = {
        bill: "Bills & Utilities",
        dining: "Food & Drink",
        grocery: "Groceries",
        housing: "Home & Rent",
        shopping: "Other",
    };

    if (legacyCategories[normalizedCategory]) {
        return legacyCategories[normalizedCategory];
    }

    if (["coffee", "food", "restaurant", "meal"].includes(normalizedCategory)) {
        return "Food & Drink";
    }

    if (["gas", "fuel", "transit"].includes(normalizedCategory)) {
        return "Transportation";
    }

    if (["grocery", "grocerystore"].includes(normalizedCategory)) {
        return "Groceries";
    }

    if (["apparel", "clothes", "clothing", "pants", "shoes"].includes(normalizedCategory)) {
        return "Clothing";
    }

    if (["bill", "bills", "utilities"].includes(normalizedCategory)) {
        return "Bills & Utilities";
    }

    if (["home", "housing", "rent"].includes(normalizedCategory)) {
        return "Home & Rent";
    }

    return "Other";
}

function canonicalizeSubcategory(
    category: string,
    subcategory: string | null | undefined,
    merchant: string | null
) {
    if (merchant && subcategoryByMerchant[merchant]) {
        return subcategoryByMerchant[merchant];
    }

    const normalizedSubcategory = normalizeForMatching(subcategory ?? "");
    const subcategoriesByCategory: Record<string, Record<string, string>> = {
        "Bills & Utilities": {
            electricity: "Electricity",
            hydro: "Electricity",
            insurance: "Insurance",
            internet: "Internet",
            phone: "Phone",
            subscription: "Subscription",
            water: "Water",
        },
        Transportation: {
        fuel: "Gas",
        gas: "Gas",
        maintenance: "Maintenance",
        parking: "Parking",
        rideshare: "Rideshare",
        taxi: "Taxi",
        transit: "Transit",
        },
    };

    return subcategoriesByCategory[category]?.[normalizedSubcategory] ?? null;
}

function parseCategory(text: string) {
    const lowerText = normalizeForMatching(text);
    const keyword = Object.keys(categoryByKeyword).find((item) =>
        lowerText.includes(item)
    );

    if (!keyword) {
        const firstWord = text.trim().split(/\s+/)[0];
        return firstWord || "Other";
    }

    return categoryByKeyword[keyword];
}

function parseMerchant(text: string) {
    const lowerText = normalizeForMatching(text);
    const match = merchantAliases.find((merchantAlias) =>
        merchantAlias.aliases.some((alias) => lowerText.includes(alias))
    );

    if (!match) {
        return null;
    }

    return match.name;
}

function parseSubcategory(text: string) {
    const lowerText = normalizeForMatching(text);
    const keyword = Object.keys(subcategoryByKeyword).find((item) =>
        lowerText.includes(item)
    );

    return keyword ? subcategoryByKeyword[keyword] : null;
}

function isDateString(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsedDate.getTime());
}

function validateParsedExpense(value: unknown): ParsedExpense | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const parsedValue = value as Partial<ParsedExpense>;

    if (
        typeof parsedValue.amount !== "number" ||
        !Number.isFinite(parsedValue.amount) ||
        parsedValue.amount <= 0 ||
        typeof parsedValue.category !== "string" ||
        parsedValue.category.trim() === "" ||
        (parsedValue.subcategory !== null &&
            parsedValue.subcategory !== undefined &&
            typeof parsedValue.subcategory !== "string") ||
        typeof parsedValue.description !== "string" ||
        typeof parsedValue.date !== "string" ||
        !isDateString(parsedValue.date)
    ) {
        return null;
    }

    if (
        parsedValue.merchant !== null &&
        parsedValue.merchant !== undefined &&
        typeof parsedValue.merchant !== "string"
    ) {
        return null;
    }

    const merchant = canonicalizeMerchant(parsedValue.merchant);
    const category = canonicalizeCategory(parsedValue.category, merchant);

    return {
        amount: parsedValue.amount,
        category,
        subcategory: canonicalizeSubcategory(
            category,
            parsedValue.subcategory,
            merchant
        ),
        description: parsedValue.description.trim(),
        merchant,
        date: parsedValue.date,
    };
}

export function parseExpenseWithRules(text: string): ParsedExpense | null {
    const amount = parseAmount(text);

    if (amount === null) {
        return null;
    }

    const date = parseDate(text);

    if (!date) {
        return null;
    }

    const merchant = parseMerchant(text);
    const category = canonicalizeCategory(parseCategory(text), merchant);

    return {
        amount,
        category,
        subcategory: canonicalizeSubcategory(
            category,
            parseSubcategory(text),
            merchant
        ),
        description: text.trim(),
        merchant,
        date,
    };
}

export async function parseExpenseWithOpenAi(
    text: string
): Promise<ParsedExpense | null> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return null;
    }

    const today = toDateString(new Date());
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content:
                        `You parse one personal expense from casual user text. Return only structured data. Do not invent a merchant: use null unless a business or service name is explicitly present. Normalize merchant names to their common store name when obvious, for example nofrills or Nofrills should be No Frills. Category must be one of: ${allowedCategories.join(", ")}. Use Groceries for grocery stores and grocery items. Use Food & Drink for restaurants, coffee shops, takeout, snacks eaten out, lunch, or dinner. Use Clothing for shoes, clothes, pants, and apparel. Use Home & Rent for rent, housing, furniture, repairs, and home supplies. Use Transportation for gas, transit, rideshare, taxi, parking, or vehicle fuel. For Transportation, set subcategory to Gas, Parking, Transit, Rideshare, Taxi, Maintenance, or Other when obvious. For Bills & Utilities, set subcategory to Phone, Internet, Water, Electricity, Insurance, Subscription, or Other when obvious. Otherwise use null.`,
                },
                {
                    role: "user",
                    content: `Current date: ${today}\nExpense text: ${text}`,
                },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "parsed_expense",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            amount: { type: "number" },
                            category: { type: "string" },
                            subcategory: {
                                anyOf: [{ type: "string" }, { type: "null" }],
                                description:
                                    "Optional subcategory. For Transportation, use Gas, Parking, Transit, Rideshare, Taxi, Maintenance, or Other when obvious.",
                            },
                            description: { type: "string" },
                            merchant: {
                                anyOf: [{ type: "string" }, { type: "null" }],
                            },
                            date: {
                                type: "string",
                                description: "Date in YYYY-MM-DD format.",
                            },
                        },
                        required: [
                            "amount",
                            "category",
                            "subcategory",
                            "description",
                            "merchant",
                            "date",
                        ],
                    },
                },
            },
        }),
    });

    if (!response.ok) {
        throw new Error("OpenAI expense parsing failed");
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
        return null;
    }

    return validateParsedExpense(JSON.parse(content));
}
