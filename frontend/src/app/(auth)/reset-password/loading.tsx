import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordLoading() {
  return <AuthShell animation="/animations/login.lottie" eyebrow="Credential update" title="Restore access safely." description="Choose a new password and confirm it before the reset request is sent to the authentication service."><AuthFormSkeleton mode="reset-password" /></AuthShell>;
}
