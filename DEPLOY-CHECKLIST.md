# ✅ Deploy Checklist - Noci App

## 📋 Pré-Deploy

### Ambiente Local
- [ ] Node.js 18+ instalado
- [ ] Arquivo `.env` configurado com variáveis corretas
- [ ] Porta 3000 configurada em todos os arquivos
- [ ] Build local funcionando (`npm run build`)
- [ ] Testes passando (`npm run type-check`)

### Credenciais e Serviços
- [ ] Conta no Supabase criada
- [ ] Projeto Supabase configurado
- [ ] Banco de dados e autenticação configurados no Supabase
- [ ] OpenAI API Key disponível
- [ ] Plataforma de deploy configurada (Vercel, Netlify, etc.)

## 🚀 Deploy

### 1. Configuração Supabase
- [ ] Projeto criado em [Supabase](https://app.supabase.com)
- [ ] Banco de dados configurado
- [ ] Autenticação configurada (Google OAuth, email/password)
- [ ] Schema aplicado (`npm run db:push`)
- [ ] Obter URLs e chaves do projeto

### 2. Configuração de Variáveis Ambiente
Configure manualmente ou via CLI da plataforma:

**Backend:**
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=[sua_string_supabase]`
- [ ] `SUPABASE_URL=[sua_url_supabase]`
- [ ] `SUPABASE_ANON_KEY=[sua_chave_publica]`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=[sua_chave_admin]`
- [ ] `OPENAI_API_KEY=[sua_chave_openai]`
- [ ] `ANTHROPIC_API_KEY=[sua_chave_anthropic]`

**Frontend:**
- [ ] `VITE_SUPABASE_URL=[sua_url_supabase]`
- [ ] `VITE_SUPABASE_ANON_KEY=[sua_chave_publica]`

### 3. Deploy
- [ ] Conectar repositório à plataforma de deploy
- [ ] Configurar build settings se necessário
- [ ] Executar deploy inicial
- [ ] Aguardar conclusão do build
- [ ] Anotar URL final do deploy
- [ ] Verificar se deploy foi bem-sucedido

## 🔧 Pós-Deploy

### 1. Configuração Supabase Auth
Acesse [Supabase Dashboard](https://app.supabase.com/) -> Authentication -> Settings:

- [ ] Adicionar URL de produção em "Site URL":
  - `https://[SEU-DOMINIO]`
- [ ] Configurar redirect URLs:
  - `https://[SEU-DOMINIO]/**`
- [ ] Configurar providers OAuth se necessário
- [ ] Salvar configurações

### 2. Verificação de Funcionalidades
- [ ] Acessar URL do deploy: `https://[SEU-DOMINIO].vercel.app`
- [ ] Verificar se página inicial carrega
- [ ] Testar botão "Login com Google"
- [ ] Verificar se redirecionamento funciona
- [ ] Testar logout
- [ ] Verificar se dados do usuário são salvos

### 3. Testes de API
- [ ] Verificar endpoint de health: `/api/health` (se disponível)
- [ ] Testar autenticação: `/api/auth/user`
- [ ] Verificar conexão com banco de dados
- [ ] Testar funcionalidades principais da aplicação

### 4. Monitoramento
- [ ] Verificar logs no Vercel Dashboard
- [ ] Verificar métricas de performance
- [ ] Configurar alertas se necessário

## 🐛 Troubleshooting

### Problemas Comuns

#### Erro 404 no Login Google
**Solução:**
1. Verificar se `GOOGLE_CALLBACK_URL` está correto no Vercel
2. Confirmar URLs no Google Cloud Console
3. Aguardar propagação das mudanças (até 5 minutos)

#### Erro de Autenticação
**Solução:**
1. Verificar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
2. Confirmar que projeto OAuth está em produção (não teste)
3. Verificar domínio autorizado no Google

#### Erro de Database
**Solução:**
1. Verificar `DATABASE_URL` no Vercel
2. Testar conexão com Supabase
3. Executar `npm run db:push` se necessário

#### Erro de Build
**Solução:**
1. Verificar logs do Vercel
2. Testar build local: `npm run build`
3. Verificar dependências no `package.json`

## 📞 Comandos Úteis

```bash
# Deploy completo
npm run deploy

# Deploy preview (teste)
npm run deploy:preview

# Configurar ambiente Vercel
npm run setup:vercel

# Verificar status Vercel
vercel list

# Ver logs do deploy
vercel logs [url-do-deploy]

# Verificar variáveis ambiente
vercel env ls
```

## ✅ Checklist Final

Após completar todos os itens acima:

- [ ] ✅ Aplicação acessível em produção
- [ ] ✅ Login com Google funcionando
- [ ] ✅ Usuários sendo salvos no banco
- [ ] ✅ Todas as funcionalidades principais testadas
- [ ] ✅ URLs atualizadas no Google Cloud Console
- [ ] ✅ Documentação atualizada com URL de produção

## 🎉 Sucesso!

Sua aplicação está agora rodando em produção no Vercel com autenticação Google funcionando corretamente.

**URL de Produção:** `https://[SEU-DOMINIO].vercel.app`

### Próximos Passos
1. Compartilhar URL com usuários
2. Monitorar uso e performance
3. Configurar domínio customizado (opcional)
4. Implementar analytics (opcional)