# Known Bugs & Issues Tracking

## 🚨 Critical Issues

### 1. OAuth Login 404 Error (HIGHEST PRIORITY)
**Status**: Open  
**Date**: 2025-01-27  
**Description**: Erro 404 NOT_FOUND durante login OAuth via Google - ID: gru1::xt9dg-1756286676151-ad1e8c765e6a
- **URL Problemática**: https://noci-app.vercel.app/auth-callback#access_token=...
- **Root Cause**: Configuração OAuth incorreta ou processamento de hash fragments falhando
- **Reproduction**: 
  1. Acessar https://noci-app.vercel.app
  2. Clicar em "Login with Google"
  3. Autorizar no Google
  4. Recebe erro 404 na callback URL
- **Impact**: Usuários não conseguem fazer login no app
- **Failed Attempts**:
  - ❌ Correção de fallback SPA no Vercel (server/index.ts)
  - ❌ Processamento manual de tokens OAuth (auth-callback.tsx)
  - ❌ Timeout para aguardar processamento do Supabase
- **Next Steps**: Investigar configuração OAuth do Google Console vs Supabase

### 2. Fast Edit Rollback Bug (HIGH PRIORITY)
**Status**: Open  
**Date**: 2025-01-26  
**Description**: Quando o usuário edita rapidamente o título de um cartão e depois a descrição, o servidor faz rollback da edição do título durante o save da descrição.
- **Root Cause**: Race condition entre múltiplas operações de save simultâneas
- **Reproduction**: 
  1. Editar título de uma seção
  2. Rapidamente editar a descrição da mesma seção  
  3. O save da descrição sobrescreve/reverte o título anterior
- **Impact**: Perda de dados do usuário, UX frustrante
- **Temporary Workaround**: Aguardar save do título antes de editar descrição
- **Notes**: Parece ser problema de velocidade/timing no banco de dados

### 2. Title Disappearing After Content Edit
**Status**: NEEDS REVISION  
**Date**: 2025-01-26  
**Description**: Títulos de cartões desapareciam após editar descrições

## 🔧 Minor Issues

### 3. Gray Title Color on Initial Type
**Status**: NEEDS REVISION 
**Date**: 2025-01-26  
**Description**: Títulos Começavam cinza e depois ficavam brancos

## 📋 Future Investigation

### Performance Issues
- [ ] Investigate database connection pooling efficiency
- [ ] Review auto-save debounce timing
- [ ] Consider implementing operation queue for sequential saves

### UX Improvements  
- [ ] Implement better conflict resolution for concurrent edits
- [ ] Consider optimistic locking mechanisms

---

### 4. Hide Plan-Related UI Elements  
**Status**: IN PROGRESS  
**Date**: 2025-01-09  
**Description**: Need to temporarily hide "Plano Atual" section from /perfil page and "Ver Planos Pagos" button from /explorar page
- **Location**: 
  - `client/src/pages/profile.tsx` (lines 394-408 - Plano Atual section)
  - `client/src/pages/directory.tsx` (lines 285-287 - Ver Planos Pagos button)
- **Impact**: Low - UI cleanup to hide subscription-related elements
- **Reproduction**: 
  1. Navigate to /perfil page - "Plano Atual" section should be hidden but not deleted
  2. Navigate to /explorar page - "Ver Planos Pagos" button should be hidden but not deleted
- **Expected**: Elements should be visually hidden but code preserved
- **Actual**: Elements currently visible to users
- **Solution**: Add CSS classes with display:none to hide elements

---
**Last Updated**: 2025-01-09  
**Maintainer**: Development Team