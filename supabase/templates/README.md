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
