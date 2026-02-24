// ==UserScript==
// @name         Perplexity Context Memory Injector
// @namespace    http://evandro.dev.br/
// @version      1.8.1
// @description  Gerenciador de memórias (Edição, Cópia, Nova UI, Credits Footer + Fallback FAB).
// @author       Evandro Fonseca Junior
// @match        https://www.perplexity.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- Logging ---
  const DEBUG = true;
  const log = (action, data = '') => {
    if (DEBUG) console.log(`%c[PPLX-Memory::${action}]`, 'color: #22d3ee; font-weight: bold;', data);
  };

  log('Boot', 'Script 1.8.1 initialized. Credits footer added.');

  // --- Global State ---
  let memories = GM_getValue('pplx_memories', []);
  let isPanelOpen = false;
  let isSubmitting = false;

  // States for Editing
  let editingId = null;
  let draftText = '';

  // --- Panel Setup (Shadow DOM) ---
  const container = document.createElement('div');
  container.id = 'pplx-memory-panel-container';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.left = '84px';
  container.style.zIndex = '999999';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // Perplexity-inspired design system colors and styles
  const styles = `
    *, *::before, *::after { box-sizing: border-box; }
    :host {
      --pplx-bg-primary: #1f1f1f;
      --pplx-bg-secondary: #282828;
      --pplx-fg-primary: #e8e8e8;
      --pplx-fg-secondary: #a0a0a0;
      --pplx-border: #3a3a3a;
      --pplx-accent: #22d3ee;
      --pplx-danger: #ef4444;
      --pplx-success: #10b981;
      --pplx-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --pplx-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-family: var(--pplx-font-sans);
      font-size: 14px;
      color: var(--pplx-fg-primary);
    }

    @media (prefers-color-scheme: light) {
      :host {
        --pplx-bg-primary: #ffffff;
        --pplx-bg-secondary: #f5f5f5;
        --pplx-fg-primary: #111111;
        --pplx-fg-secondary: #666666;
        --pplx-border: #e0e0e0;
      }
    }

    .panel {
      display: flex;
      flex-direction: column;
      width: 450px;
      max-height: 650px;
      background: var(--pplx-bg-primary);
      border: 1px solid var(--pplx-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
      transform-origin: bottom left;
    }
    .panel.hidden {
      opacity: 0;
      transform: scale(0.98) translateY(10px);
      pointer-events: none;
      visibility: hidden;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--pplx-border);
    }
    header h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--pplx-fg-primary); }
    header .count { margin-left: 8px; font-size: 13px; color: var(--pplx-fg-secondary); font-weight: normal; }

    .memory-list { flex: 1; overflow-y: auto; padding: 0; margin: 0; list-style: none; }

    .memory-item { display: flex; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--pplx-border); align-items: flex-start; transition: background 0.15s ease; }
    .memory-item.editing { background: rgba(34, 211, 238, 0.05); border-left: 3px solid var(--pplx-accent); padding-left: 17px; }
    .memory-item:hover { background: var(--pplx-bg-secondary); }

    .memory-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
    .memory-content { font-family: var(--pplx-font-mono); font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; color: var(--pplx-fg-primary); }

    .memory-actions { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }

    .input-group { padding: 20px; border-top: 1px solid var(--pplx-border); display: flex; flex-direction: column; gap: 12px; background: var(--pplx-bg-primary); }

    textarea { width: 100%; height: 140px; resize: vertical; background: var(--pplx-bg-secondary); border: 1px solid transparent; color: var(--pplx-fg-primary); padding: 12px; border-radius: 8px; font-family: var(--pplx-font-mono); font-size: 13px; line-height: 1.5; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    textarea:focus-visible { outline: none; border-color: var(--pplx-accent); box-shadow: 0 0 0 1px var(--pplx-accent); background: var(--pplx-bg-primary); }
    textarea::placeholder { color: var(--pplx-fg-secondary); opacity: 0.7; }

    .hint { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--pplx-fg-secondary); line-height: 1.4; }
    .hint svg { flex-shrink: 0; color: var(--pplx-accent); }

    button { background: transparent; border: none; color: var(--pplx-fg-secondary); padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; }
    button:hover { background: var(--pplx-bg-secondary); color: var(--pplx-fg-primary); }

    button.icon-close { padding: 6px; margin-right: -6px; }

    button.icon-action { padding: 6px; color: var(--pplx-fg-secondary); opacity: 0.8; }
    button.icon-action:hover { opacity: 1; color: var(--pplx-fg-primary); background: var(--pplx-bg-secondary); }
    button.icon-delete:hover { color: var(--pplx-danger); background: rgba(239, 68, 68, 0.1); }

    button.primary { background: var(--pplx-accent); color: #000; padding: 10px 16px; border-radius: 8px; font-weight: 600; flex: 1; justify-content: center; }
    button.primary:hover { opacity: 0.9; background: var(--pplx-accent); color: #000; }
    button.primary:active { transform: translateY(1px); }

    button.cancel { border: 1px solid var(--pplx-border); padding: 10px 16px; border-radius: 8px; font-weight: 600; color: var(--pplx-fg-primary); flex: 0 0 auto; }
    button.cancel:hover { background: var(--pplx-bg-secondary); }

    .action-row { display: flex; gap: 8px; width: 100%; }

    .checkbox-wrapper { position: relative; width: 18px; height: 18px; margin-top: 2px; }
    input[type="checkbox"] { opacity: 0; width: 100%; height: 100%; position: absolute; top: 0; left: 0; margin: 0; cursor: pointer; z-index: 1; }
    .checkbox-styled { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--pplx-bg-secondary); border: 1px solid var(--pplx-border); border-radius: 4px; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
    input[type="checkbox"]:checked + .checkbox-styled { background: var(--pplx-accent); border-color: var(--pplx-accent); }
    input[type="checkbox"]:focus-visible + .checkbox-styled { box-shadow: 0 0 0 2px var(--pplx-bg-primary), 0 0 0 4px var(--pplx-accent); }
    .checkbox-styled svg { color: #000; opacity: 0; transform: scale(0.8); transition: all 0.15s ease; }
    input[type="checkbox"]:checked + .checkbox-styled svg { opacity: 1; transform: scale(1); }

    /* Credits Footer Area */
    .credits {
      padding: 12px 20px;
      background: var(--pplx-bg-secondary);
      border-top: 1px solid var(--pplx-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--pplx-fg-secondary);
    }
    .credits-links { display: flex; gap: 14px; }
    .credits a {
      color: var(--pplx-fg-secondary);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
    }
    .credits a:hover { color: var(--pplx-accent); }

    .memory-list::-webkit-scrollbar { width: 8px; }
    .memory-list::-webkit-scrollbar-track { background: transparent; }
    .memory-list::-webkit-scrollbar-thumb { background: var(--pplx-border); border-radius: 4px; border: 2px solid var(--pplx-bg-primary); }
    .memory-list::-webkit-scrollbar-thumb:hover { background: var(--pplx-fg-secondary); }
  `;

  const renderPanel = () => {
    shadow.innerHTML = `<style>${styles}</style>`;

    const panel = document.createElement('section');
    panel.className = `panel ${isPanelOpen ? '' : 'hidden'}`;
    panel.hidden = !isPanelOpen;

    const header = document.createElement('header');
    const activeCount = memories.filter(m => m.active).length;
    header.innerHTML = `<h2>Secure Memory Context<span class="count">(${activeCount} active)</span></h2>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'icon-close';
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.onclick = () => { isPanelOpen = false; renderPanel(); };
    header.appendChild(closeBtn);

    const ul = document.createElement('ul');
    ul.className = 'memory-list';

    if (memories.length === 0) {
      const emptyState = document.createElement('li');
      emptyState.style.padding = '32px 20px';
      emptyState.style.textAlign = 'center';
      emptyState.style.color = 'var(--pplx-fg-secondary)';
      emptyState.style.fontStyle = 'italic';
      emptyState.textContent = 'No memories added yet.';
      ul.appendChild(emptyState);
    } else {
      const fragment = document.createDocumentFragment();
      memories.forEach((mem, index) => {
        const li = document.createElement('li');
        li.className = `memory-item ${editingId === mem.id ? 'editing' : ''}`;

        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `mem-check-${index}`;
        checkbox.checked = mem.active;
        checkbox.onchange = (e) => {
          memories[index].active = e.target.checked;
          GM_setValue('pplx_memories', memories);
          renderPanel();
        };

        const checkboxStyled = document.createElement('label');
        checkboxStyled.className = 'checkbox-styled';
        checkboxStyled.setAttribute('for', `mem-check-${index}`);
        checkboxStyled.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(checkboxStyled);

        const body = document.createElement('div');
        body.className = 'memory-body';

        const content = document.createElement('div');
        content.className = 'memory-content';
        content.textContent = mem.text;

        const actions = document.createElement('div');
        actions.className = 'memory-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-action';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(mem.text);
          copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pplx-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => {
            copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
          }, 1500);
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-action';
        editBtn.title = 'Edit memory';
        editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        editBtn.onclick = () => {
          editingId = mem.id;
          draftText = mem.text;
          renderPanel();
          setTimeout(() => {
            const ta = shadow.querySelector('textarea');
            if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
          }, 50);
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-action icon-delete';
        delBtn.title = 'Delete memory';
        delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        delBtn.onclick = () => {
          if (confirm('Are you sure you want to delete this memory block?')) {
            memories.splice(index, 1);
            if (editingId === mem.id) {
              editingId = null;
              draftText = '';
            }
            GM_setValue('pplx_memories', memories);
            renderPanel();
          }
        };

        actions.appendChild(copyBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        body.appendChild(content);
        body.appendChild(actions);

        li.appendChild(checkboxWrapper);
        li.appendChild(body);
        fragment.appendChild(li);
      });
      ul.appendChild(fragment);
    }

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>Use safe, declarative structures like <code>[SYSTEM]</code> blocks. Avoid ambiguous separators (e.g., <code>---</code>) or imperative "ignore" commands.</span>
    `;

    const textarea = document.createElement('textarea');
    textarea.placeholder = `[SYSTEM]\nYou will act as a Precision Technical Assistant, Senior Software Engineer, and Technical Writer proficient in Markdown.\nAPI Temperature: 0.2 (code & facts) / 0.3 (conceptual analysis).\n\n[ABSOLUTE CONSTRAINTS]\n- Never invent data or references...\n...`;

    textarea.value = draftText;
    textarea.oninput = (e) => {
      draftText = e.target.value;
    };

    const actionRow = document.createElement('div');
    actionRow.className = 'action-row';

    const mainBtn = document.createElement('button');
    mainBtn.className = 'primary';

    if (editingId) {
      mainBtn.textContent = 'Update Memory Block';
      mainBtn.onclick = () => {
        const text = draftText.trim();
        if (text) {
          const index = memories.findIndex(m => m.id === editingId);
          if (index !== -1) memories[index].text = text;
          GM_setValue('pplx_memories', memories);
          editingId = null;
          draftText = '';
          renderPanel();
        }
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'cancel';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => {
        editingId = null;
        draftText = '';
        renderPanel();
      };

      actionRow.appendChild(cancelBtn);
    } else {
      mainBtn.textContent = 'Add Safe Memory Block';
      mainBtn.onclick = () => {
        const text = draftText.trim();
        if (text) {
          memories.push({ id: Date.now(), text, active: true });
          GM_setValue('pplx_memories', memories);
          draftText = '';
          renderPanel();
          setTimeout(() => {
              const list = shadow.querySelector('.memory-list');
              if (list) list.scrollTop = list.scrollHeight;
          }, 0);
        }
      };
    }

    actionRow.appendChild(mainBtn);

    inputGroup.appendChild(hint);
    inputGroup.appendChild(textarea);
    inputGroup.appendChild(actionRow);

    // Footer Credits Area
    const credits = document.createElement('div');
    credits.className = 'credits';
    credits.innerHTML = `
      <span>v1.8.1</span>
      <div class="credits-links">
        <a href="https://evandro.dev.br" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          evandro.dev.br
        </a>
        <a href="https://github.com/evandrodevbr" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          GitHub
        </a>
        <a href="https://github.com/evandrodevbr/Perplexity-CMI-Context-Memory-Enhancer/tree/main" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Repo
        </a>
      </div>
    `;

    panel.appendChild(header);
    panel.appendChild(ul);
    panel.appendChild(inputGroup);
    panel.appendChild(credits);

    shadow.appendChild(panel);
  };

  // --- Hybrid Button Injection (Native Sidebar or Floating Fallback) ---
  const injectSidebarButton = () => {
    const existingBtn = document.getElementById('pplx-memory-toggle-btn');

    const sidebarNav = document.querySelector('.mt-auto.w-full.min-w-0') || document.querySelector('.group\\/sidebar .mt-auto');

    if (sidebarNav) {
      if (existingBtn) {
        if (existingBtn.tagName === 'BUTTON') {
          existingBtn.remove();
        } else {
          return;
        }
      }

      const btn = document.createElement('a');
      btn.id = 'pplx-memory-toggle-btn';
      btn.className = 'reset interactable-alt py-xs group flex w-full justify-start items-center cursor-pointer after:content-[""] after:opacity-0 after:absolute after:inset-x-xs after:inset-y-px after:rounded-md after:bg-subtler after:pointer-events-none hover:after:opacity-100';

      btn.innerHTML = `
        <div class="flex items-center w-full justify-start">
          <div class="flex items-center shrink-0 justify-center" style="width: 56px;">
            <div class="grid size-8 place-items-center border-subtlest ring-subtlest divide-subtlest bg-transparent">
              <div class="duration-normal size-full rounded-md ease-out [grid-area:1/-1] opacity-0 border-subtlest ring-subtlest divide-subtlest bg-subtle group-hover:opacity-100"></div>
              <div class="relative [grid-area:1/-1] inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="inline-flex fill-current shrink-0 tabler-icon shrink-0 duration-normal ease text-foreground" width="20" height="20" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
                  <path d="M10 10l-2 2" />
                  <path d="M14 10l2 2" />
                  <path d="M12 13v3" />
                </svg>
              </div>
            </div>
          </div>
          <div class="mr-md -ml-sm min-w-0 flex-1 font-sans text-sm text-foreground select-none whitespace-nowrap bg-transparent">Memory</div>
        </div>
      `;

      btn.onclick = (e) => {
        e.preventDefault();
        isPanelOpen = !isPanelOpen;
        renderPanel();
      };

      sidebarNav.parentNode.insertBefore(btn, sidebarNav);

    } else {
      if (existingBtn) {
        if (existingBtn.tagName === 'A') {
          existingBtn.remove();
        } else {
          return;
        }
      }

      const fab = document.createElement('button');
      fab.id = 'pplx-memory-toggle-btn';

      fab.style.position = 'fixed';
      fab.style.bottom = '24px';
      fab.style.right = '24px';
      fab.style.width = '48px';
      fab.style.height = '48px';
      fab.style.borderRadius = '24px';
      fab.style.backgroundColor = '#1f1f1f';
      fab.style.color = '#22d3ee';
      fab.style.border = '1px solid #3a3a3a';
      fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      fab.style.zIndex = '999998';
      fab.style.cursor = 'pointer';
      fab.style.display = 'flex';
      fab.style.alignItems = 'center';
      fab.style.justifyContent = 'center';
      fab.style.transition = 'transform 0.2s ease, background-color 0.2s ease';

      fab.onmouseover = () => { fab.style.transform = 'scale(1.05)'; fab.style.backgroundColor = '#282828'; };
      fab.onmouseout = () => { fab.style.transform = 'scale(1)'; fab.style.backgroundColor = '#1f1f1f'; };

      fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
          <path d="M10 10l-2 2" />
          <path d="M14 10l2 2" />
          <path d="M12 13v3" />
        </svg>
      `;

      fab.onclick = (e) => {
        e.preventDefault();
        isPanelOpen = !isPanelOpen;
        renderPanel();
      };

      document.body.appendChild(fab);
    }
  };

  setInterval(injectSidebarButton, 1000);

  // --- Secondary Prevention (Ghost Events) ---
  const blockGhostEvents = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const editor = e.target.closest('#ask-input');
      if (editor && memories.filter(m => m.active).length > 0) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  };

  document.addEventListener('keypress', blockGhostEvents, { capture: true });
  document.addEventListener('keyup', blockGhostEvents, { capture: true });

  // --- Injection Engine (Lexical Append + Safe Declarative Context) ---
  document.addEventListener('keydown', (e) => {
    if (e.__pplxInjected) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      const editor = e.target.closest('#ask-input');
      if (!editor) return;

      const activeMemories = memories.filter(m => m.active);
      if (activeMemories.length === 0) return;

      const originalText = editor.innerText.trim();
      if (!originalText) return;

      if (isSubmitting) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      isSubmitting = true;

      const memoriesText = activeMemories.map(m => m.text).join('\n\n');
      const escapedMemoriesHtml = memoriesText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, '<br>');

      const safeTag = "Additional User Context:";
      const plainPayload = `\r\n\r\n\r\n**[${safeTag}]**\r\n${memoriesText}\r\n\r\n`;
      const htmlPayload = `<p>&nbsp;</p><p>&nbsp;</p><p><strong>[${safeTag}]</strong></p><p>${escapedMemoriesHtml}</p><p>&nbsp;</p>`;

      editor.focus();

      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.collapse(false);
      }

      const dt = new DataTransfer();
      dt.setData('text/plain', plainPayload);
      dt.setData('text/html', htmlPayload);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });

      editor.dispatchEvent(pasteEvent);
      log('Inject', 'Memory block appended with safe semantic framing.');

      setTimeout(() => {
        const submitBtn = document.querySelector('button[aria-label="Submit"]');

        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          log('Submit', 'Native Submit button triggered.');
        } else {
          log('Error', 'Submit button not found or disabled.');
        }

        setTimeout(() => {
          isSubmitting = false;
        }, 1000);

      }, 100);
    }
  }, { capture: true });

  // Initial Boot
  renderPanel();

})();