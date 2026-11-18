import type { Demo } from "@useairfoil/connector-kit";

import { type Address, gid } from "../resources/shared";
import {
  amount,
  catalog,
  clock,
  day,
  handleOf,
  hour,
  isGiftCard,
  money,
  productNumber,
  type Rows,
  taxRate,
  valuesOf,
  variantNumber,
  vendor,
  welcomeCode,
} from "./shared";

/** One group is one customer with their orders, refunds, and sometimes an open cart. */
export const customerRows = (index: number, context: Demo.DemoContext) => {
  const { faker, now } = context;
  const { at } = clock(context);

  const rows: Rows = { customers: [], orders: [], refunds: [], carts: [] };

  const customerNumber = 7_200_000_000_000 + index;
  const customerId = gid("Customer", customerNumber);
  const addressId = gid("MailingAddress", 9_300_000_000_000 + index);
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.exampleEmail({ firstName, lastName }).toLowerCase();
  const phone = faker.phone.number({ style: "international" });

  const address: Address = {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    company: null,
    address1: faker.location.streetAddress(),
    address2: null,
    city: faker.location.city(),
    province: faker.location.state(),
    provinceCode: faker.location.state({ abbreviated: true }),
    country: "United States",
    countryCode: "US",
    zip: faker.location.zipCode("#####"),
    phone,
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
  };

  const subscribed = faker.datatype.boolean({ probability: 0.4 });
  const created = at(now.getTime() - faker.number.int({ min: 10 * day, max: 700 * day }));

  // Pick purchase times between signup and now, oldest first.
  const orderCount = faker.helpers.weightedArrayElement([
    { weight: 20, value: 0 },
    { weight: 40, value: 1 },
    { weight: 20, value: 2 },
    { weight: 10, value: 3 },
    { weight: 10, value: faker.number.int({ min: 4, max: 6 }) },
  ]);

  const orderTimes = Array.from({ length: orderCount }, () =>
    faker.date.between({ from: created, to: now }),
  ).toSorted((a, b) => a.getTime() - b.getTime());

  let spent = 0;
  let lastChange = created;

  orderTimes.forEach((orderCreated, n) => {
    const orderNumber = 5_600_000_000_000 + index * 10 + n;
    const orderId = gid("Order", orderNumber);
    const saleId = gid("OrderTransaction", 6_700_000_000_000 + (index * 10 + n) * 2);
    const discounted = n === 0 && faker.datatype.boolean({ probability: 0.25 });

    const picks = faker.helpers.arrayElements(
      catalog.map((item, p) => ({ item, p })),
      { min: 1, max: 3 },
    );

    const lines = picks.map(({ item, p }, k) => {
      const v = faker.number.int({ max: valuesOf(item).length - 1 });
      const quantity = isGiftCard(item) ? 1 : faker.number.int({ min: 1, max: 2 });
      const gross = item.price * quantity;
      const discount = discounted ? Math.round(gross * 0.1) : 0;
      const tax = isGiftCard(item) ? 0 : Math.round((gross - discount) * taxRate);

      return { item, p, v, k, quantity, gross, discount, tax };
    });

    const discountTotal = lines.reduce((sum, line) => sum + line.discount, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.gross - line.discount, 0);
    const tax = lines.reduce((sum, line) => sum + line.tax, 0);
    const shipping = lines.every((line) => isGiftCard(line.item)) || subtotal >= 7500 ? 0 : 600;
    const total = subtotal + shipping + tax;
    const grams = lines.reduce((sum, line) => sum + line.item.grams * line.quantity, 0);

    const cancelled = faker.datatype.boolean({ probability: 0.03 });

    const refund = cancelled
      ? null
      : faker.helpers.maybe(() => faker.helpers.arrayElement(["full", "partial"] as const), {
          probability: 0.06,
        });

    const refundedLines = refund === "full" ? lines : refund === "partial" ? lines.slice(0, 1) : [];
    const refundShipping = refund === "full" ? shipping : 0;

    const refundedSubtotal = refundedLines.reduce(
      (sum, line) => sum + line.gross - line.discount,
      0,
    );

    const refundedTax = refundedLines.reduce((sum, line) => sum + line.tax, 0);
    const refundedTotal = refundedSubtotal + refundedTax + refundShipping;

    const cancelledAt = cancelled
      ? at(orderCreated.getTime() + faker.number.int({ min: 60_000, max: day }))
      : null;

    const refundAt = refund
      ? at(orderCreated.getTime() + faker.number.int({ min: 3 * day, max: 20 * day }))
      : null;

    const fulfilled = orderCreated.getTime() < now.getTime() - 5 * day;

    const closedAt =
      cancelledAt ??
      (fulfilled
        ? at(orderCreated.getTime() + faker.number.int({ min: 2 * day, max: 5 * day }))
        : null);

    const updatedAt = new Date(
      Math.max(orderCreated.getTime(), closedAt?.getTime() ?? 0, refundAt?.getTime() ?? 0),
    );

    const current = cancelled ? 0 : 1;
    const currentSubtotal = (subtotal - refundedSubtotal) * current;
    const currentTax = (tax - refundedTax) * current;
    const currentShipping = (shipping - refundShipping) * current;
    const currentTotal = currentSubtotal + currentTax + currentShipping;
    spent += currentTotal;
    lastChange = updatedAt > lastChange ? updatedAt : lastChange;

    const shippingLineId = gid("ShippingLine", 4_500_000_000_000 + index * 10 + n);

    rows.orders.push({
      id: orderId,
      legacyResourceId: String(orderNumber),
      name: `#${1001 + index * 10 + n}`,
      email,
      phone,
      customerId,
      customerLocale: "en",
      customerAcceptsMarketing: subscribed,
      billingAddress: address,
      shippingAddress: lines.every((line) => isGiftCard(line.item)) ? null : address,
      note: "",
      customAttributes: [],
      tags: [],
      confirmationNumber: faker.string.alphanumeric({ length: 9, casing: "upper" }),
      poNumber: "",
      sourceName: "web",
      sourceIdentifier: "",
      // The Online Store sales channel.
      appId: gid("App", 580111),
      paymentGatewayNames: ["shopify_payments"],
      test: false,
      taxesIncluded: false,
      taxExempt: false,
      dutiesIncluded: false,
      estimatedTaxes: false,
      totalWeight: grams,
      displayFinancialStatus: cancelled
        ? "VOIDED"
        : refund === "full"
          ? "REFUNDED"
          : refund === "partial"
            ? "PARTIALLY_REFUNDED"
            : "PAID",
      cancelReason: cancelled ? "CUSTOMER" : null,
      cancelledAt,
      closedAt,
      processedAt: orderCreated,
      createdAt: orderCreated,
      updatedAt,
      currencyCode: "USD",
      presentmentCurrencyCode: "USD",
      discountCodes: discounted ? [welcomeCode] : [],
      discountApplications: discounted
        ? [
            {
              index: 0,
              type: "DISCOUNT_CODE",
              code: welcomeCode,
              title: null,
              description: null,
              allocationMethod: "ACROSS",
              targetSelection: "ALL",
              targetType: "LINE_ITEM",
              valueType: "PERCENTAGE",
              value: "10",
            },
          ]
        : [],
      subtotalPriceSet: money(subtotal),
      currentSubtotalPriceSet: money(currentSubtotal),
      totalDiscountsSet: money(discountTotal),
      currentTotalDiscountsSet: money(discountTotal * current),
      totalShippingPriceSet: money(shipping),
      currentShippingPriceSet: money(currentShipping),
      totalTaxSet: money(tax),
      currentTotalTaxSet: money(currentTax),
      originalTotalDutiesSet: null,
      currentTotalDutiesSet: null,
      totalPriceSet: money(total),
      currentTotalPriceSet: money(currentTotal),
      taxLines: tax > 0 ? [{ title: "Sales Tax", rate: taxRate, priceSet: money(tax) }] : [],
      shippingLines:
        shipping === 0 && lines.every((line) => isGiftCard(line.item))
          ? []
          : [
              {
                id: shippingLineId,
                title: shipping === 0 ? "Free Shipping" : "Standard Shipping",
                code: shipping === 0 ? "Free Shipping" : "Standard Shipping",
                source: "shopify",
                carrierIdentifier: null,
                phone: null,
                isRemoved: false,
                originalPriceSet: money(shipping),
                discountedPriceSet: money(shipping),
                currentDiscountedPriceSet: money(currentShipping),
                taxLines: [],
                discountAllocations: [],
              },
            ],
      lineItems: lines.map((line) => {
        const value = valuesOf(line.item)[line.v] ?? "Default Title";
        const refundedQuantity = refundedLines.includes(line) ? line.quantity : 0;

        return {
          id: gid("LineItem", 14_000_000_000_000 + (index * 10 + n) * 10 + line.k),
          name: line.item.option ? `${line.item.title} - ${value}` : line.item.title,
          title: line.item.title,
          variantTitle: line.item.option ? value : null,
          sku: `NW-${handleOf(line.item).toUpperCase()}-${value.replace("/", "").toUpperCase()}`,
          vendor,
          productId: gid("Product", productNumber(line.p)),
          variantId: gid("ProductVariant", variantNumber(line.p, line.v)),
          quantity: line.quantity,
          currentQuantity: (line.quantity - refundedQuantity) * current,
          taxable: !isGiftCard(line.item),
          requiresShipping: !isGiftCard(line.item),
          isGiftCard: isGiftCard(line.item),
          originalUnitPriceSet: money(line.item.price),
          totalDiscountSet: money(line.discount),
          taxLines:
            line.tax > 0 ? [{ title: "Sales Tax", rate: taxRate, priceSet: money(line.tax) }] : [],
          discountAllocations: discounted
            ? [{ discountApplicationIndex: 0, amountSet: money(line.discount) }]
            : [],
          customAttributes: [],
        };
      }),
    });

    if (refund && refundAt) {
      const refundNumber = 1_000_000_000_000 + index * 10 + n;

      rows.refunds.push({
        id: gid("Refund", refundNumber),
        legacyResourceId: String(refundNumber),
        orderId,
        note: refund === "full" ? "Returned by customer" : "",
        createdAt: refundAt,
        version: refundAt,
        processedAt: refundAt,
        transactions: [
          {
            id: gid("OrderTransaction", 6_700_000_000_000 + (index * 10 + n) * 2 + 1),
            kind: "REFUND",
            status: "SUCCESS",
            amount: amount(refundedTotal),
            currencyCode: "USD",
            gateway: "shopify_payments",
            test: false,
            errorCode: null,
            parentTransactionId: saleId,
            createdAt: refundAt,
            processedAt: refundAt,
          },
        ],
        refundLineItems: refundedLines.map((line) => ({
          id: gid("RefundLineItem", 2_000_000_000_000 + (index * 10 + n) * 10 + line.k),
          lineItemId: gid("LineItem", 14_000_000_000_000 + (index * 10 + n) * 10 + line.k),
          quantity: line.quantity,
          restockType: "RETURN",
          locationId: gid("Location", 64_000_000_001),
          subtotalSet: money(line.gross - line.discount),
          totalTaxSet: money(line.tax),
        })),
        refundShippingLines:
          refundShipping > 0
            ? [
                {
                  id: gid("RefundShippingLine", 3_000_000_000_000 + index * 10 + n),
                  shippingLineId,
                  subtotalAmountSet: money(refundShipping),
                },
              ]
            : [],
        orderAdjustments: [],
        duties: [],
      });
    }
  });

  // Some shoppers leave a cart behind.
  if (faker.datatype.boolean({ probability: 0.25 })) {
    const token = `c1-${index.toString(16).padStart(8, "0")}${faker.string.hexadecimal({ length: 24, casing: "lower", prefix: "" })}`;
    const cartCreated = at(now.getTime() - faker.number.int({ min: hour, max: 7 * day }));

    rows.carts.push({
      id: token,
      token,
      topic: "carts/update",
      lineItems: faker.helpers
        .arrayElements(
          catalog.map((item, p) => ({ item, p })),
          { min: 1, max: 2 },
        )
        .map(({ item, p }) => {
          const v = faker.number.int({ max: valuesOf(item).length - 1 });
          const quantity = faker.number.int({ min: 1, max: 2 });
          const variant = variantNumber(p, v);

          return {
            id: String(variant),
            properties: null,
            quantity,
            variantId: gid("ProductVariant", variant),
            key: `${variant}:${faker.string.hexadecimal({ length: 32, casing: "lower", prefix: "" })}`,
            discountedPrice: amount(item.price),
            discounts: "[]",
            giftCard: isGiftCard(item),
            grams: item.grams,
            linePrice: amount(item.price * quantity),
            originalLinePrice: amount(item.price * quantity),
            originalPrice: amount(item.price),
            price: amount(item.price),
            productId: gid("Product", productNumber(p)),
            sku: `NW-${handleOf(item).toUpperCase()}-${(valuesOf(item)[v] ?? "").replace("/", "").toUpperCase()}`,
            taxable: !isGiftCard(item),
            title: item.title,
            totalDiscount: "0",
            vendor,
            discountedPriceSet: money(item.price),
            linePriceSet: money(item.price * quantity),
            originalLinePriceSet: money(item.price * quantity),
            priceSet: money(item.price),
            totalDiscountSet: money(0),
            parentRelationship: null,
          };
        }),
      note: "",
      updatedAt: at(cartCreated.getTime() + faker.number.int({ min: 0, max: hour })),
      createdAt: cartCreated,
    });
  }

  const subscribedAt = subscribed ? created : null;

  rows.customers.push({
    id: customerId,
    legacyResourceId: String(customerNumber),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    email,
    emailMarketingState: subscribed ? "SUBSCRIBED" : "NOT_SUBSCRIBED",
    emailMarketingOptInLevel: subscribed ? "SINGLE_OPT_IN" : null,
    emailMarketingUpdatedAt: subscribedAt,
    phone,
    smsMarketingState: "NOT_SUBSCRIBED",
    smsMarketingOptInLevel: null,
    smsMarketingUpdatedAt: null,
    smsMarketingCollectedFrom: null,
    note: "",
    state: orderCount > 0 ? "ENABLED" : "DISABLED",
    verifiedEmail: true,
    taxExempt: false,
    taxExemptions: [],
    tags: orderCount >= 3 ? ["repeat"] : [],
    locale: "en",
    numberOfOrders: orderCount,
    amountSpent: { amount: amount(spent), currencyCode: "USD" },
    lastOrderId:
      orderCount > 0 ? gid("Order", 5_600_000_000_000 + index * 10 + orderCount - 1) : "",
    productSubscriberStatus: "NEVER_SUBSCRIBED",
    dataSaleOptOut: false,
    defaultAddressId: addressId,
    addresses: [{ id: addressId, ...address }],
    createdAt: created,
    updatedAt: lastChange,
  });

  return {
    ...rows,
    order_transactions: rows.orders.map((order) => ({
      id: order.id.replace("/Order/", "/OrderTransaction/"),
      orderId: order.id,
      version: order.updatedAt,
      createdAt: order.createdAt,
      kind: "SALE",
      status: "SUCCESS",
      gateway: "shopify_payments",
      amountSet: order.totalPriceSet,
      parentTransaction: null,
    })),
    fulfillment_orders: rows.orders.map((order) => ({
      id: order.id.replace("/Order/", "/FulfillmentOrder/"),
      orderId: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      status: "CLOSED",
      requestStatus: "ACCEPTED",
    })),
    fulfillments: rows.orders.map((order) => ({
      id: order.id.replace("/Order/", "/Fulfillment/"),
      orderId: order.id,
      version: order.updatedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      status: "SUCCESS",
      trackingInfo: [],
    })),
  };
};
