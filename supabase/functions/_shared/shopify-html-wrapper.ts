export const SHOPIFY_FULLWIDTH_CSS = `
/* Force Shopify product page to full width for custom landing pages */
.product__info-wrapper,
.product__description,
.product__description * {
    width: 100% !important;
    max-width: 100% !important;
}

.product__info-container {
    display: block !important;
}

.product__media-wrapper,
.product__media {
    width: 100% !important;
    max-width: 100% !important;
}

@media(min-width: 768px) {
  .product--large .product__outer {
      grid-template-columns: 1fr !important;
  }
}
`;

export function wrapForShopify(htmlContent: string): string {
  return `<style>${SHOPIFY_FULLWIDTH_CSS}</style>
<div class="landing-full-width">
${htmlContent}
</div>`;
}
