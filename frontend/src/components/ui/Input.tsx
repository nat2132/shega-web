"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ElementRef } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

const Input = forwardRef<ElementRef<"input">, InputProps>(
  ({ label, error, helperText, icon: Icon, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Icon className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "block w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 backdrop-blur-xl transition-all duration-200",
              "border-white/[0.08] focus:border-indigo-500/40 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20",
              "hover:border-white/[0.15]",
              Icon && "pl-10",
              error &&
                "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20",
              props.disabled && "cursor-not-allowed opacity-50",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 text-xs font-medium text-red-400"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
