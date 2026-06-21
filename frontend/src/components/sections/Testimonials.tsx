'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Abebe Kebede',
    business: 'Kebede Wholesale Trading',
    quote:
      'Shega transformed how we manage our inventory. We reduced stockouts by 80% and can finally track everything across our three warehouses in Addis.',
    rating: 5,
  },
  {
    name: 'Sara Hailu',
    business: 'Hailu General Merchandise',
    quote:
      'The debt management feature alone was worth the switch. Now we know exactly who owes us and when payments are due. Game changer for our business.',
    rating: 5,
  },
  {
    name: 'Tadesse Mekonnen',
    business: 'Mekonnen Retail Store',
    quote:
      'Setup was incredibly easy. Within a day we had our entire inventory digitized. The offline POS means we never miss a sale even when internet is spotty.',
    rating: 5,
  },
  {
    name: 'Lemlem Tesfaye',
    business: 'Tesfaye Distributors PLC',
    quote:
      'We moved from a messy spreadsheet system to Shega. The analytics alone opened our eyes to where we were losing money. Highly recommended for any distributor.',
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-foreground text-foreground' : 'fill-none text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-30" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-16 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="gradient-text text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by Ethiopian Businesses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Hear from the businesses that power their operations with Shega.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="granny-card flex flex-col rounded-2xl p-6"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              custom={i}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.business}</div>
                </div>
              </div>
              <StarRating rating={t.rating} />
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
