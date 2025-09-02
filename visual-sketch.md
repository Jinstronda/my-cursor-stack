# Esboço Visual - Caixas Editáveis com Botão +

## Layout Atual vs Novo Design

### Estado Normal (sem hover)
```
┌─────────────────────────────────────┐
│ Título da Seção                     │
│ ─────────────────────────────────── │
│                                     │
│ Conteúdo da seção aqui...           │
│ Pode ter múltiplas linhas          │
│ e diferentes tipos de dados         │
│                                     │
└─────────────────────────────────────┘
```

### Estado Hover (com botão +)
```
┌─────────────────────────────────────┐
│ Título da Seção                     │
│ ─────────────────────────────────── │
│                                     │
│ Conteúdo da seção aqui...           │
│ Pode ter múltiplas linhas          │
│ e diferentes tipos de dados         │
│                                     │
└─────────────────┬───────────────────┘
                  │
            ┌─────┴─────┐
            │     +     │  ← Botão retangular
            └───────────┘     metade dentro/fora
```

## Especificações do Botão

### Posicionamento
- **Localização**: Centro-inferior da caixa
- **Posição**: 50% dentro da caixa, 50% fora (sobreposto)
- **Alinhamento**: Centralizado horizontalmente

### Design
- **Formato**: Retangular (não circular)
- **Tamanho**: Pequeno e clean
- **Conteúdo**: Ícone "+" simples
- **Estilo**: Minimalista, sem decorações excessivas

### Comportamento
- **Trigger**: Aparece apenas no hover da caixa
- **Animação**: Suave fade-in/fade-out
- **Função**: Adicionar nova seção abaixo da atual

### CSS Positioning
```css
position: absolute
bottom: -12px  /* Metade do height do botão */
left: 50%
transform: translateX(-50%)
z-index: 10
```

## Dimensões Sugeridas
- **Width**: ~60px
- **Height**: ~24px  
- **Border-radius**: ~6px
- **Icon size**: ~14px

## Estados Visuais
1. **Normal**: Background subtle, border clean
2. **Hover**: Slight elevation, color accent
3. **Active**: Brief scale animation