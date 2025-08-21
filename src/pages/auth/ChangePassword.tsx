import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, memo } from "react";
import { changeMyPassword } from "@/services/api"; // << use centralized client
import type { ChangePasswordPayload } from "@/services/api";
// --- Validation ---
// tweak rules as you like: at least 8 chars, 1 letter, 1 number
const formSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Must contain at least one letter")
      .regex(/\d/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = ChangePasswordPayload;
// Reusable password field with show/hide toggle
const PasswordField = memo(function PasswordField({
  name,
  label,
  form,
  autoComplete,
}: {
  name: "oldPassword" | "newPassword" | "confirmPassword";
  label: string;
  form: ReturnType<typeof useForm<FormData>>;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                autoComplete={autoComplete}
                {...field}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

export default function ChangePassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  mode: "onTouched",
});

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (data: FormData) => {
    try {
      await changeMyPassword(data);

      toast({
        title: "Success",
        description: "Password changed successfully.",
      });

      // optional: clear form before leaving
      form.reset();
      navigate("/profile");
    } catch (err: any) {
      // Best‑effort server error mapping
      let description =
        (err?.response?.data && (err.response.data.message || err.response.data)) ||
        "Failed to change password. Please try again.";

      // common pattern: backend sets 400 with old password mismatch
      if (typeof description === "string" && /old password/i.test(description)) {
        form.setError("oldPassword", { message: description });
      }

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Change Password
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <PasswordField
                  name="oldPassword"
                  label="Old Password"
                  form={form}
                  autoComplete="current-password"
                />

                <PasswordField
                  name="newPassword"
                  label="New Password"
                  form={form}
                  autoComplete="new-password"
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm New Password"
                  form={form}
                  autoComplete="new-password"
                />

                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || !isValid}
                  >
                    {isSubmitting ? "Saving..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
