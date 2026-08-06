"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, logout } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (user?.is_staff) {
        router.push("/admin/");
      } else {
        logout();
        toast.error("Please use the SHEGA mobile app to sign in. Web login is for administrators only.");
        router.push("/");
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 60%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 0.5px, transparent 0.5px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }}
      >
        <div className="granny-card rounded-2xl p-8 sm:p-10">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center justify-center gap-3 mb-4">
              <Image src="/images/logo.png" alt="Shega" width={36} height={36} />
              <span className="text-2xl font-bold text-foreground">shega</span>
            </Link>
            <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">Email / Username</label>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground transition-all duration-200 hover:border-border-hover focus:border-foreground/20 focus:outline-hidden focus:ring-2 focus:ring-foreground/10"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground transition-all duration-200 hover:border-border-hover focus:border-foreground/20 focus:outline-hidden focus:ring-2 focus:ring-foreground/10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Users: sign in through the SHEGA mobile app.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
