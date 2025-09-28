import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerSchema, type RegisterData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { register: registerUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password");

  const onSubmit = async (data: RegisterData) => {
    try {
      await registerUser(data);
      toast({
        title: "Welcome to AllergyGuard!",
        description: "Your account has been created successfully.",
      });
      navigate("/");
    } catch (error: any) {
      const message = error?.message || "Registration failed. Please try again.";
      setError("root", { message });
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <ShieldCheck className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AllergyGuard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create your account to get started
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
              <UserPlus size={24} />
              Create Account
            </CardTitle>
            <CardDescription className="text-center">
              Join thousands protecting their health with AI
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register("firstName")}
                    className={errors.firstName ? "border-destructive" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register("lastName")}
                    className={errors.lastName ? "border-destructive" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Choose a unique username"
                  {...register("username")}
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    {...register("password")}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex space-x-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            password.length > (i + 1) * 2
                              ? password.length >= 8
                                ? "bg-green-500"
                                : "bg-yellow-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">
                      Password strength: {password.length >= 8 ? "Strong" : "Weak"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                </span>
                <Link href="/login">
                  <Button variant="link" className="p-0 h-auto font-medium">
                    Sign in here
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}