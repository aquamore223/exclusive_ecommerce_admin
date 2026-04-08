// utils.js - Shared utilities for the entire site

const currencySettings = {
  currency: "USD",
  symbol: "$"
};

// Default rates
let exchangeRates = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  NGN: 1500  // Added NGN rate
};

// Fetch real rates (optional)
async function fetchExchangeRates() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    exchangeRates = data.rates;
    console.log('✅ Exchange rates updated');
  } catch (error) {
    console.warn('⚠️ Could not fetch exchange rates, using defaults');
  }
}

// Call this on app start
fetchExchangeRates();

function formatPrice(price) {
  let numericPrice;
  
  if (typeof price === 'string') {
    numericPrice = Number(price.replace(/[^0-9.]/g, ""));
  } else if (typeof price === 'number') {
    numericPrice = price;
  } else {
    numericPrice = 0;
  }
  
  if (isNaN(numericPrice)) {
    numericPrice = 0;
  }
  
  // Use exchange rate if available
  const rate = exchangeRates[currencySettings.currency] || 1;
  const converted = numericPrice * rate;

  return `${currencySettings.symbol}${converted.toFixed(2)}`;
}

// Short format for tables (K, M)
function formatPriceShort(price) {
  const formatted = formatPrice(price);
  const numericValue = parseFloat(formatted.replace(/[^0-9.-]/g, ''));
  
  if (numericValue >= 1000000) {
    return `${currencySettings.symbol}${(numericValue / 1000000).toFixed(1)}M`;
  } else if (numericValue >= 1000) {
    return `${currencySettings.symbol}${(numericValue / 1000).toFixed(0)}K`;
  }
  return formatted;
}

// Change currency
function setCurrency(currency) {
  currencySettings.currency = currency;
  currencySettings.symbol = getCurrencySymbol(currency);
  localStorage.setItem('preferredCurrency', currency);
  
  // Refresh all price displays on the page
  if (typeof refreshAllPrices === 'function') {
    refreshAllPrices();
  }
  
  console.log(`Currency changed to ${currency}`);
}

function getCurrencySymbol(currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
    GHS: '₵',
    KES: 'KSh'
  };
  return symbols[currency] || '$';
}

// Load saved currency preference
function loadCurrencyPreference() {
  const savedCurrency = localStorage.getItem('preferredCurrency');
  if (savedCurrency && exchangeRates[savedCurrency]) {
    currencySettings.currency = savedCurrency;
    currencySettings.symbol = getCurrencySymbol(savedCurrency);
  }
}

// Initialize on load
loadCurrencyPreference();

// Make functions globally available
window.formatPrice = formatPrice;
window.formatPriceShort = formatPriceShort;
window.setCurrency = setCurrency;
window.currencySettings = currencySettings;
window.exchangeRates = exchangeRates;