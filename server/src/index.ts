import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import aiRoutes from "./routes/aiRoutes";
import authRoutes from "./routes/authRoutes";
import { requireAuth } from "./middleware/requireAuth";
import expenseRoutes from "./routes/expenseRoutes";

dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("AI Expense Assistant API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/expenses", requireAuth, expenseRoutes);
app.use("/api/ai", requireAuth, aiRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
