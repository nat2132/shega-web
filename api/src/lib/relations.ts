import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type LicenseWithRelations = Prisma.LicenseGetPayload<{
  include: {
    customer: true;
    plan: true;
    payments: { include: { customer: true; plan: true; license: true } };
    audit_logs: { include: { created_by: true; license: true } };
    device_activations: true;
  };
}>;

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    customer: true;
    plan: true;
    license: true;
    invoice: { include: { customer: true } };
  };
}>;

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    customer_profile: true;
    licenses: { include: { plan: true } };
  };
}>;

export const licenseInclude = {
  customer: true,
  plan: true,
  payments: { include: { customer: true, plan: true, license: true } },
  audit_logs: { include: { created_by: true, license: true } },
  device_activations: true,
} satisfies Prisma.LicenseInclude;

export const paymentInclude = {
  customer: true,
  plan: true,
  license: true,
  invoice: { include: { customer: true } },
} satisfies Prisma.PaymentInclude;

export const businessListInclude = {
  customer_profile: true,
  licenses: { include: { plan: true } },
} satisfies Prisma.UserInclude;

/** Convenience accessors reused by dashboard + filters. */
export async function getAdminUser(id: number) {
  return prisma.user.findUnique({ where: { id } });
}