export default {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: (_ctx: any) => ({ status: 'ok', timestamp: new Date().toISOString() }),
      config: {
        auth: false,
      },
    },
  ],
};
