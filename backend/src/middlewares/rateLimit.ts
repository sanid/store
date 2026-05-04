const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export default (config: { windowMs?: number; max?: number } = {}) => {
  const windowMs = config.windowMs || 60 * 1000;
  const max = config.max || 10;

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, windowMs);

  return async (ctx: any, next: any) => {
    const ip = ctx.request.ip || ctx.ip || 'unknown';
    const key = `${ip}:${ctx.request.path}`;
    const now = Date.now();

    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count++;
      if (entry.count > max) {
        ctx.status = 429;
        ctx.body = { error: 'Too many requests. Please try again later.' };
        return;
      }
    }

    await next();
  };
};
