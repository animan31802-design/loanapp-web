import {AppConfig} from '@/constants/AppConfig';
import {LoanMode, LoanStatus} from '@/constants/Enums';

export const formatCurrency = (amount: any): string => {
  const num = Number(amount);
  if (isNaN(num)) return `${AppConfig.CURRENCY}0.00`;
  const abs = Math.abs(num);
  const fixed = abs.toFixed(2);
  const parts = fixed.split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = restFormatted + ',' + last3;
  }

  const sign = num < 0 ? '-' : '';
  return `${sign}${AppConfig.CURRENCY}${intPart}.${decPart}`;
};

export const formatDate = (date: any): string => {
  if (!date) return '—';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '—';
  }
};

export const formatTenure = (months: any): string => {
  const m = Number(months);
  if (m === 12) return '1 Year';
  if (m === 24) return '2 Years';
  if (m === 36) return '3 Years';
  return `${m} Months`;
};

export const formatLoanMode = (mode: LoanMode | null | undefined): string => {
  if (mode === LoanMode.EMI) return 'EMI Mode';
  if (mode === LoanMode.FLAT_EMI) return 'Flat EMI';
  if (mode === LoanMode.INTEREST_ONLY) return 'Interest Only';
  return '—';
};

export const formatLoanStatus = (status: LoanStatus): string => {
  const map: Record<string, string> = {
    [LoanStatus.PENDING]: 'Collecting',
    [LoanStatus.FUNDED]: 'Funded',
    [LoanStatus.ACTIVE]: 'Active',
    [LoanStatus.REJECTED]: 'Rejected',
    [LoanStatus.CLOSED]: 'Closed',
  };
  return map[status] || status;
};

export const formatPercentage = (ratio: any): string => {
  const r = Number(ratio);
  if (isNaN(r)) return '0.00%';
  return `${(r * 100).toFixed(2)}%`;
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '—';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};
