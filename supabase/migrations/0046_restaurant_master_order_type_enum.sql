-- ============================================================
-- Restaurant Master: closes every gap found in the audit.
--
-- order_type gains delivery_own/delivery_aggregator so an order can
-- actually declare which of the four already-existing price columns
-- (price/parcel_price/own_delivery_price/aggregator_price) applies —
-- those columns existed since 0011 but addOrderItem() only ever read
-- `price`, so takeaway/delivery orders were silently billed at the
-- dine-in rate. The TS fix lands separately; this migration is what makes
-- a correct fix possible.
--
-- Meal periods, item-level corporate templates, variants, modifiers/
-- add-ons, combos, and upsell suggestions are all new — none of this
-- existed before.
-- ============================================================

alter type order_type add value 'delivery_own';
alter type order_type add value 'delivery_aggregator';
