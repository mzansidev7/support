import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

test("renders the support login form", () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "Welcome Back" }),
  ).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
});
