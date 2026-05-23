import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getAuthCookieOptions } from "./authToken";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
});

test("auth cookies use SameSite=None and Secure in production", () => {
    process.env.NODE_ENV = "production";

    assert.equal(getAuthCookieOptions().sameSite, "none");
    assert.equal(getAuthCookieOptions().secure, true);
});

test("auth cookies use SameSite=Lax in local development", () => {
    process.env.NODE_ENV = "development";

    assert.equal(getAuthCookieOptions().sameSite, "lax");
    assert.equal(getAuthCookieOptions().secure, false);
});

