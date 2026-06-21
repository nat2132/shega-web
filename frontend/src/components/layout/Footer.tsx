"use client";

import Link from "next/link";
import { Globe, MessageCircle, Link2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "API Status", href: "/status" },
    ],
  },
];

const socialLinks = [
  { icon: Globe, href: "#", label: "GitHub" },
  { icon: MessageCircle, href: "#", label: "Twitter" },
  { icon: Link2, href: "#", label: "LinkedIn" },
  { icon: Mail, href: "#", label: "Email" },
];

function Footer() {
  return (
    <footer className="bg-[#0a0a0a] dark:bg-[#111111]">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        <Link href="/" className="mb-12 inline-flex items-center gap-2">
          <span className="text-xl font-bold text-white">shega</span>
        </Link>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 text-sm font-semibold text-gray-300">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors duration-200 hover:text-gray-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row sm:pt-8">
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-800 hover:text-gray-300"
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} shega. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
