import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

const anonWork = {
  messages: [{ role: "user", content: "make a button" }],
  fileSystemData: { "/App.jsx": { content: "<div/>" } },
};

const existingProject = { id: "proj-1", name: "Old Design", createdAt: new Date(), updatedAt: new Date() };
const newProject = { id: "proj-new", name: "New Design", createdAt: new Date(), updatedAt: new Date(), userId: "u1", messages: "[]", data: "{}" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue(newProject as any);
});

describe("useAuth — signIn", () => {
  it("returns isLoading=false initially", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("sets isLoading=true during call and false after", async () => {
    let resolveSignIn!: (v: any) => void;
    const pendingSignIn = new Promise<any>(res => { resolveSignIn = res; });
    mockSignInAction.mockReturnValue(pendingSignIn);

    const { result } = renderHook(() => useAuth());

    let callPromise: Promise<any>;
    act(() => { callPromise = result.current.signIn("a@b.com", "pass"); });

    // Flush React state so setIsLoading(true) commits
    await act(async () => {});
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: false, error: "bad creds" });
      await callPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("returns the result from signInAction", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  it("does not navigate when signIn fails", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("on success with anon work: creates project, clears anon, navigates to project", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ ...newProject, id: "anon-proj" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj");
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  it("on success with anon work but empty messages: skips anon project creation", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });

  it("on success with no anon work and existing projects: navigates to most recent project", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    const projects = [
      { id: "recent", name: "Recent", createdAt: new Date(), updatedAt: new Date() },
      { id: "older", name: "Older", createdAt: new Date(), updatedAt: new Date() },
    ];
    mockGetProjects.mockResolvedValue(projects);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("on success with no anon work and no projects: creates a new project and navigates", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ ...newProject, id: "brand-new" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  it("resets isLoading to false even if signInAction throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth — signUp", () => {
  it("sets isLoading=true during call and false after", async () => {
    let resolveSignUp!: (v: any) => void;
    const pendingSignUp = new Promise<any>(res => { resolveSignUp = res; });
    mockSignUpAction.mockReturnValue(pendingSignUp);

    const { result } = renderHook(() => useAuth());

    let callPromise: Promise<any>;
    act(() => { callPromise = result.current.signUp("a@b.com", "pass"); });

    await act(async () => {});
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: false, error: "taken" });
      await callPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("returns the result from signUpAction", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already in use" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("existing@b.com", "pass");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already in use" });
  });

  it("does not navigate when signUp fails", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already in use" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("existing@b.com", "pass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("on success with anon work: creates project from anon data and navigates", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ ...newProject, id: "signup-proj" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/signup-proj");
  });

  it("on success with no anon work and no projects: creates new project and navigates", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ ...newProject, id: "fresh" } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith("/fresh");
  });

  it("resets isLoading to false even if signUpAction throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
