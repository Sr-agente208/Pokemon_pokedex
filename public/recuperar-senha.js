(function () {
  var sb = window.supabaseClient;
  var requestForm = document.getElementById('solicitarRecuperacao');
  var passwordForm = document.getElementById('redefinirSenha');
  var message = document.getElementById('estadoRecuperacao');
  var recoveryReady = false;
  function show(text) { message.textContent = text; }
  function errorMessage(error) {
    var text = error && error.message || '';
    if (/fetch|network|load failed/i.test(text)) return 'Não foi possível conectar ao Supabase. Tente novamente quando a conexão estiver disponível.';
    if (/rate limit|too many/i.test(text)) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
    return text || 'Não foi possível concluir. Tente novamente.';
  }
  if (!sb) {
    show('O serviço de autenticação não carregou. Recarregue a página e tente novamente.');
    return;
  }
  // Somente o evento de recuperação libera a troca; uma sessão comum não basta.
  sb.auth.onAuthStateChange(function (event) {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryReady = true;
      requestForm.hidden = true;
      passwordForm.hidden = false;
      show('Link validado. Escolha sua nova senha.');
    }
  });
  var params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get('error_description')) show('O link de recuperação é inválido ou expirou. Solicite outro abaixo.');
  requestForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var button = requestForm.querySelector('button');
    button.disabled = true;
    show('Solicitando o e-mail de recuperação…');
    var redirect = new URL('recuperar-senha.html', window.location.href).href;
    sb.auth.resetPasswordForEmail(document.getElementById('emailRecuperacao').value.trim(), {redirectTo: redirect})
      .then(function (result) {
        if (result.error) { show(errorMessage(result.error)); return; }
        show('Se houver uma conta para esse e-mail, você receberá um link de recuperação. Confira também o spam e abra o link mais recente.');
      }).catch(function (error) { show(errorMessage(error)); })
      .then(function () { button.disabled = false; });
  });
  passwordForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!recoveryReady) { show('Abra o link enviado ao seu e-mail para redefinir a senha.'); return; }
    var password = document.getElementById('novaSenha').value;
    if (password.length < 8) { show('Use uma senha com pelo menos 8 caracteres.'); return; }
    if (password !== document.getElementById('confirmarSenha').value) { show('As senhas não coincidem.'); return; }
    var button = passwordForm.querySelector('button');
    button.disabled = true;
    sb.auth.updateUser({password: password}).then(function (result) {
      if (result.error) { show(errorMessage(result.error)); button.disabled = false; return; }
      recoveryReady = false;
      passwordForm.reset();
      passwordForm.hidden = true;
      window.history.replaceState(null, '', window.location.pathname);
      show('Senha alterada! Clique em Voltar ao login e entre com a nova senha.');
      return sb.auth.signOut();
    }).catch(function (error) { show(errorMessage(error)); button.disabled = false; });
  });
}());
