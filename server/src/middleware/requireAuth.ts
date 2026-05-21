import { NextFunction, Request, Response } from "express";
import prisma from "../utils/prisma";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../utils/authToken";
import { AuthenticatedRequest } from "../types/authenticatedRequest";

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req.cookies?.[AUTH_COOKIE_NAME];

        if (!token || typeof token !== "string") {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        const payload = verifyAuthToken(token);
        const user = await prisma.user.findUnique({
            where: {
                id: payload.userId,
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        if (!user) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        (req as AuthenticatedRequest).user = user;
        next();
    } catch {
        res.status(401).json({ error: "Authentication required" });
    }
}
