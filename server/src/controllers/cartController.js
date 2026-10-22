import Cart, { MAX_ITEM_QUANTITY } from '../models/Cart.js';
import Product from '../models/Product.js';

// 장바구니 화면에 필요한 상품 정보만
const PRODUCT_FIELDS = 'sku name price imageUrl sizes category';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseQuantity(value, { required }) {
  if (value === undefined) {
    if (required) throw httpError(400, '수량을 입력해 주세요.');
    return 1;
  }
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    throw httpError(400, `수량은 1~${MAX_ITEM_QUANTITY} 사이의 정수여야 합니다.`);
  }
  return quantity;
}

// 로그인한 회원의 장바구니 (없으면 빈 장바구니를 만듦)
function findOrCreateCart(userId) {
  return Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true }
  );
}

// 상품 정보를 붙여서 응답 (총 금액 계산에 필요)
// 그사이 관리자가 삭제한 상품은 장바구니에서 자동으로 뺌
async function sendCart(res, cart, status = 200) {
  await cart.populate('items.product', PRODUCT_FIELDS);
  const available = cart.items.filter((item) => item.product != null);
  if (available.length !== cart.items.length) {
    cart.items = available;
    await cart.save();
  }
  res.status(status).json(cart);
}

function findItem(cart, itemId) {
  const item = cart.items.id(itemId);
  if (!item) throw httpError(404, '장바구니에 없는 항목입니다.');
  return item;
}

// GET /api/cart
export async function getCart(req, res, next) {
  try {
    const cart = await findOrCreateCart(req.user._id);
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}

// POST /api/cart/items  { productId, size?, quantity? }
// 같은 상품·사이즈가 이미 있으면 수량만 늘림
export async function addItem(req, res, next) {
  try {
    const { productId } = req.body ?? {};
    if (!productId) throw httpError(400, '담을 상품을 선택해 주세요.');
    const quantity = parseQuantity(req.body.quantity, { required: false });
    const size = typeof req.body.size === 'string' ? req.body.size.trim().toUpperCase() : '';

    const product = await Product.findById(productId);
    if (!product) throw httpError(404, '상품을 찾을 수 없습니다.');

    // 사이즈가 있는 상품은 사이즈 필수, 없는 상품은 사이즈를 받지 않음
    if (product.sizes.length > 0) {
      if (!size) throw httpError(400, '사이즈를 선택해 주세요.');
      if (!product.sizes.includes(size)) {
        throw httpError(400, `이 상품은 ${product.sizes.join(', ')} 사이즈만 있습니다.`);
      }
    } else if (size) {
      throw httpError(400, '사이즈를 선택할 수 없는 상품입니다.');
    }

    const cart = await findOrCreateCart(req.user._id);
    const existing = cart.items.find((item) => item.product.equals(product._id) && item.size === size);

    if (existing) {
      if (existing.quantity + quantity > MAX_ITEM_QUANTITY) {
        throw httpError(
          400,
          `한 상품은 ${MAX_ITEM_QUANTITY}개까지 담을 수 있습니다. (현재 ${existing.quantity}개)`
        );
      }
      existing.quantity += quantity;
    } else {
      cart.items.push({ product: product._id, size, quantity });
    }

    await cart.save();
    await sendCart(res, cart, existing ? 200 : 201);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/cart/items/:itemId  { quantity }
export async function updateItem(req, res, next) {
  try {
    const quantity = parseQuantity(req.body?.quantity, { required: true });
    const cart = await findOrCreateCart(req.user._id);
    findItem(cart, req.params.itemId).quantity = quantity;
    await cart.save();
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart/items/:itemId
export async function removeItem(req, res, next) {
  try {
    const cart = await findOrCreateCart(req.user._id);
    findItem(cart, req.params.itemId).deleteOne();
    await cart.save();
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart  (전체 비우기)
export async function clearCart(req, res, next) {
  try {
    const cart = await findOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    await sendCart(res, cart);
  } catch (err) {
    next(err);
  }
}
