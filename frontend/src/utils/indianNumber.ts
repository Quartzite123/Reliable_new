/** Formats a number using the Indian digit grouping (Lac/Crore), e.g. 1234567 -> "12,34,567". */
export function formatIndianNumber(value: number): string {
  const [integerPart, decimalPart] = Math.abs(value).toFixed(2).split('.')
  const lastThree = integerPart.slice(-3)
  const rest = integerPart.slice(0, -3)
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree
  const sign = value < 0 ? '-' : ''
  return `${sign}${grouped}.${decimalPart}`
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const parts = []
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`)
  if (rest) parts.push(twoDigitsToWords(rest))
  return parts.join(' ')
}

/**
 * Converts a rupee amount to words using the Indian numbering system
 * (Lac/Crore, not Million/Billion), e.g. 1234567.50 -> "Rupees Twelve Lac
 * Thirty Four Thousand Five Hundred Sixty Seven and Fifty Paise Only"
 * (prompt.md §19/CLAUDE.md §9).
 */
export function amountInWordsIndian(value: number): string {
  const rounded = Math.round(Math.abs(value) * 100) / 100
  const rupees = Math.floor(rounded)
  const paise = Math.round((rounded - rupees) * 100)

  if (rupees === 0 && paise === 0) return 'Rupees Zero Only'

  const crore = Math.floor(rupees / 10000000)
  const lac = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const hundred = rupees % 1000

  const segments: string[] = []
  if (crore) segments.push(`${threeDigitsToWords(crore)} Crore`)
  if (lac) segments.push(`${threeDigitsToWords(lac)} Lac`)
  if (thousand) segments.push(`${threeDigitsToWords(thousand)} Thousand`)
  if (hundred) segments.push(threeDigitsToWords(hundred))

  const rupeeWords = segments.length > 0 ? segments.join(' ') : 'Zero'
  const paiseWords = paise > 0 ? ` and ${twoDigitsToWords(paise)} Paise` : ''

  return `Rupees ${rupeeWords}${paiseWords} Only`
}
