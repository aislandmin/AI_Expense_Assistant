import { Request } from "express";

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
}

export type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
};
