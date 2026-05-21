import bcrypt from "bcryptjs";
import express from "express";
import { requireAuth } from "../middleware/requireAuth";
import { AuthenticatedRequest } from "../types/authenticatedRequest";
import prisma from "../utils/prisma";
import {
    AUTH_COOKIE_NAME,
    getAuthCookieOptions,
    signAuthToken,
} from "../utils/authToken";

const router = express.Router();

function sanitizeUser(user: { id: string; name: string; email: string }) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
    };
}

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            res.status(400).json({
                error: "Name, email, and password are required",
            });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!validateEmail(normalizedEmail)) {
            res.status(400).json({ error: "Enter a valid email address" });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({
                error: "Password must be at least 8 characters",
            });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            res.status(409).json({ error: "Email is already registered" });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        const token = signAuthToken({ userId: user.id });
        res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
        res.status(201).json({ user: sanitizeUser(user) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create account" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" || typeof password !== "string") {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email.trim().toLowerCase(),
            },
        });

        if (!user) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const token = signAuthToken({ userId: user.id });
        res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
        res.json({ user: sanitizeUser(user) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to log in" });
    }
});

router.post("/logout", (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
    res.status(204).send();
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ user: (req as AuthenticatedRequest).user });
});

export default router;
