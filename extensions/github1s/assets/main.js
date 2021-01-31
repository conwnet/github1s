(function () {
  const vscode = acquireVsCodeApi();

  const updateState = (state) => {
    const prevState = vscode.getState();
    vscode.setState({ ...prevState, ...state });
    updatePage();
  };

  window.addEventListener('message', ({ data }) => {
    if (data && data.type === 'update-state') {
      updateState(data.payload);
    }
  });
  vscode.postMessage({ type: 'initialization', payload: null });

  const delegate = (element, selector, eventName, handler) => {
    if (!element) return null;
    element.addEventListener(eventName, function (event) {
      const children = element.querySelectorAll(selector);
      for (let i = 0, len = children.length; i < len; i++) {
        if (children[i] === event.target) {
          handler.call(this, event);
        }
      }
    });
  };

  delegate(document.body, '#save-button', 'click', () => {
    const tokenInput = document.getElementById('token-input');
    vscode.postMessage({ type: 'update-token', payload: tokenInput ? tokenInput.value : '' });
  });

  delegate(document.body, '#preview-button', 'click', () => {
    updateState({ pageType: 'PREVIEW' });
  });

  delegate(document.body, '#validate-button', 'click', () => {
    const state = vscode.getState();
    vscode.postMessage({ type: 'validate-token', payload: state ? state.token : '' });
  });

  delegate(document.body, '#edit-button', 'click', () => {
    updateState({ pageType: 'EDIT' });
  });

  delegate(document.body, '#clear-button', 'click', () => {
    vscode.postMessage({ type: 'clear-token' });
  });

  const updatePage = () => {
    const { token, pageType, valid, validating } = vscode.getState() || { token: '', preview: 'EDIT', valid: true, validating: true };
    if (validating) {
      document.querySelector('.loading-page').style.display = 'block';
      document.querySelector('.preview-page').style.display = 'none';
      document.querySelector('.edit-page').style.display = 'none';
      return;
    }

    if (pageType === 'EDIT') {
      document.querySelector('.loading-page').style.display = 'none';
      document.querySelector('.preview-page').style.display = 'none';
      document.querySelector('.edit-page').style.display = 'block';
      document.querySelector('#preview-button').style.display = (token ? 'block' : 'none');
      return;
    }

    document.querySelector('.loading-page').style.display = 'none';
    document.querySelector('.edit-page').style.display = 'none';
    document.querySelector('.preview-page').style.display = 'block';
    document.querySelector('.container .token-status .token-status-text').innerText = (valid ? ' VALID' : ' INVALID');
    document.querySelector('#token-text').innerText = token.slice(0, 7) + token.slice(7).replace(/./g, '*');
    document.querySelector('#token-text').style.color = (valid ? '#73c991' : '#f88070');
  };
})();
