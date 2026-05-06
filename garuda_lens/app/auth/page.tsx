import type { Metadata } from "next";

import AuthExperience from "@/components/AuthExperience";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthPage() {
  return <AuthExperience />;
}