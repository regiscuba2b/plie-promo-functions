import type {
  RunInput,
  FunctionRunResult,
  OrderDiscount
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

// IDs em formato completo (gid://...)
const COLLECTION_CUECA = 'gid://shopify/Collection/477972005161';
const COLLECTION_SELF = 'gid://shopify/Collection/484968694057';
const COLLECTION_BASIC = 'gid://shopify/Collection/484968431913';
const COLLECTION_AMAZONIA = 'gid://shopify/Collection/485639684393';

// Preço promocional a cada 3 unidades
const PROMO_CUECA = 179.90;
const PROMO_SELF = 179.90;
const PROMO_BASIC = 139.90;

export function run(input: RunInput): FunctionRunResult {
  const cuecaPrices: number[] = [];
  const selfPrices: number[] = [];
  const basicPrices: number[] = [];
  const basicAmazoniaCombined: number[] = [];

  input.cart.lines.forEach((line) => {
    const quantity = line.quantity;
    const product = (line.merchandise.__typename === "ProductVariant") ? line.merchandise.product : null;
    const price = parseFloat(line.cost.amountPerQuantity.amount);

    if (product?.inCollections) {
      product.inCollections.forEach((collection) => {
        if (collection.isMember) {
          for (let i = 0; i < quantity; i++) {
            if (collection.collectionId === COLLECTION_CUECA) {
              cuecaPrices.push(price);
            }
            if (collection.collectionId === COLLECTION_SELF) {
              selfPrices.push(price);
            }
            if (collection.collectionId === COLLECTION_BASIC) {
              basicPrices.push(price);
            }
            if (collection.collectionId === COLLECTION_AMAZONIA) {
              basicAmazoniaCombined.push(price);
            }
          }
        }
      });
    }
  });

  const calcularDescontoColecao = (prices: number[], precoPromocional: number): number => {
    prices.sort((a, b) => a - b);
    const trios = Math.floor(prices.length / 3);
    const considerados = prices.slice(0, trios * 3);
    const totalOriginal = considerados.reduce((acc, p) => acc + p, 0);
    return (totalOriginal - (trios * precoPromocional)) > 0 ? (totalOriginal - (trios * precoPromocional)) : 0;
  };

  // Nova lógica: a cada 4, o mais barato é desconsiderado (vira desconto)
  const calcularDesconto4x1 = (prices: number[]): number => {
    prices.sort((a, b) => a - b);
    const grupos = Math.floor(prices.length / 4);
    const descartados = [];

    for (let i = 0; i < grupos; i++) {
      descartados.push(prices[i * 4]); // o menor de cada grupo
    }

    return descartados.reduce((acc, val) => acc + val, 0);
  };

  const descontoCueca = calcularDescontoColecao(cuecaPrices, PROMO_CUECA);
  const descontoSelf = calcularDescontoColecao(selfPrices, PROMO_SELF);
  const descontoBasic = calcularDescontoColecao(basicPrices, PROMO_BASIC);
  const descontoBasicAmazonia = calcularDesconto4x1(basicAmazoniaCombined);

  const totalDiscount = descontoCueca + descontoSelf + descontoBasic + descontoBasicAmazonia;

  if (totalDiscount > 0) {
    const orderDiscount: OrderDiscount = {
      value: {
        fixedAmount: {
          amount: totalDiscount.toFixed(2),
        },
      },
      message: "Promoções Especiais Pliê",
      targets: [
        {
          orderSubtotal: {
            excludedVariantIds: [
              "gid://shopify/ProductVariant/50166839673129",
              "gid://shopify/ProductVariant/50166839738665",
              "gid://shopify/ProductVariant/50166824698153",
              "gid://shopify/ProductVariant/50166735733033",
              "gid://shopify/ProductVariant/50064207446313",
              "gid://shopify/ProductVariant/50065676796201",
              "gid://shopify/ProductVariant/50065614176553",
            ],
          },
        },
      ],
    };

    return {
      discountApplicationStrategy: DiscountApplicationStrategy.First,
      discounts: [orderDiscount],
    };
  }

  return EMPTY_DISCOUNT;
}
