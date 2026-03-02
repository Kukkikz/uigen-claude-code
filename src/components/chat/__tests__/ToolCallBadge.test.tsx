import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

test("shows 'Creating {path}' for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("shows 'Editing {path}' for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("shows 'Editing {path}' for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/components/Button.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Editing /components/Button.jsx")).toBeDefined();
});

test("shows 'Reading {path}' for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/App.jsx" }}
      state="result"
      result="file content"
    />
  );
  expect(screen.getByText("Reading /App.jsx")).toBeDefined();
});

test("shows 'Undoing edit in {path}' for str_replace_editor undo_edit command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "undo_edit", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Undoing edit in /App.jsx")).toBeDefined();
});

test("shows 'Renaming {path} → {new_path}' for file_manager rename command", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/old.jsx", new_path: "/new.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});

test("shows 'Deleting {path}' for file_manager delete command", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("falls back to tool name for unknown tool", () => {
  render(
    <ToolCallBadge
      toolName="unknown_tool"
      args={{}}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("falls back to tool name when args have no command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{}}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("shows spinner when state is not result", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when state is result with result value", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
