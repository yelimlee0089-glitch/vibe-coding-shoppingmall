import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// 회원가입은 누구나 할 수 있으므로 user_type 은 받지 않음 (항상 기본값 customer)
// 관리자 지정은 관리자가 PATCH /api/users/:id 로만 가능
const CREATE_FIELDS = ['email', 'name', 'password', 'address'];
const UPDATE_FIELDS = ['email', 'name', 'password', 'user_type', 'address'];
const SALT_ROUNDS = 10;

// 요청 본문에서 허용된 필드만 골라냄 (_id, createdAt 등 임의 수정 방지)
function pick(body, fields) {
  return Object.fromEntries(
    fields.filter((field) => body?.[field] !== undefined).map((field) => [field, body[field]])
  );
}

// 응답에 비밀번호·재설정 정보가 절대 포함되지 않도록 제거
export function toUserResponse(user) {
  const {
    password,
    passwordResetTokenHash,
    passwordResetExpires,
    passwordResetRequestedAt,
    passwordChangedAt,
    tokenVersion,
    ...rest
  } = user.toObject();
  return rest;
}

// 검증을 먼저 통과시킨 뒤 비밀번호를 암호화해서 저장
// (암호화를 먼저 하면 빈 비밀번호도 해시값이 되어 필수값 검사를 통과해버림)
async function validateAndSave(user) {
  await user.validate();
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
  }
  await user.save();
}

function notFoundError() {
  const err = new Error('사용자를 찾을 수 없습니다.');
  err.status = 404;
  return err;
}

export async function getUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(toUserResponse));
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw notFoundError();
    res.json(toUserResponse(user));
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = new User(pick(req.body, CREATE_FIELDS));
    await validateAndSave(user);
    res.status(201).json(toUserResponse(user));
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw notFoundError();

    user.set(pick(req.body, UPDATE_FIELDS));
    await validateAndSave(user);
    res.json(toUserResponse(user));
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw notFoundError();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
