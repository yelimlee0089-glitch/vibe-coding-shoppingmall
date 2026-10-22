// 상품 등록·수정 폼의 초기값과 변환 함수

export const EMPTY_PRODUCT_FORM = {
  sku: '',
  name: '',
  price: '',
  category: '',
  sizes: [],
  imageUrl: '',
  imagePublicId: '',
  description: '',
}

// 서버에서 받은 상품을 폼 값으로 변환 (수정 페이지용)
export function productToForm(product) {
  return {
    sku: product.sku ?? '',
    name: product.name ?? '',
    price: String(product.price ?? ''),
    category: product.category ?? '',
    sizes: product.sizes ?? [],
    imageUrl: product.imageUrl ?? '',
    imagePublicId: product.imagePublicId ?? '',
    description: product.description ?? '',
  }
}
