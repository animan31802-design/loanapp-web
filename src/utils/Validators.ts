export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateAmount = (amount: number): boolean => {
  return amount > 0 && isFinite(amount);
};

export const validateInterestRate = (rate: number): boolean => {
  return rate > 0 && rate <= 100;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};
