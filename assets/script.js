window.addEventListener('contextmenu', (event) => event.preventDefault());
if (/macintosh|mac os x/i.test(navigator.userAgent)) {
    //修复快捷键
    window.addEventListener("keypress", (event) => {
        if (event.metaKey) {
            if (event.key === 'c') {
                document.execCommand("copy");
                event.preventDefault();
            } else if (event.key === 'v') {
                document.execCommand("paste");
                event.preventDefault();
            } else if (event.key === 'x') {
                document.execCommand("cut");
                event.preventDefault();
            } else if (event.key === 'a') {
                document.execCommand("selectall");
                event.preventDefault();
            } else if (event.shiftKey && event.key === 'z') {
                document.execCommand("redo");
                event.preventDefault();
            } else if (event.key === 'z') {
                document.execCommand("undo");
                event.preventDefault();
            }
        }
    })
}

document.addEventListener('DOMContentLoaded', function () {
    document.removeEventListener('DOMContentLoaded', arguments.callee, false);
    const loginDom = document.querySelector('#login');

    const address = localStorage.getItem('address');
    const token = localStorage.getItem('token');
    const accessKeyID = localStorage.getItem('accessKeyID');

    //直接登入
    if (address && token && accessKeyID) {
        const contentDom = document.querySelector('#content');
        //api请求
        const jsoneditorEditDom = contentDom.querySelector('#jsoneditor-edit');
        const jsoneditorReadonlyDom = contentDom.querySelector('#jsoneditor-readonly');
        const uriDom = contentDom.querySelector('input[name="uri"]');

        const json = {}
        const jsonEditor = new JSONEditor(jsoneditorEditDom, {
            mode: 'code',
            mainMenuBar: false,
        }, json)
        const jsonReadonly = new JSONEditor(jsoneditorReadonlyDom, {
            mode: 'view',
            modes: ['view', 'preview'],
            enableTransform: false
        })
        contentDom.querySelector('#address').innerHTML = address;
        contentDom.querySelector('#request').onclick = () => {
            jsonReadonly.set({});
            const uri = uriDom.value;
            let json = jsonEditor.get();
            if (!uri) {
                return;
            }
            if (!json) {
                json = {};
            }
            Ajax(uri, JSON.stringify(json)).then(res => {
                const json = JSON.parse(res);
                jsonReadonly.set(json);
            });
        }
        //分布式id
        const plaintextDom = contentDom.querySelector('input[name="plaintext"]');
        const ciphetextDom = contentDom.querySelector('input[name="ciphetext"]');
        contentDom.querySelector('#get').onclick = () => {
            const plaintext = plaintextDom.value;
            const ciphetext = ciphetextDom.value;
            if (plaintext && ciphetext) {
                plaintextDom.value = "";
                ciphetextDom.value = "";
                return
            }
            Ajax("/id/get", JSON.stringify({
                plaintext: plaintext,
                ciphetext: ciphetext,
            })).then(res => {
                const json = JSON.parse(res);
                if (json.state === "OK") {
                    const data = json.data;
                    plaintextDom.value = data.plaintext;
                    ciphetextDom.value = data.ciphetext;
                }
            });
        }

        //clean
        contentDom.querySelector("#clean").onclick = () => {
            localStorage.clear();
            window.location.reload();
        }

        Initialize(address, token, accessKeyID).then(() => {
            hide(loginDom);
            show(contentDom);
        })
    } else {
        //登入
        loginDom.querySelector('button').onclick = () => {
            let values = {};
            loginDom.querySelectorAll('input').forEach(v => values[v.name] = v.value);
            if (!values['address']) {
                return;
            }
            localStorage.setItem('address', values['address']);
            if ((values['username'] && values['password'])) {
                Ajax(values['address'] + '/user/get', JSON.stringify({
                    username: values['username'],
                    password: values['password']
                })).then(res => {
                    const json = JSON.parse(res);
                    if (json["state"] === "OK") {
                        const data = json["data"];
                        localStorage.setItem('token', data['token']);
                        localStorage.setItem('accessKeyID', data['access_key_id']);
                        window.location.reload();
                    }
                });
            } else if ((values['ak'] && values['token'])) {
                //ak token登入
                localStorage.setItem('token', values['token']);
                localStorage.setItem('accessKeyID', values['ak']);
                window.location.reload();
            }
        }
    }
});

const hide = (dom) => dom.style.visibility = 'hidden';
const show = (dom) => dom.style.visibility = 'visible';
