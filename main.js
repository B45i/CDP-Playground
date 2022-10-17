const btnStart = document.getElementById('start');
const btnInspect = document.getElementById('btnInspect');
inputURL = document.getElementById('url');
btnStart.addEventListener('click', handleStartCDP);
btnInspect.addEventListener('click', toggleInspectElement);

const container = document.getElementById('container');

let tabId;
let debugee;
let isInspectMode = false;

const nodes = new Map();

chrome.debugger.onEvent.addListener(onEvent);
chrome.debugger.onDetach.addListener(onDetach);

window.addEventListener('unload', function () {
    chrome.debugger.detach({ tabId: tabId });
});
submitHandler();

async function handleStartCDP() {
    try {
        tabId = await openURL();
        print('Connected to Tab, Id: ' + tabId);
        debugee = attachDebugger(tabId);

        sendCDPCommand('DOM.enable', {});
        sendCDPCommand('Overlay.enable', {});
        // sendCDPCommand('DOMSnapshot.enable', {});
        // sendCDPCommand('Inspector.enable', {}); // don't need
    } catch (error) {
        print('ERROR ' + error.message);
    }
}

function onEvent(debuggeeId, message, params) {
    if (message === 'DOM.setChildNodes') {
        addNode(params.nodes[0]);
        return;
    }

    console.log('onEvent ' + message, params);
    print('onEvent ' + message);

    if (message === 'Overlay.inspectNodeRequested') {
        // sendCDPCommand('DOM.resolveNode', { nodeId: params.backendNodeId });
        console.log('backendNodeId', params.backendNodeId);
        sendCDPCommand('DOM.getDocument'); // check if this needed
        sendCDPCommand('DOM.pushNodesByBackendIdsToFrontend', {
            backendNodeIds: [params.backendNodeId],
        });
        toggleInspectElement();
    }

    if (tabId != debuggeeId.tabId) return;
}

function onDetach(event, reason) {
    console.log('debugger detach', event);
    print('disconnected ' + reason);
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
            print('Command Error ' + e.message);
        }

        if (error || !debugee) {
            return;
        }

        sendCDPCommand(command, params);
    });
}

function sendCDPCommand(method, commandParams) {
    if (!debugee) {
        print('Debugger not connected ');
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
            print('Connected to cdp');
            console.log(params);
        });
    } catch (error) {
        print(error.message);
    }

    return debuggeeId;
}

function toggleInspectElement() {
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

function print(text) {
    container.innerText += '\n' + text;
}

function addNode(node) {
    nodes.set(node.nodeId, node);
    if (node.children) {
        node.children.forEach(node => addNode(node));
    }
}
