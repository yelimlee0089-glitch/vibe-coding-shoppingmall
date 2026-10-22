import Product, { CATEGORIES, SIZES } from '../models/Product.js';

const PRODUCT_FIELDS = [
  'sku',
  'name',
  'price',
  'category',
  'imageUrl',
  'imagePublicId',
  'description',
  'sizes',
  'stock',
];

// 허용된 필드만 저장 (_id, createdAt 등 임의 지정 방지)
function pickProductFields(body) {
  return Object.fromEntries(
    PRODUCT_FIELDS.filter((field) => body?.[field] !== undefined).map((field) => [field, body[field]])
  );
}

function notFoundError() {
  const err = new Error('상품을 찾을 수 없습니다.');
  err.status = 404;
  return err;
}

export const DEFAULT_PAGE_SIZE = 4;
export const MAX_PAGE_SIZE = 100;

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  'price-asc': { price: 1, _id: -1 },
  'price-desc': { price: -1, _id: -1 },
};

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// 쿼리 문자열의 양의 정수 파싱 (없으면 기본값, 잘못된 값이면 400)
function parsePositiveInt(value, name, fallback) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw badRequest(`${name}는 1 이상의 정수여야 합니다.`);
  }
  return number;
}

/**
 * 목록 + 페이지네이션
 * GET /api/products?page=1&limit=4&category=Apparel&sizes=S,M&sort=newest
 * - page: 페이지 번호 (기본 1)
 * - limit: 한 페이지 상품 수 (기본 4, 최대 100)
 */
export async function getProducts(req, res, next) {
  try {
    const page = parsePositiveInt(req.query.page, 'page', 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 'limit', DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

    const { category, sort = 'newest' } = req.query;
    if (category && !CATEGORIES.includes(category)) {
      throw badRequest(`카테고리는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
    }
    if (!SORTS[sort]) {
      throw badRequest(`정렬은 ${Object.keys(SORTS).join(', ')} 중 하나여야 합니다.`);
    }

    // sizes=S,M → 둘 중 하나라도 있는 상품
    const sizes = typeof req.query.sizes === 'string'
      ? req.query.sizes.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];
    const invalidSize = sizes.find((s) => !SIZES.includes(s));
    if (invalidSize) throw badRequest(`사이즈는 ${SIZES.join(', ')} 중에서 골라야 합니다.`);

    const filter = {};
    if (category) filter.category = category;
    if (sizes.length) filter.sizes = { $in: sizes };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(SORTS[sort])
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw notFoundError();
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await Product.create(pickProductFields(req.body));
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// 보낸 필드만 수정. save()를 거쳐야 SKU 형식·카테고리 등 검증이 함께 적용됨
export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw notFoundError();

    product.set(pickProductFields(req.body));
    await product.save();
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// 지난 주문은 주문 당시의 상품명·가격을 따로 저장하고 있어서 상품을 지워도 주문 내역은 유지됨
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw notFoundError();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
