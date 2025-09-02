  O Erro Maldito: Carregamento Infinito Após Login

  🎯 O que está acontecendo

  - ✅ Login funciona - aparece "SIGNED_IN" no console
  - ❌ Dados do usuário nunca carregam - fica eternamente "Fetching user data..."
  - ❌ Nenhum erro aparece - só silêncio e loading

  🔍 Por que isso acontece

  Quando você faz login no frontend, o contexto de autenticação (quem é o usuário logado) não chega ao banco de dados. É como se:

  1. Você entra no prédio (login bem-sucedido)
  2. Mas o porteiro do banco (o banco de dados) não sabe que você entrou
  3. Então ele não te deixa entrar (auth.uid() retorna null)

  🎯 O problema real

  -- Essa linha dentro da função get_current_user_profile():
  WHERE u.id = (auth.uid())::text;

  -- auth.uid() retorna NULL em produção, mesmo com usuário logado

  🛠️ 3 soluções simples

  Opção 1: User ID Direto (mais fácil)

  // Em vez de usar auth.uid(), passamos o ID diretamente
  const userId = session.user.id;
  const { data } = await supabase.rpc('get_user_by_id', { user_id: userId });

  Opção 2: Headers de Autenticação

  // Garantir que o token JWT está sendo enviado
  const { data } = await supabase.rpc('get_current_user_profile', {}, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  Opção 3: Query Direta (mais simples ainda)

  // Buscar direto pelo usuário logado
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  🚨 Para testar

  1. Abrir DevTools → Network tab
  2. Verificar se os headers incluem Authorization: Bearer ...
  3. Verificar se o user ID está sendo enviado corretamente

  📱 Como escolher

  - Opção 1 → Mais rápida de implementar
  - Opção 2 → Mantém a segurança do auth.uid()
  - Opção 3 → Elimina a função RPC completamente