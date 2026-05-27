console.log('Start load');

// Legacy package plugin filter: keep auth path and only selected plugins.
(function () {
    var LEGACY_ALLOWED = {
        "/online.js": true,
        "/startpage.js": true,
        "/sync.js": true,
        "/timecode.js": true,
        "/bookmark.js": true,
        "/sisi.js": true,
        "/catalog.js": true,
        "/styles.js": true,
        "/myid.js": true,
        "/watches.js": true,
        "/premconnect.js": true,
        "/marks.js": true
    };

    function normalizePath(url) {
        if (!url) return "";
        var clean = String(url).split("?")[0].split("#")[0];
        clean = clean.replace(/^https?:\/\/[^/]+/i, "");
        if (clean.charAt(0) !== "/") clean = "/" + clean;
        return clean.toLowerCase();
    }

    function isAllowed(url) {
        var path = normalizePath(url);

        // Keep privateinit auth/bootstrap from lampainit.
        if (path.indexOf("/privateinit.js") !== -1) return true;

        return !!LEGACY_ALLOWED[path];
    }

    function filterList(list) {
        var out = [];
        for (var i = 0; i < list.length; i++) {
            if (isAllowed(list[i])) out.push(list[i]);
            else console.log("[legacy-filter] skip:", list[i]);
        }
        return out;
    }

    function patchLampa() {
        if (!window.Lampa || !Lampa.Utils || Lampa.__legacyFilterPatched) return false;
        Lampa.__legacyFilterPatched = true;

        var oldPutScript = Lampa.Utils.putScript;
        if (typeof oldPutScript === "function") {
            Lampa.Utils.putScript = function (urls, ok, err, progress, parallel) {
                if (Object.prototype.toString.call(urls) === "[object Array]") {
                    urls = filterList(urls);
                } else if (typeof urls === "string") {
                    if (!isAllowed(urls)) return;
                }
                return oldPutScript.call(this, urls, ok, err, progress, parallel);
            };
        }

        var oldPutScriptAsync = Lampa.Utils.putScriptAsync;
        if (typeof oldPutScriptAsync === "function") {
            Lampa.Utils.putScriptAsync = function (urls, cb) {
                if (Object.prototype.toString.call(urls) === "[object Array]") {
                    urls = filterList(urls);
                } else if (typeof urls === "string") {
                    if (!isAllowed(urls)) return;
                }
                return oldPutScriptAsync.call(this, urls, cb);
            };
        }

        console.log("[legacy-filter] patched");
        return true;
    }

    var timer = setInterval(function () {
        if (patchLampa()) clearInterval(timer);
    }, 50);
})();
var lampac_url = localStorage.getItem('lampac_url');
var cache_version = Math.floor((new Date()).getTime() / 9e5); // Р СњР С•Р Р†Р С•Р Вµ Р В·Р Р…Р В°РЎвЂЎР ВµР Р…Р С‘Р Вµ Р С”Р В°Р В¶Р Т‘РЎвЂ№Р Вµ 15 Р СР С‘Р Р…РЎС“РЎвЂљ

var isLampac = localStorage.getItem('lampac_initiale');

if (!lampac_url) {
    lampac_url = 'http://lampaua.mooo.com';
    localStorage.setItem('lampac_url', lampac_url);
}

if (!isLampac) {
    isLampac = 'true';
    localStorage.setItem('lampac_initiale', isLampac);
}

function urlJoin(base, add) {
    if (base.charAt(base.length - 1) !== '/') {
        base += '/'
    }

    return base + add
}

function createScript(src,error){
    console.log('Load script:' + src);

    var script         = document.createElement('script');
        script.onerror = error;
        script.src     = src;
        script.type    = 'text/javascript';

    document.getElementsByTagName("body")[0].appendChild(script);
}

function startAppWithDeepLink(){
    createScript(urlJoin(lampac_url, 'app.min.js?v' + cache_version), function(){
        console.log('app.min.js fail');

        loadFromLocal()
    })

    if (isLampac) {
        console.log('this is Lampac, we will use lampainit.js');
        createScript(urlJoin(lampac_url, 'lampainit.js?v=' + cache_version), function(){
            console.log('lampainit fail');
        })
    }
}

function saveToLocal(){
    var request = new XMLHttpRequest();

    request.onload = function() {
        if (this.readyState == 4 && this.status == 200) {
            window.localStorage.setItem('app.js',this.responseText)

            console.log('Saved in storage')
        }
    };

    request.onerror = function () {

    };

    request.open('GET', urlJoin(lampac_url, 'app.min.js?v' + cache_version));
    request.send();
}

function loadFromLocal(){
	if(window.appready) return
	
    var app = window.localStorage.getItem('app.js')

    if(app){
        console.log('Try eval app')
        
        try{
            eval(app)
        }
        catch(e){
            createScript('app.js', function(){
                console.log('Load local error');
            })
        }
    }
    else{
        createScript('app.js', function(){
            console.log('Load local error');
            window.showUrlForm();
        })
    }
}

function checkConnection(url, successCb, errorCb) {
    var xhr = new XMLHttpRequest();
    var executed = false;

    xhr.open('GET', url, true);
    xhr.onload = function () {
        if (executed) {
            return;
        }
        executed = true;
        if (xhr.status == '200') {
            successCb && successCb(xhr);
        } else {
            errorCb && errorCb(xhr);
        }
    };
    xhr.onerror = function () {
        if (executed) {
            return;
        }
        executed = true;
        errorCb && errorCb(xhr);
    };
    xhr.ontimeout = function () {
        if (executed) {
            return;
        }
        executed = true;
        errorCb && errorCb(xhr);
    };
    xhr.send(null); 
}


function countdown() {
    if (timeLeft == 0) {
        clearTimeout(timerId);

        startAppWithDeepLink();

        saveToLocal();
    }
    else {
        checkConnection(
            urlJoin(lampac_url, 'app.min.js?v' + cache_version),
            function () {
                if(!app_loaded){
                    app_loaded = true

                    clearTimeout(timerId);

                    startAppWithDeepLink();

                    saveToLocal();
                }
            },
            function () {
                console.log('No Network');
            });
    }

    timeLeft--;
}

var timeLeft   = 5;
var timerId    = -1;
var app_loaded = false;

if (lampac_url) {
	timerId = setInterval(countdown, 3000);
	}
	else {
		console.log('No saved URL found, showing form');
		window.comlampactvshowinitForm();
	}

function initLampaApp(isLampacServer) {
	lampac_url = localStorage.getItem('lampac_url');
    isLampac = isLampacServer;
    timerId = setInterval(countdown, 3000);
}

