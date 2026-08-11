// Which of a menu item's four price columns applies to a given order
// channel — this is the fix for the gap where every order type silently
// billed at the dine-in `price`, even though parcel_price/own_delivery_price/
// aggregator_price have existed on menu_items since 0011 and could be set
// in the menu UI. Falls back to the dine-in price whenever the channel
// price hasn't been configured, rather than erroring.
export function channelPriceFor(
  item: { price: number; parcel_price: number | null; own_delivery_price: number | null; aggregator_price: number | null },
  orderType: string,
): number {
  switch (orderType) {
    case "takeaway":
      return item.parcel_price ?? item.price;
    case "delivery_own":
      return item.own_delivery_price ?? item.price;
    case "delivery_aggregator":
      return item.aggregator_price ?? item.price;
    default:
      return item.price;
  }
}
