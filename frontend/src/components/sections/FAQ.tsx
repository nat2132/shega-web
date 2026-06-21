'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What is Shega?',
    answer:
      'Shega is an all-in-one ERP and POS platform designed specifically for Ethiopian businesses. It covers inventory management, sales, expenses, debt tracking, employee management, and analytics — all in one integrated system.',
  },
  {
    question: 'How does licensing work?',
    answer:
      'Shega offers flexible licensing based on your plan. Starter covers 1 device for 3 months, Business covers 3 devices for 6 months, and Enterprise offers unlimited devices for 12 months. All plans include free updates during the license period.',
  },
  {
    question: 'Can I use it on multiple devices?',
    answer:
      'Yes, depending on your plan. Business plan supports up to 3 devices, and Enterprise supports unlimited devices. All your data syncs in real time across devices, even with intermittent internet.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept Telebirr, bank transfers, and international payments via credit/debit cards. For Enterprise plans, we also offer customized payment schedules.',
  },
  {
    question: 'Do you offer training?',
    answer:
      'Yes. All plans include access to our knowledge base and video tutorials. Enterprise plans include dedicated on-site training for your team. We also offer optional paid training sessions for smaller plans.',
  },
  {
    question: 'What kind of support do you offer?',
    answer:
      'Starter plans include email support. Business plans add priority chat support. Enterprise plans include a dedicated account manager, phone support, and an SLA guarantee. All plans have access to our help center and community forum.',
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium text-foreground">{faq.question}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-30" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-16 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="gradient-text text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Everything you need to know about Shega.
          </p>
        </motion.div>

        <motion.div
          className="granny-card rounded-2xl px-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
