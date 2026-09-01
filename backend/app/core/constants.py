"""
Fixed business constants confirmed with the founder — not configurable,
not negotiated per contract, never read from the database. Distinct from
app/core/config.py (env-driven settings).
"""

from decimal import Decimal

# Farmer rejection deduction: ALWAYS exactly 7% of net weight, regardless
# of actual observed rejection. No negotiation, no per-contract override,
# no MIN()/split against actual. Payable weight = net_weight_kg * 0.93.
# Actual observed rejection is still captured (weighing_records and
# packaging_records .actual_rejection_pct) as real operational data, but
# it never affects payment. Supersedes the earlier "farmer absorbs up to
# contract %, exporter absorbs the rest" reading — see Business_Rules.md R28.
FARMER_REJECTION_PCT = Decimal("7")
