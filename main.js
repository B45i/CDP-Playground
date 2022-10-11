const btnStart = document.getElementById('start');
const btnInspect = document.getElementById('btnInspect');
inputURL = document.getElementById('url');
btnStart.addEventListener('click', handleStartCDP);
btnInspect.addEventListener('click', inspectElement);

const container = document.getElementById('container');

let tabId;
let debugee;
let isInspectMode = false;

chrome.debugger.onEvent.addListener(onEvent);
chrome.debugger.onDetach.addListener(onDetach);

window.addEventListener('unload', function () {
    chrome.debugger.detach({ tabId: tabId });
});
submitHandler();

const getTabId = () => {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
            console.log('tabId', tabs[0].id);
            resolve(tabs[0].id);
        });
    });
};

async function handleStartCDP() {
    try {
        // openURL();
        // tabId = await getTabId();
        tabId = await openURL();
        container.innerText += 'Tab Id: ' + tabId;
        debugee = attachDebugger(tabId);

        sendCDPCommand('DOM.enable', {});
        sendCDPCommand('Overlay.enable', {});
        // sendCDPCommand('Inspector.enable', {}); // don't need

        // inspectElement();
    } catch (error) {
        container.innerText += '\n' + error.message;
    }
}

function onEvent(debuggeeId, message, params) {
    if (message === 'DOM.setChildNodes') {
        return;
    }

    console.log('onEvent ' + message, params);

    if (message === 'Overlay.inspectNodeRequested') {
        console.log('stopping inspect');
        inspectElement();
    }

    if (tabId != debuggeeId.tabId) return;
    // sendCDPCommand('Overlay.inspectNodeRequested', null);
}

function onDetach(event, reason) {
    console.log('debugger detach', event);
    container.innerText += '\n disconnected ' + reason;
}

function submitHandler() {
    const form = document.getElementById('cmd');
    form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        const command = document.getElementById('command').value;
        const paramsInput = document.getElementById('params');
        paramsInput.classList.remove('error');
        let params;
        let error = false;
        try {
            params = JSON.parse(paramsInput.value);
        } catch (e) {
            error = true;
            paramsInput.classList.add('error');
            container.innerText += '\n Command Error ' + e.message;
        }

        if (error || !debugee) {
            return;
        }

        sendCDPCommand(command, params);
    });
}

function sendCDPCommand(method, commandParams) {
    if (!debugee) {
        container.innerText += '\n Debugger not connected ';
    }
    chrome.debugger.sendCommand(debugee, method, commandParams, x => {
        console.log(method + ' Response: ', x);
    });
}

function attachDebugger(tabId) {
    const debuggeeId = { tabId };
    const version = '1.0';

    try {
        chrome.debugger.attach(debuggeeId, version, params => {
            container.innerText += '\n Connected to cdp';
            console.log(params);
        });
    } catch (error) {
        container.innerText += error.message;
    }

    return debuggeeId;
}

function inspectElement() {
    sendCDPCommand('Overlay.setInspectMode', {
        mode: isInspectMode ? 'none' : 'searchForNode',
        highlightConfig: {
            showInfo: false,
            showStyles: false,
            contentColor: { r: 155, g: 11, b: 239, a: 0.7 },
        },
    });
    isInspectMode = !isInspectMode;
    btnInspect.innerText = isInspectMode ? 'Stop Inspect' : 'Inspect Element';
}

function openURL() {
    return new Promise((resolve, reject) => {
        chrome.windows.create(
            {
                url:
                    inputURL.value ||
                    'https://chromedevtools.github.io/devtools-protocol/tot/DOM/',
                type: 'popup',
                width: 900,
            },
            x => {
                let { tabs } = x;
                tabId = tabs[0].id;
                resolve(tabId);
            }
        );
    });
}
