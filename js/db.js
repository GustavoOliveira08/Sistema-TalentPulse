/* TalentPulse – camada de dados + regras de negócio
 * Sem banco por enquanto: tudo é persistido no localStorage do navegador.
 * Todas as telas falam SOMENTE com TP.db / TP.auth. Para ligar o MySQL depois,
 * basta reimplementar estas funções chamando uma API (fetch) – as telas não mudam.
 * O modelo segue as 10 tabelas da documentação (+ usuarios e historico_cargos). */
(function (TP) {
  'use strict';
  const U = TP.util;
  const KEY = 'talentpulse_db_v1';
  const SESSION_KEY = 'tp_session';
  const LOCK_KEY = 'tp_lock';

  class ValidationError extends Error {
    constructor(errors, msg) { super(msg || 'Dados inválidos'); this.errors = errors; }
  }
  TP.ValidationError = ValidationError;

  const STATUS_COLAB = ['Ativo', 'Desligado', 'Em Licença'];
  const STATUS_MATRICULA = ['Em Andamento', 'Concluído', 'Reprovado'];
  const MOTIVOS = ['Promoção', 'Dissídio', 'Mérito', 'Transferência'];
  const MOTIVOS_REAJUSTE = ['Promoção', 'Dissídio', 'Mérito'];
  const MAX_ORCAMENTO = 9999999999.99;   // DECIMAL(12,2)
  const MAX_SALARIO = 99999999.99;       // DECIMAL(10,2)

  let state = null;

  /* ------------------------------------------------------------------ */
  /* Persistência                                                        */
  /* ------------------------------------------------------------------ */
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* só memória */ } }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); if (state && state.t) return; }
    } catch (e) { /* ignora */ }
    state = seed(); persist();
  }
  const T = name => state.t[name];
  const nextId = name => (state.seq[name] = (state.seq[name] || 0) + 1);
  function insert(name, row) { row['id_' + idName(name)] = nextId(name); T(name).push(row); return row; }
  const idName = n => ({ departamentos: 'departamento', cargos: 'cargo', colaboradores: 'colaborador',
    historico_salarial: 'historico', treinamentos: 'treinamento', matriculas: 'matricula',
    candidatos: 'candidato', historico_cargos: 'hcargo', usuarios: 'usuario' }[n]);
  const pk = (name, id) => 'id_' + idName(name) === id;
  function find(name, id) { const k = 'id_' + idName(name); return T(name).find(r => r[k] === Number(id)) || null; }

  /* ------------------------------------------------------------------ */
  /* Dados de exemplo                                                    */
  /* ------------------------------------------------------------------ */
  function seed() {
    state = { v: 1, seq: {}, t: { departamentos: [], cargos: [], colaboradores: [], historico_salarial: [],
      historico_cargos: [], treinamentos: [], matriculas: [], candidatos: [], usuarios: [] } };
    const today = U.todayISO();

    [['Tecnologia da Informação', 1800000], ['Recursos Humanos', 600000], ['Financeiro', 900000],
      ['Operações', 2400000], ['Jurídico', 700000]]
      .forEach(([n, o]) => insert('departamentos', { nome_departamento: n, orcamento_anual: o }));

    [[1, 'Analista de Sistemas Pleno', 6000, 11000], [1, 'Desenvolvedor Sênior', 9000, 16000],
      [1, 'Gerente de TI', 15000, 28000], [2, 'Analista de RH', 4000, 8000], [2, 'Coordenador de RH', 9000, 16000],
      [3, 'Analista Financeiro', 5000, 10000], [4, 'Técnico de Operações', 3000, 6000],
      [4, 'Supervisor de Operações', 6500, 11000], [5, 'Advogado', 7000, 15000], [5, 'Assistente Jurídico', 3500, 6500]]
      .forEach(([d, t, mi, ma]) => insert('cargos', { id_departamento: d, titulo_cargo: t, salario_base_min: mi, salario_base_max: ma }));

    // [nome, cpfBase, cargo, salário, admissão, status]
    const pessoas = [
      ['Mariana Costa Ribeiro', 111444777, 5, 11500, '2018-02-05', 'Ativo'],
      ['Carlos Eduardo Lima', 222555888, 2, 12000, '2020-08-17', 'Ativo'],
      ['Juliana Alves Pereira', 333666999, 4, 5200, '2021-04-12', 'Ativo'],
      ['Rafael Henrique Santos', 444777123, 3, 19500, '2017-06-19', 'Ativo'],
      ['Fernanda Oliveira Gomes', 555888234, 6, 7400, '2019-10-07', 'Ativo'],
      ['Lucas Martins Barbosa', 666999345, 7, 3800, '2022-01-24', 'Ativo'],
      ['Patrícia Rocha Mendes', 777123456, 8, 8800, '2016-09-12', 'Ativo'],
      ['Bruno Teixeira Araújo', 888234567, 9, 10500, '2020-02-03', 'Em Licença'],
      ['Camila Duarte Nunes', 999345678, 10, 4300, '2023-05-15', 'Ativo'],
      ['Thiago Nascimento Freitas', 123987456, 7, 3600, '2015-11-30', 'Desligado']];
    const slug = s => U.norm(s).replace(/[^a-z ]/g, '').split(' ');
    pessoas.forEach(([nome, base, cargo, sal, adm, status]) => {
      const p = slug(nome);
      const c = insert('colaboradores', { id_cargo: cargo, nome, cpf: U.makeCPF(base),
        email_corporativo: p[0] + '.' + p[p.length - 1] + '@talentpulse.com.br', data_admissao: adm, status });
      insert('historico_salarial', { id_colaborador: c.id_colaborador, salario_anterior: 0, novo_salario: sal, motivo: 'Admissão', data_alteracao: adm });
      insert('historico_cargos', { id_colaborador: c.id_colaborador, id_cargo: cargo, data_inicio: adm, data_fim: null });
    });
    // Carlos: promovido de Analista Pleno (8.000) para Desenvolvedor Sênior (12.000)
    const carlos = T('colaboradores')[1];
    const hc = T('historico_cargos').find(h => h.id_colaborador === carlos.id_colaborador);
    hc.id_cargo = 1; hc.data_fim = '2022-08-31';
    const hs = T('historico_salarial').find(h => h.id_colaborador === carlos.id_colaborador);
    hs.novo_salario = 8000;
    insert('historico_salarial', { id_colaborador: carlos.id_colaborador, salario_anterior: 8000, novo_salario: 12000, motivo: 'Promoção', data_alteracao: '2022-09-01' });
    insert('historico_cargos', { id_colaborador: carlos.id_colaborador, id_cargo: 2, data_inicio: '2022-09-01', data_fim: null });
    // Fernanda: mérito
    const fer = T('colaboradores')[4];
    T('historico_salarial').find(h => h.id_colaborador === fer.id_colaborador).novo_salario = 6800;
    insert('historico_salarial', { id_colaborador: fer.id_colaborador, salario_anterior: 6800, novo_salario: 7400, motivo: 'Mérito', data_alteracao: '2023-03-01' });

    [['NR-10 Segurança em Instalações Elétricas', 40, 24], ['NR-35 Trabalho em Altura', 8, 24],
      ['LGPD e Compliance', 4, 12], ['Primeiros Socorros', 16, 12], ['Liderança e Gestão de Equipes', 20, null]]
      .forEach(([n, h, v]) => insert('treinamentos', { nome_curso: n, carga_horaria: h, validade_meses: v }));

    const mat = (colab, trein, status, mesesAtras) => {
      const t = find('treinamentos', trein);
      let dc = null, dv = null;
      if (status === 'Concluído') {
        dc = U.addMonths(today, -mesesAtras);
        dv = t.validade_meses ? U.addMonths(dc, t.validade_meses) : null;
      }
      insert('matriculas', { id_colaborador: colab, id_treinamento: trein, data_conclusao: dc, data_validade: dv, status_conclusao: status });
    };
    mat(6, 1, 'Concluído', 23); mat(6, 2, 'Concluído', 6); mat(7, 2, 'Concluído', 30);
    mat(2, 3, 'Concluído', 3); mat(3, 3, 'Concluído', 13); mat(9, 3, 'Em Andamento', 0);
    mat(1, 5, 'Concluído', 10); mat(4, 5, 'Reprovado', 0); mat(6, 4, 'Em Andamento', 0);

    [['Renata Farias Lacerda', 135792468, 'renata.lacerda@email.com', '(11) 98888-1111'],
      ['Diego Carvalho Pinto', 246813579, 'diego.pinto@email.com', '(21) 97777-2222'],
      ['Larissa Menezes Cunha', 369258147, 'larissa.cunha@email.com', '']]
      .forEach(([n, b, e, t]) => insert('candidatos', { nome: n, cpf: U.makeCPF(b), email: e, telefone: t }));

    insert('usuarios', mkUser('admin', 'Admin@123', 'admin', 1, 'Administrador'));
    insert('usuarios', mkUser('colaborador', 'Colab@123', 'colaborador', 2, 'Colaborador'));
    return state;
  }
  function mkUser(usuario, senha, perfil, idColab, nome) {
    const salt = Math.random().toString(36).slice(2, 12);
    return { usuario, salt, hash: U.sha256(salt + senha), perfil, nome, id_colaborador: idColab };
  }

  /* ------------------------------------------------------------------ */
  /* Consultas                                                           */
  /* ------------------------------------------------------------------ */
  const sortBy = (arr, fn) => arr.slice().sort((a, b) => String(fn(a)).localeCompare(String(fn(b)), 'pt-BR'));

  function salarioAtual(idColab) {
    const h = T('historico_salarial').filter(x => x.id_colaborador === idColab)
      .sort((a, b) => a.data_alteracao.localeCompare(b.data_alteracao) || a.id_historico - b.id_historico);
    return h.length ? h[h.length - 1].novo_salario : 0;
  }
  function cargoAtualReg(idColab) {
    return T('historico_cargos').find(h => h.id_colaborador === idColab && !h.data_fim) || null;
  }
  function enrichColab(c) {
    const cargo = find('cargos', c.id_cargo);
    const dep = cargo ? find('departamentos', cargo.id_departamento) : null;
    const reg = cargoAtualReg(c.id_colaborador);
    return Object.assign({}, c, {
      titulo_cargo: cargo ? cargo.titulo_cargo : '—', id_departamento: dep ? dep.id_departamento : null,
      nome_departamento: dep ? dep.nome_departamento : '—', salario: salarioAtual(c.id_colaborador),
      salario_min: cargo ? cargo.salario_base_min : 0, salario_max: cargo ? cargo.salario_base_max : 0,
      inicio_cargo: reg ? reg.data_inicio : c.data_admissao
    });
  }
  /** Folha anual (salário × 12) dos colaboradores não desligados de um departamento. */
  function folhaAnual(idDep, excluirColab) {
    let total = 0;
    T('colaboradores').forEach(c => {
      if (c.status === 'Desligado' || c.id_colaborador === excluirColab) return;
      const cargo = find('cargos', c.id_cargo);
      if (cargo && cargo.id_departamento === idDep) total += salarioAtual(c.id_colaborador) * 12;
    });
    return U.round2(total);
  }
  function checarOrcamento(idDep, salarioMensal, excluirColab, errors, campo) {
    const dep = find('departamentos', idDep);
    const novo = folhaAnual(idDep, excluirColab) + salarioMensal * 12;
    if (novo > dep.orcamento_anual + 0.001) {
      errors[campo] = 'Estoura o orçamento anual do departamento ' + dep.nome_departamento + ' (' + U.brl(dep.orcamento_anual) +
        '). Folha com este valor: ' + U.brl(novo) + '.';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Validadores                                                         */
  /* ------------------------------------------------------------------ */
  function parseNum(v) {
    if (typeof v === 'number') return v;
    const s = String(v ?? '').trim().replace(/\s/g, '');
    if (!s) return NaN;
    const t = /,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s;
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  }
  function validarSalario(v, cargo, errors, campo) {
    const n = parseNum(v);
    if (isNaN(n)) { errors[campo] = 'Informe o salário (apenas números).'; return null; }
    if (n <= 0) { errors[campo] = 'O salário deve ser maior que zero.'; return null; }
    if (Math.round(n * 100) !== n * 100 && Math.abs(Math.round(n * 100) / 100 - n) > 1e-9) { errors[campo] = 'Use no máximo 2 casas decimais.'; return null; }
    if (n > MAX_SALARIO) { errors[campo] = 'Valor acima do limite permitido.'; return null; }
    if (cargo && (n < cargo.salario_base_min || n > cargo.salario_base_max)) {
      errors[campo] = 'Fora da faixa do cargo (' + U.brl(cargo.salario_base_min) + ' a ' + U.brl(cargo.salario_base_max) + ').';
      return null;
    }
    return U.round2(n);
  }
  function validarData(v, campo, errors, { min, max, obrigatoria = true, rotulo = 'Data' } = {}) {
    if (!v) { if (obrigatoria) errors[campo] = rotulo + ' é obrigatória.'; return null; }
    if (!U.isISODate(v)) { errors[campo] = rotulo + ' inválida.'; return null; }
    if (min && v < min) { errors[campo] = rotulo + ' não pode ser anterior a ' + U.fmtDate(min) + '.'; return null; }
    if (max && v > max) { errors[campo] = rotulo + ' não pode ser posterior a ' + U.fmtDate(max) + '.'; return null; }
    return v;
  }
  const throwIf = errors => { if (Object.keys(errors).length) throw new ValidationError(errors); };

  /* ------------------------------------------------------------------ */
  /* Departamentos                                                       */
  /* ------------------------------------------------------------------ */
  function validarDepartamento(d, id) {
    const errors = {};
    const nome = U.cleanName(d.nome_departamento);
    if (nome.length < 3 || nome.length > 100) errors.nome_departamento = 'Informe o nome (3 a 100 caracteres).';
    else if (T('departamentos').some(x => x.id_departamento !== id && U.norm(x.nome_departamento) === U.norm(nome)))
      errors.nome_departamento = 'Já existe um departamento com este nome.';
    const orc = parseNum(d.orcamento_anual);
    if (isNaN(orc) || orc <= 0) errors.orcamento_anual = 'Informe um orçamento maior que zero.';
    else if (orc > MAX_ORCAMENTO) errors.orcamento_anual = 'Valor acima do limite permitido.';
    else if (id && U.round2(orc) < folhaAnual(id)) errors.orcamento_anual = 'Menor que a folha anual atual do departamento (' + U.brl(folhaAnual(id)) + ').';
    throwIf(errors);
    return { nome_departamento: nome, orcamento_anual: U.round2(orc) };
  }
  const Departamentos = {
    list: () => sortBy(T('departamentos'), d => d.nome_departamento).map(d => Object.assign({}, d, {
      folha_anual: folhaAnual(d.id_departamento),
      qtd_colaboradores: T('colaboradores').filter(c => c.status !== 'Desligado' && (find('cargos', c.id_cargo) || {}).id_departamento === d.id_departamento).length,
      qtd_cargos: T('cargos').filter(c => c.id_departamento === d.id_departamento).length })),
    get: id => find('departamentos', id),
    create(d) { const v = validarDepartamento(d, null); const r = insert('departamentos', v); persist(); return r; },
    update(id, d) { const v = validarDepartamento(d, Number(id)); Object.assign(find('departamentos', id), v); persist(); },
    remove(id) {
      id = Number(id);
      if (T('cargos').some(c => c.id_departamento === id)) throw new ValidationError({ _: 'Não é possível excluir: existem cargos vinculados a este departamento.' });
      state.t.departamentos = T('departamentos').filter(d => d.id_departamento !== id); persist();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Cargos                                                              */
  /* ------------------------------------------------------------------ */
  function validarCargo(c, id) {
    const errors = {};
    const dep = find('departamentos', c.id_departamento);
    if (!dep) errors.id_departamento = 'Selecione o departamento.';
    const titulo = U.cleanName(c.titulo_cargo);
    if (titulo.length < 3 || titulo.length > 100) errors.titulo_cargo = 'Informe o título (3 a 100 caracteres).';
    else if (dep && T('cargos').some(x => x.id_cargo !== id && x.id_departamento === dep.id_departamento && U.norm(x.titulo_cargo) === U.norm(titulo)))
      errors.titulo_cargo = 'Já existe este cargo neste departamento.';
    const mi = parseNum(c.salario_base_min), ma = parseNum(c.salario_base_max);
    if (isNaN(mi) || mi <= 0) errors.salario_base_min = 'Informe o piso salarial (maior que zero).';
    else if (mi > MAX_SALARIO) errors.salario_base_min = 'Valor acima do limite permitido.';
    if (isNaN(ma) || ma <= 0) errors.salario_base_max = 'Informe o teto salarial (maior que zero).';
    else if (ma > MAX_SALARIO) errors.salario_base_max = 'Valor acima do limite permitido.';
    else if (!isNaN(mi) && ma < mi) errors.salario_base_max = 'O teto não pode ser menor que o piso.';
    if (!Object.keys(errors).length && id) {
      const fora = T('colaboradores').filter(x => x.id_cargo === id && x.status !== 'Desligado')
        .filter(x => { const s = salarioAtual(x.id_colaborador); return s < mi || s > ma; });
      if (fora.length) errors.salario_base_min = 'Nova faixa deixaria ' + fora.length + ' colaborador(es) com salário fora dela (ex.: ' + fora[0].nome + ').';
      if (dep && c.id_departamento !== undefined && T('colaboradores').some(x => x.id_cargo === id) && dep.id_departamento !== find('cargos', id).id_departamento)
        errors.id_departamento = 'Não é possível mudar o departamento de um cargo que já tem colaboradores.';
    }
    throwIf(errors);
    return { id_departamento: dep.id_departamento, titulo_cargo: titulo, salario_base_min: U.round2(mi), salario_base_max: U.round2(ma) };
  }
  const Cargos = {
    list: (idDep) => sortBy(T('cargos').filter(c => !idDep || c.id_departamento === Number(idDep)), c => c.titulo_cargo).map(c => Object.assign({}, c, {
      nome_departamento: (find('departamentos', c.id_departamento) || {}).nome_departamento,
      ocupantes: T('colaboradores').filter(x => x.id_cargo === c.id_cargo && x.status !== 'Desligado').length })),
    get: id => find('cargos', id),
    create(c) { const v = validarCargo(Object.assign({}, c, { id_departamento: Number(c.id_departamento) }), null); const r = insert('cargos', v); persist(); return r; },
    update(id, c) { id = Number(id); const v = validarCargo(Object.assign({}, c, { id_departamento: Number(c.id_departamento) }), id); Object.assign(find('cargos', id), v); persist(); },
    remove(id) {
      id = Number(id);
      if (T('colaboradores').some(c => c.id_cargo === id) || T('historico_cargos').some(h => h.id_cargo === id))
        throw new ValidationError({ _: 'Não é possível excluir: o cargo está (ou já esteve) vinculado a colaboradores.' });
      state.t.cargos = T('cargos').filter(c => c.id_cargo !== id); persist();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Colaboradores                                                       */
  /* ------------------------------------------------------------------ */
  function validarCPFCampo(cpf, errors, campo, ignorarId) {
    if (!U.digits(cpf)) { errors[campo] = 'Informe o CPF.'; return null; }
    if (!U.isValidCPF(cpf)) { errors[campo] = 'CPF inválido (verifique os dígitos).'; return null; }
    const f = U.formatCPF(cpf);
    const dup = T('colaboradores').find(c => c.cpf === f && c.id_colaborador !== ignorarId);
    if (dup) { errors[campo] = 'Este CPF já está cadastrado para ' + dup.nome + '.'; return null; }
    return f;
  }
  function validarColabBasico(d, id, errors) {
    const nome = U.cleanName(d.nome);
    if (!nome) errors.nome = 'Informe o nome completo.';
    else if (nome.length < 5 || nome.length > 150) errors.nome = 'O nome deve ter entre 5 e 150 caracteres.';
    else if (!U.isPersonName(nome)) errors.nome = 'Informe nome e sobrenome, apenas com letras.';
    const email = String(d.email_corporativo || '').trim().toLowerCase();
    if (!email) errors.email_corporativo = 'Informe o e-mail corporativo.';
    else if (!U.isEmail(email)) errors.email_corporativo = 'E-mail inválido.';
    else if (T('colaboradores').some(c => c.id_colaborador !== id && c.email_corporativo === email)) errors.email_corporativo = 'Este e-mail já está em uso.';
    return { nome, email };
  }
  const Colaboradores = {
    list: () => T('colaboradores').map(enrichColab),
    get: id => { const c = find('colaboradores', id); return c ? enrichColab(c) : null; },
    /** Busca no banco de talentos (Candidatos) para pré-preencher o cadastro. */
    buscarPorCPF(cpf) {
      const errors = {};
      const f = validarCPFCampo(cpf, errors, 'cpf');
      throwIf(errors);
      const cand = T('candidatos').find(c => c.cpf === f) || null;
      return { cpf: f, candidato: cand ? Object.assign({}, cand) : null };
    },
    create(d) {
      const errors = {};
      const cpf = validarCPFCampo(d.cpf, errors, 'cpf');
      const { nome, email } = validarColabBasico(d, null, errors);
      const cargo = find('cargos', d.id_cargo);
      if (!find('departamentos', d.id_departamento)) errors.id_departamento = 'Selecione o departamento.';
      else if (!cargo || cargo.id_departamento !== Number(d.id_departamento)) errors.id_cargo = 'Selecione um cargo do departamento.';
      const adm = validarData(d.data_admissao, 'data_admissao', errors, { min: '1960-01-01', max: U.todayISO(), rotulo: 'Data de admissão' });
      const sal = validarSalario(d.salario, cargo && cargo.id_departamento === Number(d.id_departamento) ? cargo : null, errors, 'salario');
      if (sal !== null && !errors.id_cargo && !errors.id_departamento) checarOrcamento(cargo.id_departamento, sal, null, errors, 'salario');
      throwIf(errors);
      const c = insert('colaboradores', { id_cargo: cargo.id_cargo, nome, cpf, email_corporativo: email, data_admissao: adm, status: 'Ativo' });
      insert('historico_salarial', { id_colaborador: c.id_colaborador, salario_anterior: 0, novo_salario: sal, motivo: 'Admissão', data_alteracao: adm });
      insert('historico_cargos', { id_colaborador: c.id_colaborador, id_cargo: cargo.id_cargo, data_inicio: adm, data_fim: null });
      persist(); return c;
    },
    update(id, d) {
      id = Number(id);
      const c = find('colaboradores', id); const errors = {};
      const { nome, email } = validarColabBasico(d, id, errors);
      if (!STATUS_COLAB.includes(d.status)) errors.status = 'Situação inválida.';
      else if (d.status !== c.status) checarMudancaStatus(c, d.status, errors, 'status');
      throwIf(errors);
      Object.assign(c, { nome, email_corporativo: email, status: d.status }); persist();
    },
    setStatus(id, status) {
      const c = find('colaboradores', id); const errors = {};
      checarMudancaStatus(c, status, errors, '_');
      if (status === 'Ativo' && c.status === 'Desligado') {
        const e2 = {}; checarOrcamento(enrichColab(c).id_departamento, salarioAtual(c.id_colaborador), c.id_colaborador, e2, '_');
        if (e2._) errors._ = 'Não é possível reativar. ' + e2._;
      }
      throwIf(errors); c.status = status; persist();
    },
    remove(id) {
      id = Number(id); const c = find('colaboradores', id);
      const cur = TP.auth.current();
      if (cur && cur.id_colaborador === id) throw new ValidationError({ _: 'Você não pode excluir o colaborador vinculado ao seu próprio usuário.' });
      const hs = T('historico_salarial').filter(h => h.id_colaborador === id);
      if (hs.length > 1 || T('historico_cargos').filter(h => h.id_colaborador === id).length > 1)
        throw new ValidationError({ _: 'Este colaborador possui histórico de movimentações, que é imutável. Use o botão de situação para desligá-lo.' });
      if (T('matriculas').some(m => m.id_colaborador === id))
        throw new ValidationError({ _: 'Este colaborador possui matrículas em treinamentos. Use o botão de situação para desligá-lo.' });
      if (T('usuarios').some(u => u.id_colaborador === id))
        throw new ValidationError({ _: 'Existe um usuário de acesso vinculado a este colaborador.' });
      state.t.historico_salarial = T('historico_salarial').filter(h => h.id_colaborador !== id);
      state.t.historico_cargos = T('historico_cargos').filter(h => h.id_colaborador !== id);
      state.t.colaboradores = T('colaboradores').filter(x => x.id_colaborador !== id);
      persist(); return c;
    },
    historicoSalarial: id => T('historico_salarial').filter(h => h.id_colaborador === Number(id))
      .sort((a, b) => b.data_alteracao.localeCompare(a.data_alteracao) || b.id_historico - a.id_historico),
    cargosAnteriores: id => T('historico_cargos').filter(h => h.id_colaborador === Number(id) && h.data_fim)
      .sort((a, b) => b.data_fim.localeCompare(a.data_fim)).map(h => {
        const cg = find('cargos', h.id_cargo);
        return Object.assign({}, h, { titulo_cargo: cg.titulo_cargo, nome_departamento: find('departamentos', cg.id_departamento).nome_departamento });
      }),
    /** Reajuste salarial dentro do mesmo cargo (grava no Historico_Salarial, que é imutável). */
    reajustar(id, d) {
      id = Number(id);
      const c = enrichColab(find('colaboradores', id)); const errors = {};
      if (c.status === 'Desligado') throw new ValidationError({ _: 'Colaborador desligado não pode receber reajuste.' });
      const cargo = find('cargos', c.id_cargo);
      const ult = ultimaMovimentacao(id);
      const data = validarData(d.data_alteracao, 'data_alteracao', errors, { min: ult, max: U.todayISO(), rotulo: 'Data da alteração' });
      if (!MOTIVOS_REAJUSTE.includes(d.motivo)) errors.motivo = 'Selecione o motivo.';
      const sal = validarSalario(d.novo_salario, cargo, errors, 'novo_salario');
      if (sal !== null && sal === c.salario) errors.novo_salario = 'O novo salário é igual ao atual.';
      if (sal !== null && !errors.novo_salario) checarOrcamento(cargo.id_departamento, sal, id, errors, 'novo_salario');
      throwIf(errors);
      insert('historico_salarial', { id_colaborador: id, salario_anterior: c.salario, novo_salario: sal, motivo: d.motivo, data_alteracao: data });
      persist();
    },
    /** Muda o colaborador de cargo (fecha o cargo atual, abre o novo, registra o salário). */
    mudarCargo(id, d) {
      id = Number(id);
      const c = enrichColab(find('colaboradores', id)); const errors = {};
      if (c.status === 'Desligado') throw new ValidationError({ _: 'Colaborador desligado não pode mudar de cargo.' });
      const cargo = find('cargos', d.id_cargo);
      if (!find('departamentos', d.id_departamento)) errors.id_departamento = 'Selecione o departamento.';
      else if (!cargo || cargo.id_departamento !== Number(d.id_departamento)) errors.id_cargo = 'Selecione um cargo do departamento.';
      else if (cargo.id_cargo === c.id_cargo) errors.id_cargo = 'O colaborador já ocupa este cargo. Para alterar apenas o salário, use o reajuste (+).';
      if (!MOTIVOS.includes(d.motivo)) errors.motivo = 'Selecione o motivo do movimento.';
      const ult = ultimaMovimentacao(id);
      const data = validarData(d.data_alteracao, 'data_alteracao', errors, { min: ult, max: U.todayISO(), rotulo: 'Data do movimento' });
      const sal = validarSalario(d.novo_salario, errors.id_cargo || errors.id_departamento ? null : cargo, errors, 'novo_salario');
      if (sal !== null && !errors.id_cargo && !errors.id_departamento) checarOrcamento(cargo.id_departamento, sal, id, errors, 'novo_salario');
      throwIf(errors);
      const atual = cargoAtualReg(id);
      if (atual) atual.data_fim = data;
      find('colaboradores', id).id_cargo = cargo.id_cargo;
      insert('historico_cargos', { id_colaborador: id, id_cargo: cargo.id_cargo, data_inicio: data, data_fim: null });
      insert('historico_salarial', { id_colaborador: id, salario_anterior: c.salario, novo_salario: sal, motivo: d.motivo, data_alteracao: data });
      persist();
    },
    ultimaMovimentacao: id => ultimaMovimentacao(Number(id))
  };
  function checarMudancaStatus(c, novo, errors, campo) {
    const cur = TP.auth.current();
    if (novo !== 'Ativo' && cur && cur.id_colaborador === c.id_colaborador)
      errors[campo] = 'Você não pode alterar a situação do colaborador vinculado ao seu próprio usuário.';
  }
  function ultimaMovimentacao(id) {
    const c = find('colaboradores', id);
    let m = c.data_admissao;
    T('historico_salarial').filter(h => h.id_colaborador === id).forEach(h => { if (h.data_alteracao > m) m = h.data_alteracao; });
    return m;
  }

  /* ------------------------------------------------------------------ */
  /* Treinamentos e matrículas                                           */
  /* ------------------------------------------------------------------ */
  function validarTreinamento(t, id) {
    const errors = {};
    const nome = U.cleanName(t.nome_curso);
    if (nome.length < 3 || nome.length > 150) errors.nome_curso = 'Informe o nome do curso (3 a 150 caracteres).';
    else if (T('treinamentos').some(x => x.id_treinamento !== id && U.norm(x.nome_curso) === U.norm(nome))) errors.nome_curso = 'Já existe um treinamento com este nome.';
    const ch = parseNum(t.carga_horaria);
    if (isNaN(ch) || !Number.isInteger(ch) || ch < 1 || ch > 1000) errors.carga_horaria = 'Informe a carga horária em horas (inteiro de 1 a 1000).';
    let val = null;
    if (String(t.validade_meses ?? '').trim() !== '') {
      const v = parseNum(t.validade_meses);
      if (isNaN(v) || !Number.isInteger(v) || v < 1 || v > 120) errors.validade_meses = 'Use um número inteiro de 1 a 120 meses (ou deixe em branco se não expira).';
      else val = v;
    }
    throwIf(errors);
    return { nome_curso: nome, carga_horaria: ch, validade_meses: val };
  }
  const Treinamentos = {
    list: () => sortBy(T('treinamentos'), t => t.nome_curso).map(t => Object.assign({}, t, { matriculas: T('matriculas').filter(m => m.id_treinamento === t.id_treinamento).length })),
    get: id => find('treinamentos', id),
    create(t) { const r = insert('treinamentos', validarTreinamento(t, null)); persist(); return r; },
    update(id, t) {
      id = Number(id); const v = validarTreinamento(t, id);
      const old = find('treinamentos', id);
      Object.assign(old, v);
      // recalcula validade dos certificados já concluídos
      T('matriculas').filter(m => m.id_treinamento === id && m.status_conclusao === 'Concluído')
        .forEach(m => { m.data_validade = v.validade_meses ? U.addMonths(m.data_conclusao, v.validade_meses) : null; });
      persist();
    },
    remove(id) {
      id = Number(id);
      if (T('matriculas').some(m => m.id_treinamento === id)) throw new ValidationError({ _: 'Não é possível excluir: existem matrículas neste treinamento.' });
      state.t.treinamentos = T('treinamentos').filter(t => t.id_treinamento !== id); persist();
    }
  };
  function validarMatricula(m, id) {
    const errors = {};
    const colab = find('colaboradores', m.id_colaborador);
    const trein = find('treinamentos', m.id_treinamento);
    if (!colab) errors.id_colaborador = 'Selecione o colaborador.';
    else if (colab.status === 'Desligado') errors.id_colaborador = 'Colaborador desligado não pode ser matriculado.';
    if (!trein) errors.id_treinamento = 'Selecione o treinamento.';
    if (!STATUS_MATRICULA.includes(m.status_conclusao)) errors.status_conclusao = 'Selecione a situação.';
    if (colab && trein && !errors.id_colaborador) {
      const dup = T('matriculas').find(x => x.id_matricula !== id && x.id_colaborador === colab.id_colaborador && x.id_treinamento === trein.id_treinamento && x.status_conclusao === 'Em Andamento');
      if (dup && m.status_conclusao === 'Em Andamento') errors.id_treinamento = 'Já existe uma matrícula em andamento deste colaborador neste treinamento.';
    }
    let dc = null, dv = null;
    if (m.status_conclusao === 'Concluído') {
      dc = validarData(m.data_conclusao, 'data_conclusao', errors, { min: colab ? colab.data_admissao : undefined, max: U.todayISO(), rotulo: 'Data de conclusão' });
      if (dc && trein && trein.validade_meses) dv = U.addMonths(dc, trein.validade_meses);
    } else if (m.status_conclusao === 'Reprovado' && m.data_conclusao) {
      dc = validarData(m.data_conclusao, 'data_conclusao', errors, { min: colab ? colab.data_admissao : undefined, max: U.todayISO(), rotulo: 'Data de conclusão' });
    } else if (m.data_conclusao) {
      errors.data_conclusao = 'Matrícula em andamento não tem data de conclusão.';
    }
    throwIf(errors);
    return { id_colaborador: colab.id_colaborador, id_treinamento: trein.id_treinamento, data_conclusao: dc, data_validade: dv, status_conclusao: m.status_conclusao };
  }
  function situacaoValidade(m) {
    if (m.status_conclusao !== 'Concluído') return null;
    if (!m.data_validade) return { chave: 'permanente', rotulo: 'Sem validade', dias: null };
    const dias = U.daysBetween(U.todayISO(), m.data_validade);
    if (dias < 0) return { chave: 'vencido', rotulo: 'Vencido', dias };
    if (dias <= 90) return { chave: 'avencer', rotulo: 'Vence em ' + dias + ' dia(s)', dias };
    return { chave: 'valido', rotulo: 'Válido', dias };
  }
  const Matriculas = {
    list: () => T('matriculas').map(m => {
      const c = find('colaboradores', m.id_colaborador), t = find('treinamentos', m.id_treinamento);
      return Object.assign({}, m, { nome: c ? c.nome : '—', nome_curso: t ? t.nome_curso : '—', validade: situacaoValidade(m) });
    }).sort((a, b) => b.id_matricula - a.id_matricula),
    get: id => find('matriculas', id),
    create(m) { const r = insert('matriculas', validarMatricula(m, null)); persist(); return r; },
    update(id, m) { id = Number(id); Object.assign(find('matriculas', id), validarMatricula(m, id)); persist(); },
    remove(id) { id = Number(id); state.t.matriculas = T('matriculas').filter(m => m.id_matricula !== id); persist(); }
  };

  /* ------------------------------------------------------------------ */
  /* Relatórios                                                          */
  /* ------------------------------------------------------------------ */
  const Relatorios = {
    headcount: () => Departamentos.list().map(d => ({ departamento: d.nome_departamento, cargos: d.qtd_cargos,
      colaboradores: d.qtd_colaboradores, folha_anual: d.folha_anual, orcamento_anual: d.orcamento_anual,
      uso: d.orcamento_anual ? d.folha_anual / d.orcamento_anual : 0 })),
    historicoSalarial: () => T('historico_salarial').map(h => {
      const c = find('colaboradores', h.id_colaborador);
      return Object.assign({}, h, { nome: c ? c.nome : '—', variacao: h.salario_anterior ? (h.novo_salario / h.salario_anterior - 1) : null });
    }).sort((a, b) => b.data_alteracao.localeCompare(a.data_alteracao) || b.id_historico - a.id_historico),
    certificados: () => Matriculas.list().filter(m => m.status_conclusao === 'Concluído' && m.validade)
      .sort((a, b) => (a.validade.dias ?? 1e9) - (b.validade.dias ?? 1e9))
  };

  /* ------------------------------------------------------------------ */
  /* Autenticação                                                        */
  /* ------------------------------------------------------------------ */
  const MAX_TENTATIVAS = 5, BLOQUEIO_MS = 30000;
  function lockInfo() { try { return JSON.parse(localStorage.getItem(LOCK_KEY)) || { n: 0, ate: 0 }; } catch (e) { return { n: 0, ate: 0 }; } }
  function setLock(v) { try { localStorage.setItem(LOCK_KEY, JSON.stringify(v)); } catch (e) { /* ignora */ } }
  const Auth = {
    current() {
      let id = null; try { id = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* ignora */ }
      if (!id) return null;
      const u = T('usuarios').find(x => x.id_usuario === Number(id));
      return u || null;
    },
    login(usuario, senha) {
      const errors = {};
      usuario = String(usuario || '').trim(); senha = String(senha || '');
      if (!usuario) errors.usuario = 'Informe o usuário.';
      if (!senha) errors.senha = 'Informe a senha.';
      throwIf(errors);
      const lk = lockInfo();
      if (lk.ate > Date.now()) throw new ValidationError({ _: 'Muitas tentativas. Aguarde ' + Math.ceil((lk.ate - Date.now()) / 1000) + 's para tentar novamente.' });
      const u = T('usuarios').find(x => x.usuario.toLowerCase() === usuario.toLowerCase());
      if (!u || U.sha256(u.salt + senha) !== u.hash) {
        const n = (lk.ate && lk.ate <= Date.now() ? 0 : lk.n) + 1;
        if (n >= MAX_TENTATIVAS) { setLock({ n: 0, ate: Date.now() + BLOQUEIO_MS }); throw new ValidationError({ _: 'Muitas tentativas. Acesso bloqueado por 30 segundos.' }); }
        setLock({ n, ate: 0 });
        throw new ValidationError({ _: 'Usuário ou senha incorretos. (' + (MAX_TENTATIVAS - n) + ' tentativa(s) restante(s))' });
      }
      const c = find('colaboradores', u.id_colaborador);
      if (c && c.status === 'Desligado') throw new ValidationError({ _: 'Este usuário está inativo (colaborador desligado).' });
      setLock({ n: 0, ate: 0 });
      try { sessionStorage.setItem(SESSION_KEY, String(u.id_usuario)); } catch (e) { /* ignora */ }
      return u;
    },
    logout() { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignora */ } }
  };

  load();
  TP.auth = Auth;
  TP.db = { Departamentos, Cargos, Colaboradores, Treinamentos, Matriculas, Relatorios,
    consts: { STATUS_COLAB, STATUS_MATRICULA, MOTIVOS, MOTIVOS_REAJUSTE },
    reset() { state = seed(); persist(); }, usuarios: () => T('usuarios') };
})(window.TP);
