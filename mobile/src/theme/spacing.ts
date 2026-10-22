// Centralized Layout, Radius & Shadow Tokens
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  card: 22,        // Softly rounded major card
  cardLg: 26,      // Hero banner & container card
  full: 9999,      // Pills & circular buttons
  button: 24,      // Rounded pill buttons
  input: 14,       // Soft input fields
  chip: 20         // Compact chips & filters
};

export const shadows = {
  sm: {
    shadowColor: '#172C49',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  md: {
    shadowColor: '#172C49',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4
  },
  lg: {
    shadowColor: '#172C49',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8
  },
  floating: {
    shadowColor: '#172C49',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 7
  }
};
