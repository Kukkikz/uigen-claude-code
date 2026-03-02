// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const { mockCookieSet, mockCookieGet } = vi.hoisted(() => ({
  mockCookieSet: vi.fn(),
  mockCookieGet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: mockCookieSet, get: mockCookieGet, delete: vi.fn() }),
}));

import { SignJWT } from "jose";
import { createSession, getSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  mockCookieSet.mockClear();
  mockCookieGet.mockClear();
});

test("createSession sets the auth-token cookie", async () => {
  await createSession("user-1", "a@b.com");

  expect(mockCookieSet).toHaveBeenCalledOnce();
  const [name] = mockCookieSet.mock.calls[0];
  expect(name).toBe("auth-token");
});

test("createSession JWT contains userId and email", async () => {
  await createSession("user-1", "a@b.com");

  const [, token] = mockCookieSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("a@b.com");
});

test("createSession JWT expires in ~7 days", async () => {
  const before = Date.now();
  await createSession("user-1", "a@b.com");
  const after = Date.now();

  const [, token] = mockCookieSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  expect(payload.exp! * 1000).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(payload.exp! * 1000).toBeLessThanOrEqual(after + sevenDays + 1000);
});

test("createSession cookie is httpOnly with correct options", async () => {
  await createSession("user-1", "a@b.com");

  const [, , options] = mockCookieSet.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.secure).toBe(false); // NODE_ENV is not "production" in tests
});

test("createSession cookie expires in ~7 days", async () => {
  const before = new Date();
  await createSession("user-1", "a@b.com");
  const after = new Date();

  const [, , options] = mockCookieSet.mock.calls[0];
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  expect(options.expires.getTime()).toBeGreaterThanOrEqual(before.getTime() + sevenDays - 1000);
  expect(options.expires.getTime()).toBeLessThanOrEqual(after.getTime() + sevenDays + 1000);
});

// getSession

test("getSession returns null when no cookie is present", async () => {
  mockCookieGet.mockReturnValue(undefined);

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null when token is invalid", async () => {
  mockCookieGet.mockReturnValue({ value: "not-a-valid-jwt" });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null when token is expired", async () => {
  const token = await makeToken({ userId: "user-1", email: "a@b.com" }, "0s");
  mockCookieGet.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-1", email: "a@b.com" });
  mockCookieGet.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("a@b.com");
});
