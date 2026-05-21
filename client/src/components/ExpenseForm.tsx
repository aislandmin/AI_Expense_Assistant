import { useState } from "react";
import {
  CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS_BY_CATEGORY,
} from "../constants/categories";
import type { CreateExpenseInput, ExpenseFormValues } from "../types/expense";

interface ExpenseFormProps {
  id?: string;
  className?: string;
  formData: ExpenseFormValues;
  onChange: (formData: ExpenseFormValues) => void;
  onReset: () => void;
  onSubmit: (expense: CreateExpenseInput) => Promise<void>;
  isSubmitting: boolean;
  successMessage: string;
  isEditing: boolean;
}

function formatAmountInput(value: string) {
  const cleanedValue = value.replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = cleanedValue.split(".");
  const hasDecimal = cleanedValue.includes(".");
  const decimalPart = decimalParts.join("").slice(0, 2);
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const formattedInteger = normalizedInteger
    ? new Intl.NumberFormat("en-US").format(Number(normalizedInteger))
    : "";

  if (hasDecimal) {
    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
}

function parseAmountInput(value: string) {
  return Number(value.replace(/,/g, ""));
}

function ExpenseForm({
  id,
  className = "",
  formData,
  onChange,
  onReset,
  onSubmit,
  isSubmitting,
  successMessage,
  isEditing,
}: ExpenseFormProps) {
  const [validationError, setValidationError] = useState("");

  const selectedCategory =
    formData.category && CATEGORY_OPTIONS.includes(formData.category)
      ? formData.category
      : "";
  const resolvedCategory =
    selectedCategory === "Other" ? formData.customCategory : selectedCategory;
  const subcategoryOptions =
    SUBCATEGORY_OPTIONS_BY_CATEGORY[resolvedCategory] ?? [];
  const selectedSubcategory =
    formData.subcategory && subcategoryOptions.includes(formData.subcategory)
      ? formData.subcategory
      : "";
  const resolvedSubcategory =
    selectedSubcategory === "Other"
      ? formData.customSubcategory
      : selectedSubcategory;

  function updateField(field: keyof typeof formData, value: string) {
    onChange({ ...formData, [field]: value });
  }

  function updateCategory(category: string) {
    onChange({
      ...formData,
      category,
      customCategory: category === "Other" ? formData.customCategory : "",
      subcategory: "",
      customSubcategory: "",
    });
  }

  function updateSubcategory(subcategory: string) {
    onChange({
      ...formData,
      subcategory,
      customSubcategory:
        subcategory === "Other" ? formData.customSubcategory : "",
    });
  }

  function handleClear() {
    setValidationError("");
    onReset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    const amount = parseAmountInput(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setValidationError("Enter a valid amount greater than 0.");
      return;
    }

    if (!resolvedCategory.trim()) {
      setValidationError("Category is required.");
      return;
    }

    if (!formData.date) {
      setValidationError("Date is required.");
      return;
    }

    await onSubmit({
      amount,
      category: resolvedCategory.trim(),
      subcategory: resolvedSubcategory.trim() || undefined,
      description: formData.description.trim() || undefined,
      merchant: formData.merchant.trim() || undefined,
      date: formData.date,
    });
  }

  return (
    <section id={id} className={`panel${className ? ` ${className}` : ""}`}>
      <div className="panel-header">
        <h2>{isEditing ? "Edit Entry" : "Add Expense or Income"}</h2>
        <p>
          {isEditing
            ? "Update the saved record, then save your changes."
            : "Record spending or income using simple structured fields."}
        </p>
      </div>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label>
          Amount
          <div className="currency-input">
            <span aria-hidden="true">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatAmountInput(formData.amount)}
              onChange={(event) =>
                updateField("amount", formatAmountInput(event.target.value))
              }
              placeholder="0.00"
            />
          </div>
        </label>

        <div className="expense-field category-field">
          <label>
            Category
            <select
              value={selectedCategory}
              onChange={(event) => updateCategory(event.target.value)}
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          {selectedCategory === "Other" && (
            <label>
              Custom Category
              <input
                type="text"
                value={formData.customCategory}
                onChange={(event) =>
                  updateField("customCategory", event.target.value)
                }
                placeholder="Enter category name"
              />
            </label>
          )}

          {subcategoryOptions.length > 0 && (
            <>
              <label>
                Subcategory
                <select
                  value={selectedSubcategory}
                  onChange={(event) => updateSubcategory(event.target.value)}
                >
                  <option value="">No subcategory</option>
                  {subcategoryOptions.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </label>

              {selectedSubcategory === "Other" && (
              <label>
                Custom Subcategory
                <input
                  type="text"
                  value={formData.customSubcategory}
                  onChange={(event) =>
                    updateField("customSubcategory", event.target.value)
                  }
                  placeholder="Enter subcategory name"
                />
              </label>
              )}
            </>
          )}
        </div>

        <label>
          Merchant
          <input
            type="text"
            value={formData.merchant}
            onChange={(event) => updateField("merchant", event.target.value)}
            placeholder="Merchant name"
          />
        </label>

        <label>
          Date
          <input
            type="date"
            value={formData.date}
            onChange={(event) => updateField("date", event.target.value)}
          />
        </label>

        <label className="full-width">
          Description
          <input
            type="text"
            value={formData.description}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
            placeholder="What was this expense for?"
          />
        </label>

        {validationError && <p className="form-error">{validationError}</p>}
        {successMessage && <p className="form-success">{successMessage}</p>}

        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleClear}
            disabled={isSubmitting}
          >
            {isEditing ? "Cancel" : "Clear"}
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ExpenseForm;
