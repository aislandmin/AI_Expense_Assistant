import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "Password123!",
};

type SeedEntryTemplate = {
  category: string;
  subcategory?: string;
  merchant: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  dayStart: number;
  dayEnd: number;
  monthlyCount: number;
};

const spendingTemplates: SeedEntryTemplate[] = [
  {
    category: "Groceries",
    merchant: "Fresh Market",
    description: "Groceries for home",
    minAmount: 42,
    maxAmount: 135,
    dayStart: 2,
    dayEnd: 27,
    monthlyCount: 4,
  },
  {
    category: "Food & Drink",
    merchant: "Corner Cafe",
    description: "Coffee, takeout, and meals out",
    minAmount: 8,
    maxAmount: 48,
    dayStart: 1,
    dayEnd: 28,
    monthlyCount: 6,
  },
  {
    category: "Transportation",
    subcategory: "Gas",
    merchant: "Shell",
    description: "Vehicle fuel",
    minAmount: 38,
    maxAmount: 82,
    dayStart: 4,
    dayEnd: 26,
    monthlyCount: 2,
  },
  {
    category: "Transportation",
    subcategory: "Transit",
    merchant: "City Transit",
    description: "Transit fare",
    minAmount: 3,
    maxAmount: 18,
    dayStart: 1,
    dayEnd: 28,
    monthlyCount: 2,
  },
  {
    category: "Transportation",
    subcategory: "Parking",
    merchant: "Downtown Parking",
    description: "Parking fee",
    minAmount: 6,
    maxAmount: 22,
    dayStart: 5,
    dayEnd: 26,
    monthlyCount: 1,
  },
  {
    category: "Transportation",
    subcategory: "Rideshare",
    merchant: "Uber",
    description: "Rideshare trip",
    minAmount: 14,
    maxAmount: 38,
    dayStart: 6,
    dayEnd: 28,
    monthlyCount: 1,
  },
  {
    category: "Bills & Utilities",
    subcategory: "Phone",
    merchant: "Mobile Provider",
    description: "Phone bill",
    minAmount: 55,
    maxAmount: 78,
    dayStart: 10,
    dayEnd: 12,
    monthlyCount: 1,
  },
  {
    category: "Bills & Utilities",
    subcategory: "Internet",
    merchant: "Internet Provider",
    description: "Home internet",
    minAmount: 65,
    maxAmount: 95,
    dayStart: 14,
    dayEnd: 16,
    monthlyCount: 1,
  },
  {
    category: "Bills & Utilities",
    subcategory: "Electricity",
    merchant: "Hydro Utility",
    description: "Electricity bill",
    minAmount: 70,
    maxAmount: 135,
    dayStart: 17,
    dayEnd: 19,
    monthlyCount: 1,
  },
  {
    category: "Bills & Utilities",
    subcategory: "Insurance",
    merchant: "Home Insurance Co",
    description: "Insurance payment",
    minAmount: 42,
    maxAmount: 88,
    dayStart: 21,
    dayEnd: 23,
    monthlyCount: 1,
  },
  {
    category: "Bills & Utilities",
    subcategory: "Subscription",
    merchant: "StreamBox",
    description: "Streaming subscription",
    minAmount: 12,
    maxAmount: 24,
    dayStart: 18,
    dayEnd: 20,
    monthlyCount: 1,
  },
  {
    category: "Home & Rent",
    merchant: "Property Management",
    description: "Monthly rent",
    minAmount: 1450,
    maxAmount: 1550,
    dayStart: 1,
    dayEnd: 1,
    monthlyCount: 1,
  },
  {
    category: "Health",
    merchant: "City Pharmacy",
    description: "Health and pharmacy items",
    minAmount: 16,
    maxAmount: 90,
    dayStart: 5,
    dayEnd: 24,
    monthlyCount: 1,
  },
  {
    category: "Entertainment",
    merchant: "Cinema Club",
    description: "Movie night",
    minAmount: 18,
    maxAmount: 85,
    dayStart: 8,
    dayEnd: 26,
    monthlyCount: 1,
  },
];

const occasionalTemplates: SeedEntryTemplate[] = [
  {
    category: "Clothing",
    merchant: "Style Store",
    description: "Clothing purchase",
    minAmount: 35,
    maxAmount: 180,
    dayStart: 6,
    dayEnd: 25,
    monthlyCount: 1,
  },
  {
    category: "Education",
    merchant: "Learning Platform",
    description: "Course materials",
    minAmount: 20,
    maxAmount: 120,
    dayStart: 9,
    dayEnd: 22,
    monthlyCount: 1,
  },
  {
    category: "Travel",
    merchant: "Travel Booking",
    description: "Trip expense",
    minAmount: 90,
    maxAmount: 420,
    dayStart: 12,
    dayEnd: 27,
    monthlyCount: 1,
  },
  {
    category: "Bills & Utilities",
    subcategory: "Water",
    merchant: "City Water",
    description: "Water bill",
    minAmount: 28,
    maxAmount: 62,
    dayStart: 11,
    dayEnd: 18,
    monthlyCount: 1,
  },
  {
    category: "Other",
    merchant: "Local Shop",
    description: "Miscellaneous purchase",
    minAmount: 10,
    maxAmount: 75,
    dayStart: 3,
    dayEnd: 28,
    monthlyCount: 1,
  },
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function amountBetween(minAmount: number, maxAmount: number, seed: number) {
  const value = minAmount + seededRandom(seed) * (maxAmount - minAmount);
  return Number(value.toFixed(2));
}

function dayBetween(dayStart: number, dayEnd: number, seed: number) {
  if (dayStart === dayEnd) {
    return dayStart;
  }

  return Math.floor(dayStart + seededRandom(seed) * (dayEnd - dayStart + 1));
}

function monthStart(monthOffset: number) {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthOffset, 1));
}

function createDateForMonth(month: Date, day: number) {
  const lastDay = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)
  ).getUTCDate();

  return new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), Math.min(day, lastDay))
  );
}

function createTimestamp(date: Date, sequence: number) {
  const timestamp = new Date(date);
  timestamp.setUTCHours(9 + (sequence % 9), (sequence * 7) % 60, 0, 0);
  return timestamp;
}

function addEntry(
  entries: Array<{
    amount: number;
    category: string;
    subcategory: string | null;
    merchant: string;
    description: string;
    date: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
  entry: {
    amount: number;
    category: string;
    subcategory?: string | null;
    merchant: string;
    description: string;
    date: Date;
    userId: string;
  },
  sequence: number
) {
  entries.push({
    ...entry,
    subcategory: entry.subcategory ?? null,
    createdAt: createTimestamp(entry.date, sequence),
    updatedAt: createTimestamp(entry.date, sequence),
  });
}

async function main() {
  const password = await bcrypt.hash(TEST_USER.password, 10);
  const user = await prisma.user.upsert({
    where: {
      email: TEST_USER.email,
    },
    update: {
      name: TEST_USER.name,
      password,
    },
    create: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password,
    },
  });

  await prisma.expense.deleteMany({
    where: {
      userId: user.id,
    },
  });

  const entries = [];
  let sequence = 0;

  for (let monthOffset = 23; monthOffset >= 0; monthOffset -= 1) {
    const month = monthStart(monthOffset);
    const monthSeed = month.getUTCFullYear() * 100 + month.getUTCMonth();
    const salaryDate = createDateForMonth(month, 1);

    entries.push({
      amount: 4300 + Math.round(seededRandom(monthSeed) * 500),
      category: "Income",
      subcategory: "Salary",
      merchant: "Employer Payroll",
      description: "Salary",
      date: salaryDate,
      userId: user.id,
      createdAt: createTimestamp(salaryDate, sequence),
      updatedAt: createTimestamp(salaryDate, sequence),
    });
    sequence += 1;

    if (monthOffset % 3 === 0) {
      const refundDate = createDateForMonth(month, 15);

      entries.push({
        amount: amountBetween(35, 220, monthSeed + 77),
        category: "Income",
        subcategory: "Refund",
        merchant: "Store Refund",
        description: "Refund for returned purchase",
        date: refundDate,
        userId: user.id,
        createdAt: createTimestamp(refundDate, sequence),
        updatedAt: createTimestamp(refundDate, sequence),
      });
      sequence += 1;
    }

    if (monthOffset % 4 === 1) {
      const reimbursementDate = createDateForMonth(month, 20);

      entries.push({
        amount: amountBetween(45, 180, monthSeed + 91),
        category: "Income",
        subcategory: "Reimbursement",
        merchant: "Work Reimbursement",
        description: "Reimbursed work expense",
        date: reimbursementDate,
        userId: user.id,
        createdAt: createTimestamp(reimbursementDate, sequence),
        updatedAt: createTimestamp(reimbursementDate, sequence),
      });
      sequence += 1;
    }

    if (monthOffset % 6 === 2) {
      const giftDate = createDateForMonth(month, 24);

      entries.push({
        amount: amountBetween(25, 150, monthSeed + 113),
        category: "Income",
        subcategory: "Gift",
        merchant: "Family",
        description: "Gift money",
        date: giftDate,
        userId: user.id,
        createdAt: createTimestamp(giftDate, sequence),
        updatedAt: createTimestamp(giftDate, sequence),
      });
      sequence += 1;
    }

    for (const template of spendingTemplates) {
      for (let index = 0; index < template.monthlyCount; index += 1) {
        const seed = monthSeed + sequence + index * 17;
        const day = dayBetween(template.dayStart, template.dayEnd, seed);
        const date = createDateForMonth(month, day);

        entries.push({
          amount: amountBetween(template.minAmount, template.maxAmount, seed + 3),
          category: template.category,
          subcategory: template.subcategory ?? null,
          merchant: template.merchant,
          description: template.description,
          date,
          userId: user.id,
          createdAt: createTimestamp(date, sequence),
          updatedAt: createTimestamp(date, sequence),
        });
        sequence += 1;
      }
    }

    for (const [index, template] of occasionalTemplates.entries()) {
      if ((monthOffset + index) % 2 !== 0) {
        continue;
      }

      const seed = monthSeed + sequence + index * 23;
      const day = dayBetween(template.dayStart, template.dayEnd, seed);
      const date = createDateForMonth(month, day);

      entries.push({
        amount: amountBetween(template.minAmount, template.maxAmount, seed + 5),
        category: template.category,
        subcategory: template.subcategory ?? null,
        merchant: template.merchant,
        description: template.description,
        date,
        userId: user.id,
        createdAt: createTimestamp(date, sequence),
        updatedAt: createTimestamp(date, sequence),
      });
      sequence += 1;
    }
  }

  const currentMonth = monthStart(0);
  const currentMonthHighlights = [
    {
      amount: 96.42,
      category: "Food & Drink",
      merchant: "Birthday Bistro",
      description: "Dinner out with friends",
      date: createDateForMonth(currentMonth, 6),
    },
    {
      amount: 74.31,
      category: "Transportation",
      subcategory: "Gas",
      merchant: "Shell",
      description: "Gas refill",
      date: createDateForMonth(currentMonth, 8),
    },
    {
      amount: 18.5,
      category: "Transportation",
      subcategory: "Parking",
      merchant: "Downtown Parking",
      description: "Parking for appointment",
      date: createDateForMonth(currentMonth, 9),
    },
    {
      amount: 129.99,
      category: "Income",
      subcategory: "Refund",
      merchant: "Style Store",
      description: "Refund for returned jacket",
      date: createDateForMonth(currentMonth, 12),
    },
    {
      amount: 84.75,
      category: "Bills & Utilities",
      subcategory: "Electricity",
      merchant: "Hydro Utility",
      description: "Electricity bill adjustment",
      date: createDateForMonth(currentMonth, 18),
    },
  ];

  for (const entry of currentMonthHighlights) {
    addEntry(
      entries,
      {
        ...entry,
        userId: user.id,
      },
      sequence
    );
    sequence += 1;
  }

  await prisma.expense.createMany({
    data: entries,
  });

  console.log(`Seeded ${entries.length} entries for ${TEST_USER.email}`);
  console.log(`Password: ${TEST_USER.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
