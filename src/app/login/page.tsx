"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "./actions";
import { Button, Input, Label, Select } from "@/components/ui";

const ROLES = [
  ["admin", "Admin"],
  ["front_office", "Front Office"],
  ["restaurant_manager", "Restaurant Manager"],
  ["waiter", "Waiter"],
  ["chef", "Chef"],
  ["housekeeping", "Housekeeping"],
  ["inventory_manager", "Inventory Manager"],
  ["accountant", "Accountant"],
] as const;

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = mode === "login" ? await signIn(formData) : await signUp(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if ("needsConfirmation" in result && result.needsConfirmation) {
        setNotice("Account created. Check your email to confirm before signing in.");
        setMode("login");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Hotel & Restaurant MS</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "login" ? "Sign in to the staff dashboard" : "Register a new staff account"}
        </p>

        <form action={handleSubmit} className="mt-5 space-y-3">
          {mode === "register" && (
            <div>
              <Label>Full name</Label>
              <Input name="full_name" required placeholder="Jane Doe" />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input name="password" type="password" required minLength={6} placeholder="••••••••" />
          </div>
          {mode === "register" && (
            <div>
              <Label>Role</Label>
              <Select name="role" defaultValue="admin">
                {ROLES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-gray-400">
                First account should register as Admin, then promote/manage others from Staff.
              </p>
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-700"
          onClick={() => {
            setError(null);
            setNotice(null);
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "New staff member? Register here" : "Already registered? Sign in"}
        </button>
      </div>
    </div>
  );
}
