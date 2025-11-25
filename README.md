# Consulta de Cadastro

Sistema de consulta de dados cadastrais integrado com Google Sheets.

## Deploy na Vercel

### Opção 1: Via GitHub (Recomendado)

1. Crie um repositório no GitHub
2. Faça upload destes arquivos para o repositório
3. Acesse [vercel.com](https://vercel.com) e faça login
4. Clique em "Add New Project"
5. Importe o repositório do GitHub
6. A Vercel detectará automaticamente que é um projeto Vite
7. Clique em "Deploy"

### Opção 2: Via Vercel CLI

1. Instale a CLI da Vercel:
```bash
npm install -g vercel
```

2. Na pasta do projeto, execute:
```bash
npm install
vercel
```

3. Siga as instruções no terminal

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Configuração

A planilha do Google Sheets deve estar configurada como **pública** (qualquer pessoa com o link pode visualizar).

ID da planilha e GID da aba estão configurados no arquivo `src/App.jsx`.
