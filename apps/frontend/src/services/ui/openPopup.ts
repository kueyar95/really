export function openCenteredPopup(url: string, name = 'wa-embedded', w = 820, h = 820) {
    const dualLeft = window.screenLeft ?? window.screenX;
    const dualTop = window.screenTop ?? window.screenY;
    const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
    const left = width / 2 - w / 2 + dualLeft;
    const top = height / 2 - h / 2 + dualTop;
    return window.open(url, name, `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`);
  }
  