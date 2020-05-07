var db_contentScriptCreated = true;

var timeoutHandle = undefined;

function init() {
    var link = document.createElement("link")
    link.setAttribute("href", "https://fonts.googleapis.com/css?family=PT+Mono");
    link.setAttribute("rel", "stylesheet");
    document.head.appendChild(link)

    mainDiv = document.createElement("div");
    mainDiv.setAttribute("id", "dawdle_block_annoy")
    document.body.appendChild(mainDiv)
}

function dawdle_block_showTime(timeString) {
    mainDiv = document.getElementById("dawdle_block_annoy");

    if (mainDiv == null) {
        init();
    }

    mainDiv.innerHTML = timeString;

    if (mainDiv.className == "hidden") {
        mainDiv.className = "";
    }

    count = 0;
    if (timeoutHandle != undefined) {
        clearTimeout(timeoutHandle);
    }
    timeoutHandle = setTimeout(dawdle_block_hideTime, 1500);
}


count = 0;

function dawdle_block_hideTime() {
    if (document.hasFocus() == false || count == 0) {
        timeoutHandle = setTimeout(dawdle_block_hideTime, 1500);
        count++;
        return;
    }
    mainDiv = document.getElementById("dawdle_block_annoy");
    if (mainDiv != null) {
        mainDiv.className = "hidden";
    }
}