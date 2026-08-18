<div align="center">
  <img src="banner.svg" alt="Pokédex" width="100%" />

  # ⚡ Pokédex

  **Pesquise, favorite e descubra o universo Pokémon.**

  [![GitHub Pages](https://img.shields.io/badge/Dispon%C3%ADvel-GitHub%20Pages-6f0b8f?style=for-the-badge&logo=github)](https://sr-agente208.github.io/Pokemon_pokedex/)
  [![PokéAPI](https://img.shields.io/badge/Dados-Pok%C3%A9API-e3350d?style=for-the-badge)](https://pokeapi.co/)
  [![Supabase](https://img.shields.io/badge/Backend-Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
</div>

---

## ✨ Recursos

| Recurso | Descrição |
| --- | --- |
| 🔎 Pesquisa Pokémon | Busca por nome ou número, com imagem, tipo, altura e peso. |
| ⭐ Favoritos | Salve Pokémon na sua lista pessoal. |
| 💬 Mural | Compartilhe recados com a comunidade. |
| 🎨 Personalização | Tema claro/escuro e degradê com duas cores. |
| 📚 História | Linha do tempo de anime, mangá e jogos, com links e ilustrações. |
| 📄 Downloads | Baixe a história Pokémon em PDF ou Word estilizado. |
| 🤖 Ficha com IA | Cada Pokémon ganha uma ficha única em PDF e Word, com paleta, marca-d'água, frase e efeito criados pela IA. |
| 🛡️ Cargos | Usuário, Assistente e ADM com códigos temporários. |

## 🧭 Como usar

1. Crie uma conta ou faça login.
2. Pesquise seu Pokémon favorito.
3. Toque em **Favoritar** para guardar sua descoberta.
4. Visite **História** para explorar a cronologia da franquia.
5. Use **Personalizar** para deixar a Pokédex com sua cara.

<details>
<summary><strong>🔐 Configuração do Supabase</strong></summary>

O projeto usa Supabase para autenticação, recados, favoritos e perfis.

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Execute `supabase/schema.sql` no **SQL Editor**.
3. Configure a URL e a chave pública no arquivo `public/supabase-client.js`.
4. **Nunca** publique chaves `secret`, `service_role`, senhas ou connection strings.

</details>

<details>
<summary><strong>🤖 Fichas estilizadas por IA (Groq)</strong></summary>

Cada Pokémon recebe um visual próprio na ficha em PDF e Word: paleta de cores,
marca-d'água, título, frase de efeito e um entre 12 efeitos gráficos.
A análise é feita uma única vez por Pokémon e fica salva no banco (cache).

**Como funciona**

1. O navegador procura o estilo no `localStorage`.
2. Se não achar, procura na tabela `pokemon_styles`.
3. Se ainda não existir, chama a Edge Function `pokemon-style`, que lê a PokéAPI,
   pede a análise à Groq, valida o resultado e salva no banco.
4. Se qualquer etapa falhar, uma paleta local baseada no tipo do Pokémon é usada.
   **A ficha nunca deixa de ser gerada.**

**Instalação**

1. Execute `supabase/pokemon-styles.sql` no **SQL Editor** (cria a tabela e as políticas).
2. Confirme que o secret `GROQ_API_KEY` existe em **Edge Functions → Secrets**.
3. Publique a função:

   ```bash
   supabase functions deploy pokemon-style --no-verify-jwt
   ```

**Testando**

```bash
curl -X POST "https://SEU-PROJETO.supabase.co/functions/v1/pokemon-style" \
  -H "Content-Type: application/json" \
  -d '{"pokemon":"pikachu"}'
```

Resposta: `{ "estilo": { ... }, "cache": false }`.
Use `{"pokemon":"pikachu","recriar":true}` para gerar um estilo novo.

> A `GROQ_API_KEY` fica **apenas** nos Secrets do Supabase. Ela nunca vai para o
> navegador nem para o repositório.

</details>

## 🧰 Tecnologias

- HTML, CSS e JavaScript
- [PokéAPI](https://pokeapi.co/)
- [Supabase](https://supabase.com/) (banco, autenticação e Edge Functions)
- [Groq](https://groq.com/) para as fichas estilizadas
- jsPDF
- GitHub Pages

## 👤 Criador e contato

Criado por [Sr Agente](https://github.com/Sr-agente208).

- 💡 Sugestões e erros: [abra uma issue](https://github.com/Sr-agente208/Pokemon_pokedex/issues)
- ✉️ Contato: use a página **Sobre** no site.

<div align="center">
  <sub>Feito com ⚡ para fãs de Pokémon.</sub>
</div>
