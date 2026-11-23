# Recuperação de senha em produção

Os arquivos deste diretório são modelos para configurar no painel do Supabase.
Publicar o HTML no GitHub **não atualiza** o serviço de e-mail do Supabase.

## 1. Corrigir o destino (localhost)

No projeto correto, vá a **Authentication → URL Configuration**:

- **Site URL**: `https://sr-agente208.github.io/Pokemon_pokedex/`
- Em **Redirect URLs**, adicione exatamente:
  `https://sr-agente208.github.io/Pokemon_pokedex/recuperar-senha.html`
- Salve. Preserve outros destinos legítimos que o projeto utilize.

O formulário `recuperar-senha.html` solicita explicitamente esse redirect.
Se ele não estiver permitido, o Supabase pode usar o Site URL como destino.
Solicitações iniciadas pelo painel também podem usar o Site URL: para testar
este fluxo, inicie a recuperação pela página do site.

## 2. Personalizar o e-mail

Em **Authentication → Email Templates → Reset Password** (em algumas versões,
**Authentication → Emails → Templates**):

- Assunto: `🔑 Redefina sua senha — Pokédex`
- Corpo/Source: cole todo o conteúdo de `recovery.html`.
- Salve e confira a prévia no painel.

Mantenha `{{ .ConfirmationURL }}` nos dois links e no texto. Essa variável contém
o endereço de verificação gerado pelo Supabase. Não a substitua pela URL fixa
do site, por `{{ .SiteURL }}` nem por tokens copiados manualmente.

O nome/endereço do remetente é uma configuração separada de SMTP. Este modelo
não modifica o remetente nem exige credenciais SMTP no código do navegador.

## 3. Testar

1. Descarte o link antigo que abriu localhost.
2. Abra `https://sr-agente208.github.io/Pokemon_pokedex/recuperar-senha.html`.
3. Solicite um novo e-mail (aguarde se houver limite de envios).
4. Abra somente o link mais recente. Ele deve terminar na página de recuperação
   da Pokédex e mostrar os campos de nova senha.
5. Escolha uma nova senha e entre pela página de login.

Nunca compartilhe URLs que contenham `access_token`, `refresh_token` ou códigos
de recuperação. Se houver suspeita de exposição de um link completo, conclua a
redefinição com um novo link e encerre as sessões existentes no painel de Auth.

## 4. Saudação com nome e aviso de alteração

A saudação lê `nome` dos metadados do usuário em Auth (`.Data.nome`),
que o cadastro do site já envia. Não lê automaticamente `public.profiles.nome`.
Sem o metadado, o texto fica "Olá, Treinador!". Com nome "Sr Agente",
fica "Olá, Treinador Sr Agente!". Use a interpolação padrão do Supabase;
não desative o escape HTML dos valores de usuário.

Para aplicar a nova versão, substitua o corpo em **Emails → Reset password →
Source** pelo conteúdo atualizado de `recovery.html` e salve.
Assunto sugerido: `⚡ Pokédex — Crie sua nova senha`.

Para o aviso separado, procure **Emails → Security notifications → Password
changed** (os nomes podem variar), habilite a notificação e aplique
`password-changed.html`. Assunto: `🛡️ Pokédex — Sua senha foi alterada`.
Salvar este arquivo no repositório não habilita a notificação no serviço.
Não envie o aviso pelo JavaScript do navegador: use a notificação nativa de Auth.

O modelo não informa um número de minutos para validade: confirme primeiro a
expiração real em Auth antes de incluir esse dado. O layout usa tabelas, cores
explícitas e botão com área generosa para celular. Valide a prévia e um envio
real em Gmail/Outlook, inclusive no modo escuro; clientes podem modificar cores.
