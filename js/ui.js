/* TalentPulse – componentes de interface */
(function (TP) {
  'use strict';
  const U = TP.util, esc = U.esc;

  const ICONS = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>',
    wand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.5 5.6 1.2-2.6L10 5.6l2.6 1.2L10 8 8.7 10.6 7.5 8 4.9 6.8zM19 13l-1-2.2L15.8 10 18 9l1-2.2L20 9l2.2 1L20 10.8zM16.3 8.8 3.6 21.5a1 1 0 001.4 0L17.7 10.2a1 1 0 000-1.4l-.3-.3a1 1 0 00-1.1.3z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M1 20c0-3.3 4-5 8-5 1.1 0 2.2.1 3.2.4A6 6 0 0010 21H3a2 2 0 01-2-1z"/><path d="m21.7 20.3-2.6-2.6a4 4 0 10-1.4 1.4l2.6 2.6zM16 18a2 2 0 110-4 2 2 0 010 4z"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.2 3.3a2 2 0 012.8 0l1.7 1.7a2 2 0 010 2.8L11 17.5H6.5L3.3 14.3a2 2 0 010-2.8zM12 20h9v2h-9z"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8H5a3 3 0 00-3 3v6h4v4h12v-4h4v-6a3 3 0 00-3-3zm-3 11H8v-5h8zm3-7a1 1 0 110-2 1 1 0 010 2zM18 3H6v4h12z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 1.9 2 3.4V19h6v-2.5c0-2.3-4.700-3.500-7-3.500z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2v16h16v2H3zm5 9h3v6H8zm5-5h3v11h-3zm5 3h3v8h-3z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.800 7.800 0 000-2l2.100-1.600a.5.500 0 00.1-.6l-2-3.500a.5.500 0 00-.6-.2l-2.500 1a7.300 7.300 0 00-1.700-1l-.4-2.600a.5.500 0 00-.5-.4h-4a.5.500 0 00-.5.400l-.4 2.600a7.300 7.300 0 00-1.700 1l-2.500-1a.5.500 0 00-.6.200l-2 3.500a.5.500 0 00.1.600L4.600 11a7.800 7.800 0 000 2l-2.100 1.600a.5.500 0 00-.1.600l2 3.500c.1.200.4.300.6.200l2.500-1c.5.400 1.100.7 1.700 1l.4 2.600c0 .2.200.4.500.4h4c.3 0 .5-.2.500-.4l.4-2.600c.6-.3 1.200-.6 1.700-1l2.500 1c.2.100.5 0 .6-.2l2-3.500a.5.500 0 00-.1-.6zM12 15.500a3.500 3.500 0 110-7 3.500 3.500 0 010 7z"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zM9 4h2v5l-1-.8L9 9zm9 16H6V4h1v8l3-2.300L13 12V4h5z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-3.300 0-10 1.700-10 5v3h20v-3c0-3.300-6.700-5-10-5z"/></svg>'
  };

  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ---------- toast ---------- */
  function toast(msg, type) {
    let box = document.getElementById('toasts');
    if (!box) { box = el('<div id="toasts" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = el('<div class="toast ' + (type || 'ok') + '" role="status">' + esc(msg) + '</div>');
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
  }

  /* ---------- campos de formulário ---------- */
  let uid = 0;
  function field(o) {
    const id = 'f' + (++uid) + '_' + o.name;
    const req = o.required ? '<span class="req" aria-hidden="true"> *</span>' : '';
    let ctl;
    const common = 'id="' + id + '" name="' + esc(o.name) + '"' + (o.required ? ' required' : '') + (o.readonly ? ' readonly' : '') +
      (o.disabled ? ' disabled' : '') + ' aria-describedby="' + id + '_err"' + (o.attrs ? ' ' + o.attrs : '');
    if (o.options) {
      ctl = '<select ' + common + '>' + (o.noBlank ? '' : '<option value="">Selecione…</option>') +
        o.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(v) === String(o.value ?? '') ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
    } else if (o.type === 'textarea') {
      ctl = '<textarea ' + common + ' rows="3">' + esc(o.value ?? '') + '</textarea>';
    } else {
      ctl = '<input ' + common + ' type="' + (o.type || 'text') + '" value="' + esc(o.value ?? '') + '"' +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') +
        (o.mask ? ' data-mask="' + o.mask + '"' : '') + ' autocomplete="off">';
    }
    return '<div class="field ' + (o.cls || '') + '" data-field="' + esc(o.name) + '"><label for="' + id + '">' + esc(o.label) + req + '</label>' + ctl +
      (o.hint ? '<div class="hint" data-hint="' + esc(o.name) + '">' + o.hint + '</div>' : '') + '<div class="err" id="' + id + '_err" role="alert"></div></div>';
  }
  function readForm(form) {
    const out = {};
    Array.from(form.elements).forEach(e => {
      if (!e.name || e.disabled && e.type !== 'hidden') return;
      if (e.type === 'radio') { if (e.checked) out[e.name] = e.value; return; }
      out[e.name] = typeof e.value === 'string' ? e.value.trim() : e.value;
    });
    return out;
  }
  function clearErrors(root) {
    root.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
    root.querySelectorAll('.err').forEach(e => { e.textContent = ''; });
    const b = root.querySelector('.form-error'); if (b) b.remove();
  }
  function showErrors(root, errors) {
    clearErrors(root);
    let first = null;
    Object.keys(errors).forEach(k => {
      if (k === '_') {
        const b = el('<div class="form-error" role="alert"></div>'); b.textContent = errors._;
        root.insertBefore(b, root.firstChild); return;
      }
      const f = root.querySelector('[data-field="' + k + '"]');
      if (!f) { const b = el('<div class="form-error" role="alert"></div>'); b.textContent = errors[k]; root.insertBefore(b, root.firstChild); return; }
      f.classList.add('invalid'); f.querySelector('.err').textContent = errors[k];
      if (!first) first = f.querySelector('input,select,textarea');
    });
    if (first) first.focus();
  }
  // máscara de CPF e limpeza de erro ao digitar
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.mask === 'cpf') t.value = U.formatCPF(t.value);
    const f = t.closest && t.closest('.field.invalid');
    if (f) { f.classList.remove('invalid'); f.querySelector('.err').textContent = ''; }
  });

  /* ---------- modal ---------- */
  function modal(opts) {
    // opts: {title, body (html), saveLabel, cancelLabel, onSubmit(data, form, ctl) -> true fecha, onOpen(form, ctl), wide, noSave}
    const prevFocus = document.activeElement;
    const ov = el('<div class="overlay"><div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="modal-title">' + esc(opts.title) + '</div>' +
      '<form class="modal-form" novalidate><div class="modal-body">' + opts.body + '</div>' +
      '<div class="modal-actions">' +
      (opts.noSave ? '' : '<button type="submit" class="btn btn-primary" data-role="save">' + esc(opts.saveLabel || 'Guardar') + '</button>') +
      '<button type="button" class="btn btn-primary" data-role="cancel">' + esc(opts.cancelLabel || 'Cancelar') + '</button></div></form></div></div>');
    const form = ov.querySelector('form');
    const ctl = {
      el: ov, form,
      close() { document.removeEventListener('keydown', onKey, true); ov.remove(); document.body.classList.remove('modal-open'); if (prevFocus && prevFocus.focus) prevFocus.focus(); },
      setSaveEnabled(on) { const b = form.querySelector('[data-role="save"]'); if (b) b.disabled = !on; }
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); ctl.close(); }
      if (e.key === 'Tab') { // prende o foco dentro do modal
        const items = Array.from(ov.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'));
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    ov.querySelector('[data-role="cancel"]').addEventListener('click', () => ctl.close());
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const sb = form.querySelector('[data-role="save"]');
      if (!opts.onSubmit || (sb && sb.disabled)) return;
      clearErrors(form);
      try {
        const ok = await opts.onSubmit(readForm(form), form, ctl);
        if (ok !== false) ctl.close();
      } catch (err) {
        if (err instanceof TP.ValidationError) showErrors(form, err.errors);
        else { console.error(err); showErrors(form, { _: 'Erro inesperado: ' + err.message }); }
      }
    });
    document.body.appendChild(ov); document.body.classList.add('modal-open');
    if (opts.onOpen) opts.onOpen(form, ctl);
    const f = form.querySelector('input:not([readonly]):not([type=hidden]),select'); if (f) f.focus(); else form.querySelector('button').focus();
    return ctl;
  }

  function confirmDialog(o) {
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; resolve(v); } };
      const ctl = modal({ title: o.title || 'Confirmação', saveLabel: o.confirmLabel || 'Confirmar', cancelLabel: 'Cancelar',
        body: '<p class="confirm-msg">' + o.message + '</p>',
        onSubmit() { finish(true); return true; } });
      ctl.el.querySelector('[data-role="cancel"]').addEventListener('click', () => finish(false));
      const obs = new MutationObserver(() => { if (!document.body.contains(ctl.el)) { obs.disconnect(); finish(false); } });
      obs.observe(document.body, { childList: true });
      ctl.el.querySelector('[data-role="save"]').focus();
    });
  }

  /* ---------- tabela com paginação ---------- */
  function table(o) {
    // o: {columns:[{label, render(row)=>html, cls}], rows, perPage, empty}
    let data = o.rows || [], page = 0, pp = o.perPage || 10;
    const root = el('<div class="tbl-wrap"><div class="tbl-scroll"><table class="tbl"><thead></thead><tbody></tbody></table></div>' +
      '<div class="pager"><label>Itens por página <select aria-label="Itens por página"><option>5</option><option>10</option><option>25</option><option>50</option></select></label>' +
      '<span class="range"></span><span class="pbtns"><button type="button" data-p="first" aria-label="Primeira página">|&lt;</button>' +
      '<button type="button" data-p="prev" aria-label="Página anterior">&lt;</button><button type="button" data-p="next" aria-label="Próxima página">&gt;</button>' +
      '<button type="button" data-p="last" aria-label="Última página">&gt;|</button></span></div></div>');
    const thead = root.querySelector('thead'), tbody = root.querySelector('tbody'), sel = root.querySelector('select');
    sel.value = String(pp);
    thead.innerHTML = '<tr>' + o.columns.map(c => '<th class="' + (c.cls || '') + '">' + esc(c.label) + '</th>').join('') + '</tr>';
    function draw() {
      const pages = Math.max(1, Math.ceil(data.length / pp));
      if (page >= pages) page = pages - 1; if (page < 0) page = 0;
      const slice = data.slice(page * pp, page * pp + pp);
      tbody.innerHTML = slice.length ? slice.map(r => '<tr>' + o.columns.map(c => '<td class="' + (c.cls || '') + '" data-label="' + esc(c.label) + '">' + c.render(r) + '</td>').join('') + '</tr>').join('')
        : '<tr><td class="empty" colspan="' + o.columns.length + '">' + esc(o.empty || 'Nenhum registro encontrado.') + '</td></tr>';
      const from = data.length ? page * pp + 1 : 0, to = Math.min(data.length, page * pp + pp);
      root.querySelector('.range').textContent = data.length ? (from + '-' + to + ' de ' + data.length) : '0 de 0';
      root.querySelector('[data-p=first]').disabled = root.querySelector('[data-p=prev]').disabled = page === 0;
      root.querySelector('[data-p=next]').disabled = root.querySelector('[data-p=last]').disabled = page >= pages - 1;
    }
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b || b.disabled) return;
      const pages = Math.max(1, Math.ceil(data.length / pp));
      page = { first: 0, prev: page - 1, next: page + 1, last: pages - 1 }[b.dataset.p]; draw();
    });
    sel.addEventListener('change', () => { pp = Number(sel.value); page = 0; draw(); });
    root.setRows = r => { data = r; page = 0; draw(); };
    root.refresh = r => { data = r; draw(); };      // mantém a página atual
    draw();
    return root;
  }

  /* ---------- painel (barra de título cinza-azulada) ---------- */
  function panel(o) {
    // o: {title, backTo, actions:[{icon,title,id}], closeTo}
    const acts = (o.actions || []).map(a => '<button type="button" class="icon-btn" data-act="' + a.id + '" title="' + esc(a.title) + '" aria-label="' + esc(a.title) + '">' + ICONS[a.icon] + '</button>').join('');
    const node = el('<section class="panel"><div class="panel-bar">' +
      (o.backTo ? '<a class="icon-btn" href="' + o.backTo + '" title="Voltar" aria-label="Voltar">' + ICONS.back + '</a>' : '<span class="icon-btn ph"></span>') +
      '<h1>' + esc(o.title) + '</h1><div class="bar-actions">' + acts +
      '<a class="icon-btn" href="' + (o.closeTo || '#/menu') + '" title="Fechar" aria-label="Fechar e ir ao menu">' + ICONS.close + '</a></div></div><div class="panel-body"></div></section>');
    return { el: node, body: node.querySelector('.panel-body'), on(id, fn) { const b = node.querySelector('[data-act="' + id + '"]'); if (b) b.addEventListener('click', fn); } };
  }

  function csv(filename, headers, rows) {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const text = '﻿' + [headers.map(q).join(';')].concat(rows.map(r => r.map(q).join(';'))).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  TP.ui = { ICONS, el, toast, field, readForm, showErrors, clearErrors, modal, confirm: confirmDialog, table, panel, csv };
})(window.TP);
