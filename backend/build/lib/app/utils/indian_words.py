"""
Indian-system number to words (Lac / Crore) for PO grand totals.
e.g. 1234567.50 -> "Rupees Twelve Lac Thirty Four Thousand Five Hundred
Sixty Seven and Paise Fifty Only"
"""

from decimal import Decimal

_ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two(n: int) -> str:
    if n < 20:
        return _ONES[n]
    return (_TENS[n // 10] + (" " + _ONES[n % 10] if n % 10 else "")).strip()


def _three(n: int) -> str:
    hundreds, rest = divmod(n, 100)
    parts = []
    if hundreds:
        parts.append(_ONES[hundreds] + " Hundred")
    if rest:
        parts.append(_two(rest))
    return " ".join(parts)


def _indian_int(n: int) -> str:
    if n == 0:
        return "Zero"
    crore, rest = divmod(n, 10_000_000)
    lac, rest = divmod(rest, 100_000)
    thousand, hundreds = divmod(rest, 1000)
    parts = []
    if crore:
        parts.append(_indian_int(crore) + " Crore")
    if lac:
        parts.append(_two(lac) + " Lac")
    if thousand:
        parts.append(_two(thousand) + " Thousand")
    if hundreds:
        parts.append(_three(hundreds))
    return " ".join(parts)


def rupees_in_words(amount: Decimal) -> str:
    amount = Decimal(amount).quantize(Decimal("0.01"))
    rupees = int(amount)
    paise = int((amount - rupees) * 100)
    words = f"Rupees {_indian_int(rupees)}"
    if paise:
        words += f" and Paise {_two(paise)}"
    return words + " Only"
