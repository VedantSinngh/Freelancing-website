// MIGRATION IN PROGRESS: Supabase is being replaced by MongoDB backend.
// This mock client prevents crashes while the remaining components are migrated.

const handler = {
  get(target: any, prop: string) {
    if (prop === 'then') {
      return (onfulfilled?: any) => {
        const res = { data: [], error: null };
        if (onfulfilled) return Promise.resolve(res).then(onfulfilled);
        return Promise.resolve(res);
      };
    }
    if (typeof target[prop] === 'undefined') {
      return () => new Proxy({}, handler);
    }
    return target[prop];
  }
};

const mockSupabase = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async () => ({ error: new Error('Supabase is disabled. Use MongoDB Auth.') }),
    signUp: async () => ({ error: new Error('Supabase is disabled. Use MongoDB Auth.') }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
  from: () => new Proxy({
    select: () => new Proxy({}, handler),
    insert: () => new Proxy({}, handler),
    update: () => new Proxy({}, handler),
    delete: () => new Proxy({}, handler),
    upsert: () => new Proxy({}, handler),
  }, handler),
  storage: {
    from: () => new Proxy({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ data: [], error: null }),
    }, handler)
  },
  channel: () => new Proxy({
    on: () => new Proxy({
      subscribe: () => ({
        on: () => ({
          subscribe: () => { }
        })
      }),
    }, handler)
  }, handler),
  removeChannel: async () => { },
  removeAllChannels: async () => { },
};

export const supabase = mockSupabase as any;