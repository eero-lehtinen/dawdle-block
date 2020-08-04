var db_contentScriptCreated = true;

var timeoutHandle = undefined;

function dawdle_block_init() {
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
        dawdle_block_init();
    }

    mainDiv.textContent = timeString;

    if (mainDiv.className == "hidden") {
        mainDiv.className = "";
    }

    if (timeoutHandle != undefined) {
        clearTimeout(timeoutHandle);
    }
    timeoutHandle = setTimeout(dawdle_block_hideTime, 1500);
}

function dawdle_block_hideTime() {
    mainDiv = document.getElementById("dawdle_block_annoy");
    if (mainDiv != null) {
        mainDiv.className = "hidden";
    }
}