import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
    userId: string;
}

export const AUTH_COOKIE_NAME = "ai_expense_auth";

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is required");
    }

    return secret || "dev-only-ai-expense-assistant-secret";
}

export function signAuthToken(payload: AuthTokenPayload) {
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: "7d",
    });
}

export function verifyAuthToken(token: string) {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

export function getAuthCookieOptions() {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}
