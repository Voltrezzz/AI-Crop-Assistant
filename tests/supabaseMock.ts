export const cloudMock = {
  configured: false,
  sessionId: 'cloud-user-1',
  rows: [] as Array<{ entity: string; cloud_id: string; local_id: string; payload: Record<string, unknown> }>,
  uploaded: [] as any[],
  fail: false,
};
export const isSupabaseConfigured = () => cloudMock.configured;
export const getSupabaseClient = () => ({
  auth: { getSession: async () => ({ data: { session: { user: { id: cloudMock.sessionId } } }, error: null }) },
  from: () => ({
    upsert: async (value: unknown) => {
      if (cloudMock.fail) return { error: new Error('Test network failure') };
      cloudMock.uploaded.push(value);
      return { error: null };
    },
    select: () => ({ eq: () => ({ in: async () => ({ data: cloudMock.rows, error: null }) }) }),
  }),
});
