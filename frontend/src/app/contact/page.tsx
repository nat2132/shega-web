"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import api from "@/lib/api";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "ssshegas@gmail.com",
    href: "mailto:ssshegas@gmail.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "0925319901",
    href: "tel:0925319901",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Bole Road, Addis Ababa, Ethiopia",
    href: "#",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Mon - Fri, 8:00 AM - 6:00 PM",
    href: "#",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    business_name: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/contacts/", form);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setForm({ name: "", phone: "", email: "", business_name: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="absolute inset-0 grid-pattern opacity-20" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-16 max-w-3xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">We&apos;d love to hear from you</div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                Get in <span className="text-gradient">Touch</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted max-w-2xl mx-auto">
                Have a question or need help? We&apos;d love to hear from you.
              </p>
            </motion.div>

            <div className="grid gap-12 lg:grid-cols-5">
              <motion.div
                className="lg:col-span-3"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <form
                  onSubmit={handleSubmit}
                  className="glass rounded-2xl p-8 space-y-5 glass-inner-highlight"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-1.5 block text-sm font-medium text-muted"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        className="block w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-foreground placeholder-muted/60 transition-all duration-200"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-1.5 block text-sm font-medium text-muted"
                      >
                        Phone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        className="block w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-foreground placeholder-muted/60 transition-all duration-200"
                        placeholder="+251 91 234 5678"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-medium text-muted"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        className="block w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-foreground placeholder-muted/60 transition-all duration-200"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="business_name"
                        className="mb-1.5 block text-sm font-medium text-muted"
                      >
                        Business Name
                      </label>
                      <input
                        id="business_name"
                        name="business_name"
                        type="text"
                        value={form.business_name}
                        onChange={handleChange}
                        className="block w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-foreground placeholder-muted/60 transition-all duration-200"
                        placeholder="Your business"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1.5 block text-sm font-medium text-muted"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      className="block w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-foreground placeholder-muted/60 transition-all duration-200 resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-glass-primary inline-flex h-12 w-full items-center justify-center gap-2.5 px-8 text-sm rounded-xl"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </motion.div>

              <motion.div
                className="lg:col-span-2 space-y-3"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {contactInfo.map((info) => (
                  <a
                    key={info.label}
                    href={info.href}
                    className="glass-hoverable rounded-2xl p-5 flex items-start gap-4 glass-inner-highlight"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground">
                      <info.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted tracking-wider uppercase">
                        {info.label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {info.value}
                      </p>
                    </div>
                  </a>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
