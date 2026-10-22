export function notFound(req, res, next) {
  res.status(404).json({ message: `경로를 찾을 수 없습니다: ${req.originalUrl}` });
}

// Mongoose 에러를 적절한 HTTP 상태 코드와 메시지로 변환
function normalizeError(err) {
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(' ');
    return { status: 400, message };
  }
  if (err.name === 'CastError') {
    return { status: 400, message: `잘못된 ${err.path} 값입니다: ${err.value}` };
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? '값';
    return { status: 409, message: `이미 사용 중인 ${field}입니다.` };
  }
  return { status: err.status || 500, message: err.message || '서버 오류가 발생했습니다.' };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message } = normalizeError(err);
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
