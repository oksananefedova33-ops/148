// /ui/html-preview/html-preview-modal.js

(function() {
  'use strict';

  class HtmlPreviewModal {
    constructor() {
      this.modal = null;
      this.textarea = null;
      this.iframe = null;
      this.iframeDoc = null;
      this.searchMatches = [];
      this.currentMatchIndex = -1;
    }

    open(initialHtml = '', onInsert = null) {
      this.createModal();
      this.textarea.value = initialHtml;
      this.attachEventListeners(onInsert);
      this.refreshPreview();
    }

    createModal() {
      const back = document.createElement('div');
      back.className = 'html-preview-modal-back';

      const container = document.createElement('div');
      container.className = 'html-preview-modal-container';

      const header = document.createElement('div');
      header.className = 'html-preview-modal-header';
      header.innerHTML = `
        <h3>🔗 HTML Preview</h3>
        <button class="close-btn" type="button">&times;</button>
      `;

      const content = document.createElement('div');
      content.className = 'html-preview-modal-content';

      const editorPanel = document.createElement('div');
      editorPanel.className = 'html-preview-editor-panel';
      
      // === Строка поиска ===
      const searchContainer = document.createElement('div');
      searchContainer.className = 'html-preview-search-container';
      searchContainer.innerHTML = `
        <div class="html-preview-search-wrapper">
          <input type="text" class="html-preview-search-input" placeholder="Поиск в коде..." />
          <div class="html-preview-search-controls">
            <button class="html-preview-search-btn prev" type="button" title="Предыдущее">↑</button>
            <span class="html-preview-search-counter">0/0</span>
            <button class="html-preview-search-btn next" type="button" title="Следующее">↓</button>
            <button class="html-preview-search-btn clear" type="button" title="Очистить">✕</button>
          </div>
        </div>
      `;
      
      const editorLabel = document.createElement('div');
      editorLabel.className = 'html-preview-editor-label';
      editorLabel.textContent = '📝 HTML + CSS код';
      
      const textarea = document.createElement('textarea');
      textarea.className = 'html-preview-editor-textarea';
      textarea.spellcheck = false;
      textarea.placeholder = 'Вставьте HTML и CSS здесь...';
      
      editorPanel.appendChild(searchContainer);
      editorPanel.appendChild(editorLabel);
      editorPanel.appendChild(textarea);

      const previewPanel = document.createElement('div');
      previewPanel.className = 'html-preview-preview-panel';
      previewPanel.innerHTML = `
        <div class="html-preview-preview-label">👁️ Предпросмотр</div>
        <div class="html-preview-iframe-container">
          <iframe class="html-preview-iframe" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
      `;

      content.appendChild(editorPanel);
      content.appendChild(previewPanel);

      const footer = document.createElement('div');
      footer.className = 'html-preview-modal-footer';
      footer.innerHTML = `
        <button class="html-preview-btn danger" type="button">❌ Отмена</button>
        <button class="html-preview-btn primary" type="button">✅ Вставить в редактор</button>
      `;

      container.appendChild(header);
      container.appendChild(content);
      container.appendChild(footer);
      back.appendChild(container);
      document.body.appendChild(back);

      this.modal = back;
      this.textarea = editorPanel.querySelector('textarea');
      this.iframe = previewPanel.querySelector('iframe');
      this.iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
      
      // === Элементы поиска ===
      this.searchInput = editorPanel.querySelector('.html-preview-search-input');
      this.searchCounter = editorPanel.querySelector('.html-preview-search-counter');
      this.searchBtnPrev = editorPanel.querySelector('.html-preview-search-btn.prev');
      this.searchBtnNext = editorPanel.querySelector('.html-preview-search-btn.next');
      this.searchBtnClear = editorPanel.querySelector('.html-preview-search-btn.clear');
      
      console.log('Search elements:', {
        input: this.searchInput,
        counter: this.searchCounter,
        prev: this.searchBtnPrev,
        next: this.searchBtnNext,
        clear: this.searchBtnClear
      });

      back.addEventListener('click', (e) => {
        if (e.target === back) this.close();
      });

      header.querySelector('.close-btn').addEventListener('click', () => this.close());
      footer.querySelector('.html-preview-btn.danger').addEventListener('click', () => this.close());
      this.textarea.addEventListener('input', () => this.refreshPreview());
      
      // === НОВОЕ: Обработчики поиска ===
      this.setupSearchHandlers();
    }

    // === НОВОЕ: Функции поиска ===
    setupSearchHandlers() {
      const self = this;
      
      this.searchInput.addEventListener('input', function() {
        self.performSearch();
      });
      
      this.searchBtnNext.addEventListener('click', function() {
        self.goToNextMatch();
      });
      
      this.searchBtnPrev.addEventListener('click', function() {
        self.goToPrevMatch();
      });
      
      this.searchBtnClear.addEventListener('click', function() {
        self.clearSearch();
      });
      
      this.searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.shiftKey ? self.goToPrevMatch() : self.goToNextMatch();
        }
      });
    }

    performSearch() {
      const searchTerm = this.searchInput.value.trim();
      this.searchMatches = [];
      this.currentMatchIndex = -1;

      if (!searchTerm) {
        this.updateSearchCounter();
        return;
      }

      const text = this.textarea.value;
      
      // Простой поиск без regex
      let startIndex = 0;
      while (true) {
        const index = text.indexOf(searchTerm, startIndex);
        if (index === -1) break;
        
        this.searchMatches.push({
          start: index,
          end: index + searchTerm.length,
          text: searchTerm
        });
        
        startIndex = index + 1;
      }

      console.log('Found matches:', this.searchMatches.length, this.searchMatches);

      if (this.searchMatches.length > 0) {
        this.goToFirstMatch();
      }

      this.updateSearchCounter();
    }

    goToFirstMatch() {
      if (this.searchMatches.length === 0) return;
      this.currentMatchIndex = 0;
      this.highlightMatch(0);
    }

    goToNextMatch() {
      if (this.searchMatches.length === 0) return;
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
      this.highlightMatch(this.currentMatchIndex);
    }

    goToPrevMatch() {
      if (this.searchMatches.length === 0) return;
      this.currentMatchIndex = (this.currentMatchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
      this.highlightMatch(this.currentMatchIndex);
    }

    highlightMatch(index) {
      if (!this.searchMatches[index]) return;

      const match = this.searchMatches[index];
      
      // Выделяем текст в textarea
      this.textarea.setSelectionRange(match.start, match.end);
      this.textarea.focus();

      // Прокручиваем к найденному тексту
      this.scrollToMatch(match.start);

      this.updateSearchCounter();
    }

    scrollToMatch(position) {
      const text = this.textarea.value;
      const textBeforeMatch = text.substring(0, position);
      const lineNumber = textBeforeMatch.split('\n').length - 1;
      
      // Вычисляем примерную высоту строки
      const lineHeight = parseInt(window.getComputedStyle(this.textarea).lineHeight);
      const scrollPosition = lineNumber * lineHeight - lineHeight * 3; // 3 строки сверху для контекста
      
      // Плавное прокручивание
      this.textarea.scrollTop = Math.max(0, scrollPosition);
    }

    updateSearchCounter() {
      if (this.searchMatches.length === 0) {
        this.searchCounter.textContent = '0/0';
        this.searchCounter.className = '';
      } else {
        this.searchCounter.textContent = `${this.currentMatchIndex + 1}/${this.searchMatches.length}`;
        this.searchCounter.className = 'found';
      }
    }

    removeHighlights() {
      this.textarea.setSelectionRange(0, 0);
    }

    clearSearch() {
      this.searchInput.value = '';
      this.searchMatches = [];
      this.currentMatchIndex = -1;
      this.removeHighlights();
      this.updateSearchCounter();
      this.textarea.focus();
    }

    refreshPreview() {
      const rawHtml = this.textarea.value.trim();
      
      if (!rawHtml) {
        this.iframeDoc.open();
        this.iframeDoc.write('<p style="color:#999;padding:20px;">Введите HTML код...</p>');
        this.iframeDoc.close();
        return;
      }

      try {
        const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
            </style>
          </head>
          <body>
            ${rawHtml}
          </body>
          </html>
        `;
        
        this.iframeDoc.open();
        this.iframeDoc.write(fullHtml);
        this.iframeDoc.close();
      } catch (e) {
        this.showError('Ошибка: ' + e.message);
      }
    }

    showError(message) {
      console.error(message);
      this.iframeDoc.open();
      this.iframeDoc.write(`
        <div style="color:#ef4444;padding:20px;font-family:monospace;">
          ⚠️ ${message}
        </div>
      `);
      this.iframeDoc.close();
    }

    close() {
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
      this.textarea = null;
      this.iframe = null;
    }

    getFinalHtml() {
      return this.textarea.value.trim();
    }

    wrapHtmlSafely(rawHtml) {
      const iframeId = 'html-preview-' + Math.random().toString(36).slice(2, 9);
      
      return `
        <div data-html-preview-container="${iframeId}" style="width:100%;height:100%;overflow:auto;">
          <iframe 
            id="${iframeId}"
            data-html-preview-iframe="true"
            style="width:100%;height:100%;border:none;display:block;"
            sandbox="allow-scripts allow-same-origin"
            srcdoc="${this.escapeHtml(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { background: #fff; font-family: system-ui, sans-serif; }
                </style>
              </head>
              <body>
                ${rawHtml}
              </body>
              </html>
            `)}"
          ></iframe>
        </div>
      `;
    }

    escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    }

    attachEventListeners(onInsert) {
      const insertBtn = this.modal.querySelector('.html-preview-btn.primary');
      
      insertBtn.addEventListener('click', () => {
        const finalHtml = this.getFinalHtml();
        
        if (!finalHtml) {
          alert('Нечего вставлять!');
          return;
        }

        if (onInsert && typeof onInsert === 'function') {
          const wrappedHtml = this.wrapHtmlSafely(finalHtml);
          onInsert(wrappedHtml);
        }

        this.close();
      });
    }
  }

  window.HtmlPreviewModal = HtmlPreviewModal;
})();