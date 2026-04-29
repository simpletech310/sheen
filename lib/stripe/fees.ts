export type RoutedTo = "solo_washer" | "partner";

export type FeeBreakdown = {
  customerCharge: number;
  serviceCents: number;
  trustFee: number;
  applicationFeeCents: number;
  washerOrPartnerNet: number;
};

export function computeFees(opts: {
  serviceCents: number;
  routedTo: RoutedTo;
  isRepeatCustomer?: boolean;
}): FeeBreakdown {
  const trustFee = Math.round(opts.serviceCents * 0.1);
  const customerCharge = opts.serviceCents + trustFee;

  if (opts.routedTo === "partner") {
    const fee = opts.serviceCents >= 100000 ? 15000 : Math.round(opts.serviceCents * 0.12);
    return {
      customerCharge,
      serviceCents: opts.serviceCents,
      trustFee,
      applicationFeeCents: fee,
      washerOrPartnerNet: opts.serviceCents - fee,
    };
  }

  const commissionPct = opts.isRepeatCustomer ? 0.18 : 0.22;
  const commission = Math.round(opts.serviceCents * commissionPct);
  return {
    customerCharge,
    serviceCents: opts.serviceCents,
    trustFee,
    applicationFeeCents: commission + trustFee,
    washerOrPartnerNet: opts.serviceCents - commission,
  };
}
