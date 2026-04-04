export const registerRuntimeRegistryRoutes = (app, dependencies) => {
  const {
    listRuntimeBackends,
    getDefaultRuntimeBackendId,
  } = dependencies;

  app.get('/api/runtime/backends', async (_req, res) => {
    try {
      const backends = await listRuntimeBackends();
      const defaultBackend = getDefaultRuntimeBackendId();
      res.json({
        defaultBackend,
        backends,
      });
    } catch (error) {
      console.error('Failed to list runtime backends:', error);
      res.status(500).json({ error: 'Failed to list runtime backends' });
    }
  });
};
