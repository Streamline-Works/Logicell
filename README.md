# Logicell

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/API-Express-000000?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-443E38?logo=react&logoColor=white)](https://zustand-demo.pmnd.rs/)
[![SheetJS](https://img.shields.io/badge/SheetJS-046B46?logo=googlesheets&logoColor=white)](https://sheetjs.com/)
[![React Data Grid](https://img.shields.io/badge/React_Data_Grid-61DAFB?logo=react&logoColor=black)](https://adazzle.github.io/react-data-grid/)
[![Lucide React](https://img.shields.io/badge/Lucide_React-F26522?logo=lucide&logoColor=white)](https://lucide.dev/)

O **Logicell** é uma plataforma para gerenciamento de operações logísticas. O sistema centraliza o processamento de planilhas complexas, organização em pastas e filtros avançados. É uma **SPA (Single Page Application)** consumindo uma **API REST própria em Node/Express**.

---

## ✨ Funcionalidades Principais

- **Autenticação e Sessão (Supabase):** Integração com Supabase para login e proteção de rotas via Server-Side Rendering (SSR).
- **Importação de Planilhas:** Processamento server-side com suporte a dois modos distintos: **Substituir**, que removendo operações antigas, e o modo **Apenas Adicionar**, que agrega novos dados preservando as operações antigas.
- **Sistema Anti-Duplicidade:** Prevenção contra linhas repetidas através da geração de uma `hash_assinatura` exclusiva para cada operação e restrições (`skipDuplicates`), ignorando as repetidas automaticamente.
- **Máquina do Tempo (Snapshots):** Sistema de versionamento de banco de dados que salva automaticamente todo o estado (dados, pastas e regras criadas) de uma versão de planilha antes que a próxima seja importada, permitindo restauração do histórico caso haja erros.
- **Exportação de Planilhas:** Botão para exportar as operações das pastas em planilhas XLSX.
- **Organização em Pastas:** Criação de pastas personalizadas para categorizar as operações, organizando as operações fora da Caixa de Entrada.
- **Regras de Triagem:** Sistema para criação de regras automáticas que direcionam operações recém-importadas para pastas específicas com base em atributos como Produto, Agência e Cliente.
- **Tabela Interativa:** Renderização de dados utilizando React Data Grid, com suporte a paginação assíncrona, fixação de colunas e gerenciamento de estado global no cliente via Zustand.
- **Interações:** Seleções complexas de células (clique e arraste, `Shift + Clique` para intervalos e `Ctrl + Clique` para células avulsas), atalhos de cópia (`Ctrl+C`) mantendo a formatação de tabela
- **Personalização de Visualização:** Reordenação de colunas e redimensionamento persistente, permitindo que a grid seja ajustada sob medida.
- **Produtividade estilo Excel:** Recurso avançado que permite preenchimento em massa ao arrastar o marcador no canto inferior da célula selecionada.
- **Mecanismo de Pesquisa e Filtros:** Lógica de busca dinâmica (*Query Builder*) no backend via Prisma. Garantindo performance em buscas textuais parciais através de índices **GIN** (`pg_trgm`) nativos do PostgreSQL.

---

## 🛠️ Tech Stack

| Categoria | Tecnologia |
| :--- | :--- |
| **Frontend** | SPA React 19 + Vite (react-router v7 em modo biblioteca) |
| **Backend/API** | Node + Express 5 (REST) |
| **Auth & Backend** | Supabase (Auth) com sessão via cookie httpOnly |
| **Linguagem** | TypeScript |
| **Banco de Dados** | PostgreSQL |
| **ORM** | Prisma |
| **Estado Global** | Zustand + TanStack Query (dados de servidor) |
| **Importação / Exportação** | SheetJS (`xlsx`) |
| **Estilização** | Tailwind CSS (clsx, twMerge) |
| **Componentes e Ícones**| React Data Grid, Lucide React |

---

## 📂 Estrutura Arquitetural

```text
├── app/                    # Cliente React (SPA)
│   ├── components/         # Componentes UI reutilizáveis
│   ├── context/            # AuthProvider (sessão via /api/auth)
│   ├── hooks/              # Custom Hooks da aplicação (grid, ações, etc.)
│   ├── lib/                # Cliente HTTP, QueryClient, tipagens
│   ├── pages/              # Páginas (Login, Operações, Automações, Perfil, Usuários)
│   ├── store/              # Gerenciamento de estado global (Zustand)
│   ├── styles/             # Arquivos de estilo e configurações do Tailwind
│   ├── utils/              # Helpers (formatações, exportação Excel)
│   ├── views/              # Telas e views principais (OperacoesView, LoginView, etc.)
│   ├── AppRoutes.tsx       # Rotas declarativas + guards de autenticação
│   └── main.tsx            # Ponto de entrada (createRoot)
├── server/                 # Backend/API (Express)
│   ├── routes/             # Rotas REST (auth, init, pastas, operacoes, colunas, automacoes, usuarios, perfil)
│   ├── middlewares/        # requireUser / requireAdmin
│   ├── services/           # Lógicas de negócio (Importação, Automação, Supabase, Prisma)
│   └── lib/                # Prisma Client e helpers
├── prisma/
│   ├── schema.prisma       # Modelagem ORM (Operacao, Importacao, Pasta, RegraAutomacao)
│   └── migrations/         # Versionamento do Banco de Dados
├── .env.example           # Template de Variáveis de Ambiente
└── package-lock.json      # Gerenciamento determinístico de dependências (NPM)
```

---

## 🏁 Primeiros Passos

### Pré-requisitos
- Projeto e chaves criadas no **[Supabase](https://supabase.com/)**.
- Banco de Dados PostgreSQL configurado.

### Instalação e Execução

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Configure o Ambiente**
   Crie ou renomeie o arquivo `.env` baseando-se no `.env.example` e declare suas variáveis correspondentes de acesso ao Supabase (URL e chaves) e Banco de Dados (`DATABASE_URL`).

3. **Gere os Tipos e Migre o Banco de Dados**
   ```bash
   npm run generate
   npm run migrate
   ```

4. **Inicie tudo (API + SPA juntos)**
   ```bash
   npm run dev
   ```

   O Vite roda em `http://localhost:5173` (com proxy de `/api/*` para a API em `http://localhost:3000`). Para rodar em terminais separados: `npm run dev:server` (API) e `npm run dev:client` (SPA).

### Produção

```bash
npm run build      # gera dist/client (SPA) + build-server/index.cjs (API)
npm start          # sobe a API que também serve os estáticos do SPA em :3000
```

O `Dockerfile` já executa o build e o start em um único container.