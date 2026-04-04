const normalizeCapabilities = (capabilities) => {
  if (!capabilities || typeof capabilities !== 'object') {
    return {};
  }
  return { ...capabilities };
};

const freezeAdapter = (adapter) => Object.freeze({
  ...adapter,
  capabilities: Object.freeze(normalizeCapabilities(adapter.capabilities)),
});

const normalizeAdapterList = (adapters) => {
  if (!Array.isArray(adapters)) {
    return [];
  }

  const unique = new Map();
  for (const candidate of adapters) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    if (!id) {
      continue;
    }
    const normalized = freezeAdapter({
      id,
      name: typeof candidate.name === 'string' && candidate.name.trim().length > 0 ? candidate.name.trim() : id,
      kind: typeof candidate.kind === 'string' && candidate.kind.trim().length > 0 ? candidate.kind.trim() : 'unknown',
      capabilities: candidate.capabilities,
      availability: typeof candidate.availability === 'function' ? candidate.availability : undefined,
      health: typeof candidate.health === 'function' ? candidate.health : undefined,
    });
    unique.set(id, normalized);
  }

  return Array.from(unique.values());
};

export const createRuntimeRegistry = ({ adapters, defaultBackendId }) => {
  const normalizedAdapters = normalizeAdapterList(adapters);
  const adaptersById = new Map(normalizedAdapters.map((adapter) => [adapter.id, adapter]));
  const fallbackDefaultId = normalizedAdapters[0]?.id ?? null;
  const effectiveDefaultId = adaptersById.has(defaultBackendId) ? defaultBackendId : fallbackDefaultId;

  const listBackends = async () => {
    const rows = await Promise.all(normalizedAdapters.map(async (adapter) => {
      let availability = { available: true };
      if (typeof adapter.availability === 'function') {
        try {
          const result = await adapter.availability();
          if (result && typeof result === 'object') {
            availability = { ...availability, ...result };
          } else if (typeof result === 'boolean') {
            availability = { available: result };
          }
        } catch (error) {
          availability = {
            available: false,
            reason: error instanceof Error ? error.message : 'Availability check failed',
          };
        }
      }

      let health = null;
      if (typeof adapter.health === 'function') {
        try {
          const result = await adapter.health();
          if (result && typeof result === 'object') {
            health = result;
          }
        } catch (error) {
          health = {
            ok: false,
            error: error instanceof Error ? error.message : 'Health check failed',
          };
        }
      }

      return {
        id: adapter.id,
        name: adapter.name,
        kind: adapter.kind,
        capabilities: adapter.capabilities,
        default: adapter.id === effectiveDefaultId,
        availability,
        health,
      };
    }));

    return rows;
  };

  const getDefaultBackendId = () => effectiveDefaultId;

  return {
    listBackends,
    getDefaultBackendId,
  };
};
