import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showBrand?: boolean;
  message?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
  showBrand = false,
  message
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  if (showBrand) {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl">
          <ShieldCheck className="text-primary-foreground" size={32} />
        </div>
        <div className="flex items-center space-x-2">
          <Loader2 className={cn("animate-spin", sizeClasses[size])} />
          <span className="text-muted-foreground">{message || "Loading..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {message && (
        <span className="ml-2 text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

export function PageLoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner showBrand size="lg" message={message} />
    </div>
  );
}