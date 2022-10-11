console.log('Hello from service worker');

chrome.action.onClicked.addListener(tab => {
    const tabId = tab.id;
    chrome.windows.create({
        url: './index.html',
        type: 'popup',
        height: 500,
        width: 500,
    });
});
