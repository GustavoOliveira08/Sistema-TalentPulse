/* TalentPulse – telas */
(function (TP) {
  'use strict';
  const U = TP.util, ui = TP.ui, db = TP.db, esc = U.esc;
  const V = TP.views = {};
  const num = v => (v === null || v === undefined || v === '') ? '' : String(v).replace('.', ',');

  /* ---------------------------------------------------------------- */
  /* helpers                                                           */
  /* ---------------------------------------------------------------- */
  const deptOpts = () => db.Departamentos.list().map(d => [d.id_departamento, d.nome_departamento]);
  function bindDeptCargo(form, o) {
    o = o || {};
    const dn = o.dept || 'id_departamento', cn = o.cargo || 'id_cargo';
    const ds = form.elements[dn], cs = form.elements[cn];
    const hint = () => {
      const h = form.querySelector('[data-hint="' + cn + '"]'); if (!h) return;
      const c = cs.value && db.Cargos.get(cs.value);
      h.textContent = c ? 'Faixa salarial: ' + U.brl(c.salario_base_min) + ' a ' + U.brl(c.salario_base_max) : ' ';
    };
    const fill = sel => {
      const list = ds.value ? db.Cargos.list(ds.value) : [];
      cs.innerHTML = '<option value="">' + (ds.value ? 'Selecione…' : 'Selecione o departamento primeiro') + '</option>' +
        list.map(c => '<option value="' + c.id_cargo + '">' + esc(c.titulo_cargo) + '</option>').join('');
      if (sel) cs.value = String(sel);
      hint();
    };
    ds.addEventListener('change', () => fill());
    cs.addEventListener('change', () => { hint(); if (o.onCargo) o.onCargo(cs.value ? db.Cargos.get(cs.value) : null); });
    fill(o.selected);
  }
  const badge = (txt, cls) => '<span class="badge ' + cls + '">' + esc(txt) + '</span>';
  const statusBadge = s => badge(s, { 'Ativo': 'ok', 'Desligado': 'off', 'Em Licença': 'warn' }[s] || '');
  const validBadge = v => v ? badge(v.rotulo, { vencido: 'off', avencer: 'warn', valido: 'ok', permanente: 'info' }[v.chave]) : '—';
  const cell = html => '<div class="kv">' + html + '</div>';
  const kv = (k, v) => '<div class="kv-row"><span class="k">' + esc(k) + '</span><span class="v">' + v + '</span></div>';
  const initials = n => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ---------------------------------------------------------------- */
  /* Login                                                             */
  /* ---------------------------------------------------------------- */
  V.login = function (main) {
    const node = ui.el('<div class="center-stage"><div class="login-card"><div class="login-title">Autenticação</div>' +
      '<form novalidate>' + ui.field({ name: 'usuario', label: 'Usuário', required: true, attrs: 'autocomplete="username" autofocus' }) +
      ui.field({ name: 'senha', label: 'Senha', type: 'password', required: true, attrs: 'autocomplete="current-password"' }) +
      '<button type="submit" class="btn btn-primary btn-block" disabled>Ingressar</button></form>' +
      '<p class="demo-hint">Demonstração: <code>admin</code> / <code>Admin@123</code> (administrador) ou <code>colaborador</code> / <code>Colab@123</code></p></div></div>');
    const form = node.querySelector('form'), btn = form.querySelector('button');
    const sync = () => { btn.disabled = !(form.usuario.value.trim() && form.senha.value); };
    form.addEventListener('input', sync);
    form.addEventListener('submit', e => {
      e.preventDefault(); ui.clearErrors(form);
      try { TP.auth.login(form.usuario.value, form.senha.value); location.hash = '#/menu'; }
      catch (err) {
        if (err instanceof TP.ValidationError) { ui.showErrors(form, err.errors); form.senha.value = ''; sync(); } else throw err;
      }
    });
    main.appendChild(node);
  };

  /* ---------------------------------------------------------------- */
  /* Menus                                                             */
  /* ---------------------------------------------------------------- */
  function cards(list) {
    return '<div class="cards">' + list.map(c => '<a class="card-menu" href="' + c.href + '"><span class="pill">' + esc(c.label) + '</span>' +
      '<span class="card-ico">' + ui.ICONS[c.icon] + '</span><span class="card-desc">' + esc(c.desc) + '</span></a>').join('') + '</div>';
  }
  V.menu = function (main) {
    const u = TP.auth.current(); const items = [];
    if (u.perfil === 'admin') {
      items.push({ label: 'Administração', href: '#/menu/admin', icon: 'settings', desc: 'Parâmetros, pessoal e treinamentos' });
      items.push({ label: 'Relatórios', href: '#/relatorios', icon: 'chart', desc: 'Quadro, salários e certificados' });
    }
    items.push({ label: 'Colaborador', href: '#/meus-dados', icon: 'user', desc: 'Seus dados e histórico' });
    const node = ui.el('<div class="center-stage col">' + cards(items) +
      (u.perfil === 'admin' ? '<button type="button" class="link-btn" id="reset">Restaurar dados de demonstração</button>' : '') + '</div>');
    const r = node.querySelector('#reset');
    if (r) r.addEventListener('click', async () => {
      if (await ui.confirm({ title: 'Restaurar dados', message: 'Todos os dados cadastrados neste navegador serão apagados e substituídos pelos dados de demonstração. Continuar?', confirmLabel: 'Restaurar' })) {
        db.reset(); TP.auth.logout(); ui.toast('Dados restaurados. Faça login novamente.'); location.hash = '#/login';
      }
    });
    main.appendChild(node);
  };
  V.menuAdmin = function (main) {
    const p = ui.panel({ title: 'Administração', backTo: '#/menu' });
    p.body.innerHTML = cards([
      { label: 'Paramétricas', href: '#/parametricas', icon: 'settings', desc: 'Departamentos e cargos' },
      { label: 'Adm. Pessoal', href: '#/colaboradores', icon: 'users', desc: 'Cadastro de colaboradores' },
      { label: 'Treinamentos', href: '#/treinamentos', icon: 'book', desc: 'Cursos, matrículas e validades' }]);
    p.body.classList.add('menu-body'); main.appendChild(p.el);
  };

  /* ---------------------------------------------------------------- */
  /* Lista de colaboradores                                            */
  /* ---------------------------------------------------------------- */
  const listState = { mode: 'colab', f: {}, searched: false };

  V.colaboradores = function (main) {
    const p = ui.panel({ title: 'Lista de colaboradores', backTo: '#/menu/admin', actions: [{ icon: 'plus', title: 'Adicionar colaborador', id: 'add' }] });
    p.body.innerHTML =
      '<div class="radios" role="radiogroup" aria-label="Tipo de busca">' +
      '<label class="radio"><input type="radio" name="mode" value="colab"><span class="dot"></span>BUSCA POR COLABORADOR</label>' +
      '<label class="radio"><input type="radio" name="mode" value="assign"><span class="dot"></span>BUSCA POR ATRIBUIÇÃO</label></div>' +
      '<form class="search" novalidate><fieldset><legend>Parâmetros de busca</legend><div class="search-grid"></div>' +
      '<div class="search-btns"><button type="submit" class="icon-btn dark" title="Buscar" aria-label="Buscar">' + ui.ICONS.search + '</button>' +
      '<button type="button" class="icon-btn dark" data-clear title="Limpar filtros" aria-label="Limpar filtros">' + ui.ICONS.eraser + '</button></div></fieldset></form>' +
      '<h2 class="results-title">Resultados da busca</h2><div class="results"></div>';
    main.appendChild(p.el);
    const grid = p.body.querySelector('.search-grid'), form = p.body.querySelector('form.search'), results = p.body.querySelector('.results');
    let tbl = null;

    function drawFields() {
      const f = listState.f;
      if (listState.mode === 'colab') {
        grid.innerHTML = ui.field({ name: 'id', label: 'Código', value: f.id, attrs: 'inputmode="numeric"' }) +
          ui.field({ name: 'cpf', label: 'CPF', value: f.cpf, mask: 'cpf', placeholder: '000.000.000-00' }) +
          ui.field({ name: 'nome', label: 'Nome', value: f.nome }) +
          ui.field({ name: 'email', label: 'E-mail corporativo', value: f.email }) +
          ui.field({ name: 'data_admissao', label: 'Data de admissão', type: 'date', value: f.data_admissao });
      } else {
        grid.innerHTML = ui.field({ name: 'id_departamento', label: 'Departamento', options: deptOpts(), value: f.id_departamento }) +
          ui.field({ name: 'id_cargo', label: 'Cargo', options: [], value: '' }) +
          ui.field({ name: 'status', label: 'Situação', options: db.consts.STATUS_COLAB.map(s => [s, s]), value: f.status });
        bindDeptCargo(form, { selected: f.id_cargo });
      }
    }
    function readFilters() { const o = {}; Array.from(form.elements).forEach(e => { if (e.name) o[e.name] = e.value.trim(); }); return o; }
    function validateFilters(f) {
      const errors = {};
      if (listState.mode === 'colab') {
        if (f.id && !/^\d+$/.test(f.id)) errors.id = 'Use apenas números.';
        if (f.cpf && U.digits(f.cpf).length > 11) errors.cpf = 'CPF com mais de 11 dígitos.';
        if (f.cpf && !/^[\d.\-]+$/.test(f.cpf)) errors.cpf = 'Use apenas números.';
        if (f.nome && f.nome.length < 2) errors.nome = 'Digite ao menos 2 letras.';
        if (f.data_admissao && !U.isISODate(f.data_admissao)) errors.data_admissao = 'Data inválida.';
      }
      return errors;
    }
    function filtered() {
      const f = listState.f; let rows = db.Colaboradores.list();
      if (listState.mode === 'colab') {
        if (f.id) rows = rows.filter(r => r.id_colaborador === Number(f.id));
        if (f.cpf) rows = rows.filter(r => U.digits(r.cpf).includes(U.digits(f.cpf)));
        if (f.nome) rows = rows.filter(r => U.norm(r.nome).includes(U.norm(f.nome)));
        if (f.email) rows = rows.filter(r => r.email_corporativo.includes(f.email.toLowerCase()));
        if (f.data_admissao) rows = rows.filter(r => r.data_admissao === f.data_admissao);
      } else {
        if (f.id_departamento) rows = rows.filter(r => r.id_departamento === Number(f.id_departamento));
        if (f.id_cargo) rows = rows.filter(r => r.id_cargo === Number(f.id_cargo));
        if (f.status) rows = rows.filter(r => r.status === f.status);
      }
      return rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    function drawResults(keepPage) {
      if (!listState.searched) { results.innerHTML = '<p class="muted">Informe os parâmetros e clique em buscar (sem filtros, lista todos).</p>'; tbl = null; return; }
      const rows = filtered();
      if (tbl && keepPage) { tbl.refresh(rows); return; }
      results.innerHTML = '';
      tbl = ui.table({
        rows, empty: 'Nenhum colaborador encontrado para os parâmetros informados.',
        columns: [
          { label: 'Código', render: r => r.id_colaborador }, { label: 'CPF', render: r => esc(r.cpf) },
          { label: 'Nome completo', render: r => esc(r.nome) }, { label: 'Departamento', render: r => esc(r.nome_departamento) },
          { label: 'Cargo', render: r => esc(r.titulo_cargo) }, { label: 'Admissão', render: r => U.fmtDate(r.data_admissao) },
          { label: 'Situação', render: r => statusBadge(r.status) },
          { label: 'Ação', cls: 'actions', render: r =>
            '<button type="button" class="switch' + (r.status === 'Ativo' ? ' on' : '') + '" role="switch" aria-checked="' + (r.status === 'Ativo') + '" data-act="toggle" data-id="' + r.id_colaborador + '" title="' + (r.status === 'Ativo' ? 'Desligar colaborador' : 'Reativar colaborador') + '" aria-label="Situação ativa de ' + esc(r.nome) + '"><span></span></button>' +
            '<button type="button" class="icon-btn dark" data-act="edit" data-id="' + r.id_colaborador + '" title="Editar dados" aria-label="Editar ' + esc(r.nome) + '">' + ui.ICONS.edit + '</button>' +
            '<button type="button" class="icon-btn dark" data-act="view" data-id="' + r.id_colaborador + '" title="Ver cargo e histórico" aria-label="Ver cargo de ' + esc(r.nome) + '">' + ui.ICONS.wand + '</button>' +
            '<button type="button" class="icon-btn dark" data-act="del" data-id="' + r.id_colaborador + '" title="Excluir" aria-label="Excluir ' + esc(r.nome) + '">' + ui.ICONS.trash + '</button>' }]
      });
      results.appendChild(tbl);
    }

    p.body.querySelectorAll('input[name=mode]').forEach(r => {
      r.checked = r.value === listState.mode;
      r.addEventListener('change', () => { listState.mode = r.value; listState.f = {}; listState.searched = false; drawFields(); drawResults(); });
    });
    form.addEventListener('submit', e => {
      e.preventDefault(); ui.clearErrors(form);
      const f = readFilters(); const errors = validateFilters(f);
      if (Object.keys(errors).length) { ui.showErrors(form, errors); return; }
      listState.f = f; listState.searched = true; drawResults();
    });
    form.querySelector('[data-clear]').addEventListener('click', () => { listState.f = {}; listState.searched = false; drawFields(); drawResults(); ui.clearErrors(form); });

    results.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = Number(b.dataset.id), c = db.Colaboradores.get(id);
      try {
        if (b.dataset.act === 'view') location.hash = '#/colaboradores/' + id;
        else if (b.dataset.act === 'edit') editColab(c, () => drawResults(true));
        else if (b.dataset.act === 'toggle') {
          const novo = c.status === 'Ativo' ? 'Desligado' : 'Ativo';
          if (await ui.confirm({ title: novo === 'Desligado' ? 'Desligar colaborador' : 'Reativar colaborador',
            message: (novo === 'Desligado' ? 'Desligar ' : 'Reativar ') + '<strong>' + esc(c.nome) + '</strong>?', confirmLabel: novo === 'Desligado' ? 'Desligar' : 'Reativar' })) {
            db.Colaboradores.setStatus(id, novo); ui.toast(c.nome + ': situação alterada para ' + novo + '.'); drawResults(true);
          }
        } else if (b.dataset.act === 'del') {
          if (await ui.confirm({ title: 'Excluir colaborador', message: 'Excluir <strong>' + esc(c.nome) + '</strong>? Esta ação não pode ser desfeita.', confirmLabel: 'Excluir' })) {
            db.Colaboradores.remove(id); ui.toast('Colaborador excluído.'); drawResults(true);
          }
        }
      } catch (err) { if (err instanceof TP.ValidationError) ui.toast(err.errors._ || Object.values(err.errors)[0], 'err'); else throw err; }
    });
    p.on('add', () => addColab(() => { listState.searched = true; drawResults(); }));

    drawFields(); drawResults();
  };

  function editColab(c, done) {
    ui.modal({ title: 'Editar colaborador', saveLabel: 'Guardar',
      body: ui.field({ name: 'cpf', label: 'CPF', value: c.cpf, readonly: true }) +
        ui.field({ name: 'nome', label: 'Nome completo', value: c.nome, required: true, maxlength: 150 }) +
        ui.field({ name: 'email_corporativo', label: 'E-mail corporativo', value: c.email_corporativo, required: true, maxlength: 100, type: 'email' }) +
        ui.field({ name: 'status', label: 'Situação', value: c.status, options: db.consts.STATUS_COLAB.map(s => [s, s]), noBlank: true }),
      onSubmit(d) { db.Colaboradores.update(c.id_colaborador, d); ui.toast('Dados atualizados.'); done && done(); return true; } });
  }

  function addColab(done) {
    let found = null;
    const body = '<fieldset class="box"><legend>Parâmetros de busca</legend><div class="row-search">' +
      ui.field({ name: 'cpf', label: 'CPF', required: true, mask: 'cpf', placeholder: '000.000.000-00', cls: 'grow' }) +
      '<button type="button" class="icon-btn dark" data-find title="Buscar CPF" aria-label="Buscar CPF">' + ui.ICONS.search + '</button></div>' +
      '<div class="info" data-info hidden></div></fieldset>' +
      '<fieldset class="box" data-data hidden><legend>Dados do colaborador</legend><div class="grid2">' +
      ui.field({ name: 'nome', label: 'Nome completo', required: true, maxlength: 150, cls: 'span2' }) +
      ui.field({ name: 'email_corporativo', label: 'E-mail corporativo', required: true, maxlength: 100, type: 'email' }) +
      ui.field({ name: 'data_admissao', label: 'Data de admissão', required: true, type: 'date', value: U.todayISO(), attrs: 'max="' + U.todayISO() + '"' }) +
      ui.field({ name: 'id_departamento', label: 'Departamento', required: true, options: deptOpts() }) +
      ui.field({ name: 'id_cargo', label: 'Cargo', required: true, options: [], hint: ' ' }) +
      ui.field({ name: 'salario', label: 'Salário inicial (R$)', required: true, attrs: 'inputmode="decimal"', placeholder: '0,00', cls: 'span2' }) +
      '</div></fieldset>';
    ui.modal({ title: 'Adicionar colaborador', body, saveLabel: 'Guardar', wide: true,
      onOpen(form, ctl) {
        ctl.setSaveEnabled(false);
        const info = form.querySelector('[data-info]'), data = form.querySelector('[data-data]');
        bindDeptCargo(form);
        const reset = () => { found = null; data.hidden = true; info.hidden = true; ctl.setSaveEnabled(false); };
        form.cpf.addEventListener('input', reset);
        const find = () => {
          ui.clearErrors(form);
          try {
            const r = db.Colaboradores.buscarPorCPF(form.cpf.value);
            found = r; data.hidden = false; info.hidden = false; ctl.setSaveEnabled(true);
            if (r.candidato) {
              info.className = 'info ok'; info.textContent = 'CPF encontrado no banco de talentos: dados do candidato preenchidos. Confira e complete o cadastro.';
              form.nome.value = r.candidato.nome; form.email_corporativo.value = '';
            } else {
              info.className = 'info'; info.textContent = 'CPF válido e ainda não cadastrado. Preencha os dados do colaborador.';
            }
            form.nome.focus();
          } catch (err) { if (err instanceof TP.ValidationError) { reset(); ui.showErrors(form, err.errors); } else throw err; }
        };
        form.querySelector('[data-find]').addEventListener('click', find);
        form.cpf.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); find(); } });
      },
      onSubmit(d) {
        if (!found) throw new TP.ValidationError({ cpf: 'Busque o CPF antes de salvar.' });
        db.Colaboradores.create(d); ui.toast('Colaborador cadastrado com sucesso.'); done && done(); return true;
      } });
  }

  /* ---------------------------------------------------------------- */
  /* Detalhe do colaborador                                            */
  /* ---------------------------------------------------------------- */
  V.colaborador = function (main, params) {
    const self = !!params.self; const cur = TP.auth.current();
    const id = self ? cur.id_colaborador : Number(params.id);
    const c = db.Colaboradores.get(id);
    if (!c) { main.appendChild(ui.el('<div class="center-stage"><div class="notice">Colaborador não encontrado. <a href="#/colaboradores">Voltar à lista</a></div></div>')); return; }
    const admin = cur.perfil === 'admin';
    const p = ui.panel({ title: 'Dados do colaborador', backTo: self ? '#/menu' : '#/colaboradores',
      actions: admin && c.status !== 'Desligado' ? [{ icon: 'plus', title: 'Registrar reajuste salarial', id: 'raise' }, { icon: 'edit', title: 'Modificar cargo', id: 'cargo' }] : [] });
    const tempo = (() => { const d = U.daysBetween(c.data_admissao, U.todayISO()); const y = Math.floor(d / 365), m = Math.floor((d % 365) / 30); return d < 0 ? '—' : (y ? y + ' ano(s) ' : '') + m + ' mês(es)'; })();
    p.body.innerHTML = '<div class="detail-grid"><div class="card-info person"><div class="id-col"><div class="avatar" aria-hidden="true">' + esc(initials(c.nome)) + '</div>' +
      '<div class="cpf-big">' + esc(c.cpf) + '</div></div><div class="grow">' +
      '<h2>DADOS DO COLABORADOR</h2>' + kv('Código', c.id_colaborador) + kv('Nome', esc(c.nome)) + kv('E-mail', esc(c.email_corporativo)) +
      kv('Admissão', U.fmtDate(c.data_admissao) + ' <small>(' + tempo + ')</small>') + kv('Situação', statusBadge(c.status)) + '</div></div>' +
      '<div class="card-info"><h2>CARGO ATUAL</h2>' + kv('Departamento', esc(c.nome_departamento)) + kv('Cargo', esc(c.titulo_cargo)) +
      kv('Salário atual', '<strong>' + U.brl(c.salario) + '</strong>') + kv('Faixa do cargo', U.brl(c.salario_min) + ' a ' + U.brl(c.salario_max)) +
      kv('No cargo desde', U.fmtDate(c.inicio_cargo)) + '</div></div>' +
      '<section class="sub"><h2>Cargos anteriores do colaborador</h2><div id="t1"></div></section>' +
      '<section class="sub"><h2>Histórico salarial</h2><div id="t2"></div></section>';
    main.appendChild(p.el);
    p.body.querySelector('#t1').appendChild(ui.table({ perPage: 5, rows: db.Colaboradores.cargosAnteriores(id), empty: 'Sem cargos anteriores.',
      columns: [{ label: 'Cargo', render: r => esc(r.titulo_cargo) }, { label: 'Departamento', render: r => esc(r.nome_departamento) },
        { label: 'Data de início', render: r => U.fmtDate(r.data_inicio) }, { label: 'Data de fim', render: r => U.fmtDate(r.data_fim) }] }));
    p.body.querySelector('#t2').appendChild(ui.table({ perPage: 5, rows: db.Colaboradores.historicoSalarial(id), empty: 'Sem registros.',
      columns: [{ label: 'Data', render: r => U.fmtDate(r.data_alteracao) }, { label: 'Salário anterior', render: r => r.salario_anterior ? U.brl(r.salario_anterior) : '—' },
        { label: 'Novo salário', render: r => U.brl(r.novo_salario) },
        { label: 'Variação', render: r => r.salario_anterior ? ((r.novo_salario / r.salario_anterior - 1) * 100).toFixed(1).replace('.', ',') + '%' : '—' },
        { label: 'Motivo', render: r => esc(r.motivo) }] }));
    const rerender = () => { main.innerHTML = ''; V.colaborador(main, params); };
    p.on('raise', () => {
      ui.modal({ title: 'Registrar reajuste salarial', saveLabel: 'Guardar',
        body: '<div class="box plain">' + kv('Cargo', esc(c.titulo_cargo)) + kv('Salário atual', U.brl(c.salario)) + kv('Faixa do cargo', U.brl(c.salario_min) + ' a ' + U.brl(c.salario_max)) + '</div>' +
          ui.field({ name: 'novo_salario', label: 'Novo salário (R$)', required: true, attrs: 'inputmode="decimal"', placeholder: '0,00' }) +
          ui.field({ name: 'motivo', label: 'Motivo', required: true, options: db.consts.MOTIVOS_REAJUSTE.map(m => [m, m]) }) +
          ui.field({ name: 'data_alteracao', label: 'Data de vigência', type: 'date', required: true, value: U.todayISO(), attrs: 'min="' + db.Colaboradores.ultimaMovimentacao(id) + '" max="' + U.todayISO() + '"' }),
        onSubmit(d) { db.Colaboradores.reajustar(id, d); ui.toast('Reajuste registrado no histórico salarial.'); rerender(); return true; } });
    });
    p.on('cargo', () => {
      ui.modal({ title: 'Modificar cargo', saveLabel: 'Guardar', wide: true,
        body: '<div class="box plain"><strong>CARGO ATUAL</strong>' + kv('Departamento', esc(c.nome_departamento)) + kv('Cargo', esc(c.titulo_cargo)) +
          kv('Salário', U.brl(c.salario)) + kv('No cargo desde', U.fmtDate(c.inicio_cargo)) + '</div>' +
          '<div class="grid2">' + ui.field({ name: 'id_departamento', label: 'Departamento', required: true, options: deptOpts(), value: c.id_departamento }) +
          ui.field({ name: 'id_cargo', label: 'Novo cargo', required: true, options: [], hint: ' ' }) +
          ui.field({ name: 'motivo', label: 'Motivo do movimento', required: true, options: db.consts.MOTIVOS.map(m => [m, m]) }) +
          ui.field({ name: 'novo_salario', label: 'Novo salário (R$)', required: true, attrs: 'inputmode="decimal"', placeholder: '0,00' }) +
          ui.field({ name: 'data_alteracao', label: 'Data do movimento', type: 'date', required: true, value: U.todayISO(), attrs: 'min="' + db.Colaboradores.ultimaMovimentacao(id) + '" max="' + U.todayISO() + '"' }) + '</div>',
        onOpen(form) { bindDeptCargo(form); },
        onSubmit(d) { db.Colaboradores.mudarCargo(id, d); ui.toast('Cargo modificado.'); rerender(); return true; } });
    });
  };

  /* ---------------------------------------------------------------- */
  /* Paramétricas                                                      */
  /* ---------------------------------------------------------------- */
  const tabsHTML = (tabs, cur) => '<div class="tabs" role="tablist">' + tabs.map(t =>
    '<button type="button" role="tab" class="tab' + (t[0] === cur ? ' active' : '') + '" aria-selected="' + (t[0] === cur) + '" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>').join('') + '</div>';
  const rowActions = (id, name) =>
    '<button type="button" class="icon-btn dark" data-act="edit" data-id="' + id + '" title="Editar" aria-label="Editar ' + esc(name) + '">' + ui.ICONS.edit + '</button>' +
    '<button type="button" class="icon-btn dark" data-act="del" data-id="' + id + '" title="Excluir" aria-label="Excluir ' + esc(name) + '">' + ui.ICONS.trash + '</button>';

  function tabbedPage(main, cfg) {
    // cfg: {title, backTo, tabs:[[key,label]], render(key)->{table, addTitle, onAdd, onAction(act,id)}}
    let cur = cfg.tabs[0][0], tbl = null, def = null;
    const p = ui.panel({ title: cfg.title, backTo: cfg.backTo, actions: [{ icon: 'plus', title: 'Adicionar', id: 'add' }] });
    p.body.innerHTML = tabsHTML(cfg.tabs, cur) + '<div class="tab-body"></div>';
    const tb = p.body.querySelector('.tab-body'), addBtn = p.el.querySelector('[data-act=add]');
    function draw() {
      def = cfg.render(cur, draw);
      addBtn.title = def.addTitle; addBtn.setAttribute('aria-label', def.addTitle);
      tb.innerHTML = ''; tbl = def.table(); tb.appendChild(tbl);
    }
    p.body.querySelector('.tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]'); if (!b) return; cur = b.dataset.tab;
      p.body.querySelectorAll('.tab').forEach(t => { const on = t === b; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
      draw();
    });
    tb.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      try { await def.onAction(b.dataset.act, Number(b.dataset.id)); }
      catch (err) { if (err instanceof TP.ValidationError) ui.toast(err.errors._ || Object.values(err.errors)[0], 'err'); else throw err; }
    });
    p.on('add', () => def.onAdd());
    main.appendChild(p.el); draw();
  }

  V.parametricas = function (main) {
    tabbedPage(main, { title: 'Paramétricas', backTo: '#/menu/admin', tabs: [['dep', 'Departamentos'], ['cargo', 'Cargos']],
      render(key, redraw) {
        if (key === 'dep') return {
          addTitle: 'Adicionar departamento',
          table: () => ui.table({ rows: db.Departamentos.list(), empty: 'Nenhum departamento cadastrado.', columns: [
            { label: 'Código', render: r => r.id_departamento }, { label: 'Departamento', render: r => esc(r.nome_departamento) },
            { label: 'Orçamento anual', render: r => U.brl(r.orcamento_anual) }, { label: 'Folha anual', render: r => U.brl(r.folha_anual) +
              ' <small>(' + (r.orcamento_anual ? Math.round(r.folha_anual / r.orcamento_anual * 100) : 0) + '%)</small>' },
            { label: 'Colaboradores', render: r => r.qtd_colaboradores }, { label: 'Cargos', render: r => r.qtd_cargos },
            { label: 'Ação', cls: 'actions', render: r => rowActions(r.id_departamento, r.nome_departamento) }] }),
          onAdd: () => depForm(null, redraw),
          async onAction(act, id) {
            const d = db.Departamentos.get(id);
            if (act === 'edit') depForm(d, redraw);
            else if (await ui.confirm({ title: 'Excluir departamento', message: 'Excluir <strong>' + esc(d.nome_departamento) + '</strong>?', confirmLabel: 'Excluir' })) { db.Departamentos.remove(id); ui.toast('Departamento excluído.'); redraw(); }
          } };
        return {
          addTitle: 'Adicionar cargo',
          table: () => ui.table({ rows: db.Cargos.list(), empty: 'Nenhum cargo cadastrado.', columns: [
            { label: 'Código', render: r => r.id_cargo }, { label: 'Cargo', render: r => esc(r.titulo_cargo) }, { label: 'Departamento', render: r => esc(r.nome_departamento) },
            { label: 'Piso', render: r => U.brl(r.salario_base_min) }, { label: 'Teto', render: r => U.brl(r.salario_base_max) }, { label: 'Ocupantes', render: r => r.ocupantes },
            { label: 'Ação', cls: 'actions', render: r => rowActions(r.id_cargo, r.titulo_cargo) }] }),
          onAdd: () => cargoForm(null, redraw),
          async onAction(act, id) {
            const c = db.Cargos.get(id);
            if (act === 'edit') cargoForm(c, redraw);
            else if (await ui.confirm({ title: 'Excluir cargo', message: 'Excluir <strong>' + esc(c.titulo_cargo) + '</strong>?', confirmLabel: 'Excluir' })) { db.Cargos.remove(id); ui.toast('Cargo excluído.'); redraw(); }
          } };
      } });
  };
  function depForm(d, done) {
    ui.modal({ title: d ? 'Editar departamento' : 'Adicionar departamento', saveLabel: 'Guardar',
      body: ui.field({ name: 'nome_departamento', label: 'Nome do departamento', required: true, maxlength: 100, value: d ? d.nome_departamento : '' }) +
        ui.field({ name: 'orcamento_anual', label: 'Orçamento anual (R$)', required: true, attrs: 'inputmode="decimal"', placeholder: '0,00', value: d ? num(d.orcamento_anual) : '' }),
      onSubmit(v) { d ? db.Departamentos.update(d.id_departamento, v) : db.Departamentos.create(v); ui.toast('Departamento salvo.'); done(); return true; } });
  }
  function cargoForm(c, done) {
    ui.modal({ title: c ? 'Editar cargo' : 'Adicionar cargo', saveLabel: 'Guardar',
      body: ui.field({ name: 'id_departamento', label: 'Departamento', required: true, options: deptOpts(), value: c ? c.id_departamento : '' }) +
        ui.field({ name: 'titulo_cargo', label: 'Título do cargo', required: true, maxlength: 100, value: c ? c.titulo_cargo : '' }) +
        '<div class="grid2">' + ui.field({ name: 'salario_base_min', label: 'Piso salarial (R$)', required: true, attrs: 'inputmode="decimal"', value: c ? num(c.salario_base_min) : '' }) +
        ui.field({ name: 'salario_base_max', label: 'Teto salarial (R$)', required: true, attrs: 'inputmode="decimal"', value: c ? num(c.salario_base_max) : '' }) + '</div>',
      onSubmit(v) { c ? db.Cargos.update(c.id_cargo, v) : db.Cargos.create(v); ui.toast('Cargo salvo.'); done(); return true; } });
  }

  /* ---------------------------------------------------------------- */
  /* Treinamentos                                                      */
  /* ---------------------------------------------------------------- */
  V.treinamentos = function (main) {
    tabbedPage(main, { title: 'Treinamentos', backTo: '#/menu/admin', tabs: [['mat', 'Matrículas'], ['cur', 'Cursos']],
      render(key, redraw) {
        if (key === 'cur') return {
          addTitle: 'Adicionar curso',
          table: () => ui.table({ rows: db.Treinamentos.list(), empty: 'Nenhum curso cadastrado.', columns: [
            { label: 'Código', render: r => r.id_treinamento }, { label: 'Curso', render: r => esc(r.nome_curso) },
            { label: 'Carga horária', render: r => r.carga_horaria + ' h' }, { label: 'Validade', render: r => r.validade_meses ? r.validade_meses + ' meses' : 'Não expira' },
            { label: 'Matrículas', render: r => r.matriculas }, { label: 'Ação', cls: 'actions', render: r => rowActions(r.id_treinamento, r.nome_curso) }] }),
          onAdd: () => cursoForm(null, redraw),
          async onAction(act, id) {
            const t = db.Treinamentos.get(id);
            if (act === 'edit') cursoForm(t, redraw);
            else if (await ui.confirm({ title: 'Excluir curso', message: 'Excluir <strong>' + esc(t.nome_curso) + '</strong>?', confirmLabel: 'Excluir' })) { db.Treinamentos.remove(id); ui.toast('Curso excluído.'); redraw(); }
          } };
        return {
          addTitle: 'Nova matrícula',
          table: () => ui.table({ rows: db.Matriculas.list(), empty: 'Nenhuma matrícula registrada.', columns: [
            { label: 'Código', render: r => r.id_matricula }, { label: 'Colaborador', render: r => esc(r.nome) }, { label: 'Curso', render: r => esc(r.nome_curso) },
            { label: 'Situação', render: r => esc(r.status_conclusao) }, { label: 'Conclusão', render: r => U.fmtDate(r.data_conclusao) },
            { label: 'Validade', render: r => r.validade ? validBadge(r.validade) + (r.data_validade ? ' <small>' + U.fmtDate(r.data_validade) + '</small>' : '') : '—' },
            { label: 'Ação', cls: 'actions', render: r => rowActions(r.id_matricula, 'matrícula ' + r.id_matricula) }] }),
          onAdd: () => matriculaForm(null, redraw),
          async onAction(act, id) {
            const m = db.Matriculas.get(id);
            if (act === 'edit') matriculaForm(m, redraw);
            else if (await ui.confirm({ title: 'Excluir matrícula', message: 'Excluir a matrícula ' + id + '?', confirmLabel: 'Excluir' })) { db.Matriculas.remove(id); ui.toast('Matrícula excluída.'); redraw(); }
          } };
      } });
  };
  function cursoForm(t, done) {
    ui.modal({ title: t ? 'Editar curso' : 'Adicionar curso', saveLabel: 'Guardar',
      body: ui.field({ name: 'nome_curso', label: 'Nome do curso', required: true, maxlength: 150, value: t ? t.nome_curso : '' }) +
        '<div class="grid2">' + ui.field({ name: 'carga_horaria', label: 'Carga horária (h)', required: true, attrs: 'inputmode="numeric"', value: t ? t.carga_horaria : '' }) +
        ui.field({ name: 'validade_meses', label: 'Validade (meses)', attrs: 'inputmode="numeric"', placeholder: 'Em branco = não expira', value: t && t.validade_meses ? t.validade_meses : '' }) + '</div>',
      onSubmit(v) { t ? db.Treinamentos.update(t.id_treinamento, v) : db.Treinamentos.create(v); ui.toast('Curso salvo.'); done(); return true; } });
  }
  function matriculaForm(m, done) {
    const colabs = db.Colaboradores.list().filter(c => c.status !== 'Desligado' || (m && c.id_colaborador === m.id_colaborador))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(c => [c.id_colaborador, c.nome + ' (' + c.cpf + ')']);
    ui.modal({ title: m ? 'Editar matrícula' : 'Nova matrícula', saveLabel: 'Guardar',
      body: ui.field({ name: 'id_colaborador', label: 'Colaborador', required: true, options: colabs, value: m ? m.id_colaborador : '' }) +
        ui.field({ name: 'id_treinamento', label: 'Curso', required: true, options: db.Treinamentos.list().map(t => [t.id_treinamento, t.nome_curso]), value: m ? m.id_treinamento : '' }) +
        '<div class="grid2">' + ui.field({ name: 'status_conclusao', label: 'Situação', required: true, noBlank: true, options: db.consts.STATUS_MATRICULA.map(s => [s, s]), value: m ? m.status_conclusao : 'Em Andamento' }) +
        ui.field({ name: 'data_conclusao', label: 'Data de conclusão', type: 'date', value: m && m.data_conclusao ? m.data_conclusao : '', attrs: 'max="' + U.todayISO() + '"', hint: 'Obrigatória quando “Concluído”.' }) + '</div>' +
        '<div class="info" data-val hidden></div>',
      onOpen(form) {
        const upd = () => {
          const box = form.querySelector('[data-val]'), t = db.Treinamentos.get(form.id_treinamento.value);
          const ok = form.status_conclusao.value === 'Concluído' && U.isISODate(form.data_conclusao.value) && t;
          box.hidden = !ok; if (!ok) return;
          box.textContent = t.validade_meses ? 'O certificado vencerá em ' + U.fmtDate(U.addMonths(form.data_conclusao.value, t.validade_meses)) + '.' : 'Este curso não possui validade.';
        };
        ['id_treinamento', 'status_conclusao', 'data_conclusao'].forEach(n => form[n].addEventListener('change', upd)); upd();
      },
      onSubmit(v) { m ? db.Matriculas.update(m.id_matricula, v) : db.Matriculas.create(v); ui.toast('Matrícula salva.'); done(); return true; } });
  }

  /* ---------------------------------------------------------------- */
  /* Relatórios                                                        */
  /* ---------------------------------------------------------------- */
  const pct = n => (n * 100).toFixed(1).replace('.', ',') + '%';
  const REPORTS = {
    quadro: { label: 'Quadro por departamento', data: () => db.Relatorios.headcount(),
      cols: [['Departamento', r => r.departamento], ['Cargos', r => r.cargos], ['Colaboradores ativos', r => r.colaboradores],
        ['Folha anual', r => U.brl(r.folha_anual)], ['Orçamento anual', r => U.brl(r.orcamento_anual)], ['Uso do orçamento', r => pct(r.uso)]] },
    salarial: { label: 'Histórico salarial', data: () => db.Relatorios.historicoSalarial(),
      cols: [['Data', r => U.fmtDate(r.data_alteracao)], ['Colaborador', r => r.nome], ['Salário anterior', r => r.salario_anterior ? U.brl(r.salario_anterior) : '—'],
        ['Novo salário', r => U.brl(r.novo_salario)], ['Variação', r => r.variacao === null ? '—' : pct(r.variacao)], ['Motivo', r => r.motivo]] },
    certificados: { label: 'Validade de certificados', data: () => db.Relatorios.certificados(),
      cols: [['Colaborador', r => r.nome], ['Curso', r => r.nome_curso], ['Conclusão', r => U.fmtDate(r.data_conclusao)], ['Validade', r => U.fmtDate(r.data_validade)], ['Situação', r => r.validade.rotulo]] }
  };
  V.relatorios = function (main) {
    const p = ui.panel({ title: 'Relatórios', backTo: '#/menu' });
    p.body.innerHTML = '<div class="report-bar">' + ui.field({ name: 'rel', label: 'Relatório', noBlank: true, options: Object.keys(REPORTS).map(k => [k, REPORTS[k].label]), cls: 'grow' }) +
      '<button type="button" class="btn btn-primary" data-csv>' + ui.ICONS.download + ' Exportar CSV</button>' +
      '<button type="button" class="btn btn-primary" data-print>' + ui.ICONS.print + ' Imprimir</button></div><div id="rep"></div>';
    main.appendChild(p.el);
    const sel = p.body.querySelector('select'), box = p.body.querySelector('#rep');
    let cur = null;
    const draw = () => {
      cur = REPORTS[sel.value]; const rows = cur.data();
      box.innerHTML = ''; box.appendChild(ui.table({ rows, perPage: 10, empty: 'Sem dados para este relatório.',
        columns: cur.cols.map(c => ({ label: c[0], render: r => esc(c[1](r)) })) }));
    };
    sel.addEventListener('change', draw);
    p.body.querySelector('[data-csv]').addEventListener('click', () => {
      ui.csv('talentpulse-' + sel.value + '-' + U.todayISO() + '.csv', cur.cols.map(c => c[0]), cur.data().map(r => cur.cols.map(c => c[1](r))));
    });
    p.body.querySelector('[data-print]').addEventListener('click', () => window.print());
    draw();
  };
})(window.TP);
