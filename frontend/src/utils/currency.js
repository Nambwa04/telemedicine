// Simple currency formatter for Kenyan Shillings (Ksh)
// Usage: formatKsh(2500) => "Ksh 2,500"
// Optionally control fraction digits: formatKsh(2500.5, { maximumFractionDigits: 2 })
export function formatKsh(value, options = {}) {
    const num = Number(value ?? 0);
    const {
        minimumFractionDigits = 0,
        maximumFractionDigits = 0,
    } = options;
    const formatted = new Intl.NumberFormat('en-KE', {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(isFinite(num) ? num : 0);
    return `Ksh ${formatted}`;
}

export default formatKsh;
