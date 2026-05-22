export const CATEGORY_OPTIONS = [
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

export const SUBCATEGORY_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  Transportation: [
    "Gas",
    "Parking",
    "Transit",
    "Rideshare",
    "Taxi",
    "Maintenance",
    "Other",
  ],
  "Bills & Utilities": [
    "Phone",
    "Internet",
    "Water",
    "Electricity",
    "Insurance",
    "Subscription",
    "Other",
  ],
  Income: [
    "Salary",
    "Refund",
    "Reimbursement",
    "Gift",
    "Other",
  ],
};

export function isKnownCategory(category: string) {
  return CATEGORY_OPTIONS.includes(category);
}
