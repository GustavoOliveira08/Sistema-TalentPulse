/* TalentPulse – roteador, cabeçalho e rodapé */
(function (TP) {
  'use strict';
  const ui = TP.ui, esc = TP.util.esc;
  const main = document.getElementById('main');
  const userBox = document.getElementById('userbox');

  const ROUTES = [
    { re: /^\/login$/, view: 'login', public: true },
    { re: /^\/menu$/, view: 'menu' },
    { re: /^\/menu\/admin$/, view: 'menuAdmin', admin: true },
    { re: /^\/colaboradores$/, view: 'colaboradores', admin: true },
    { re: /^\/colaboradores\/(\d+)$/, view: 'colaborador', admin: true, params: m => ({ id: m[1] }) },
    { re: /^\/meus-dados$/, view: 'colaborador', params: () => ({ self: true }) },
    { re: /^\/parametricas$/, view: 'parametricas', admin: true },
    { re: /^\/treinamentos$/, view: 'treinamentos', admin: true },
    { re: /^\/relatorios$/, view: 'relatorios', admin: true }
  ];

  function renderUser(u) {
    if (!u) { userBox.innerHTML = ''; return; }
    userBox.innerHTML = '<span class="who"><strong>' + esc(u.nome) + '</strong><small>' + esc(u.usuario) + '</small></span>' +
      '<button type="button" class="btn btn-ghost" id="logout">Sair</button>';
    document.getElementById('logout').addEventListener('click', () => { TP.auth.logout(); location.hash = '#/login'; });
  }

  function route() {
    const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
    const user = TP.auth.current();
    renderUser(user);
    if (path === '/' || path === '') { location.replace(user ? '#/menu' : '#/login'); return; }
    const r = ROUTES.find(x => x.re.test(path));
    if (!r) { location.replace(user ? '#/menu' : '#/login'); return; }
    if (!r.public && !user) { location.replace('#/login'); return; }
    if (r.public && user) { location.replace('#/menu'); return; }
    if (r.admin && user.perfil !== 'admin') { location.replace('#/menu'); ui.toast('Acesso restrito a administradores.', 'err'); return; }
    main.innerHTML = '';
    const m = path.match(r.re);
    TP.views[r.view](main, r.params ? r.params(m) : {});
    document.title = 'TalentPulse – Sistema de Recursos Humanos';
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  document.getElementById('year').textContent = new Date().getFullYear();
  route();
})(window.TP);
