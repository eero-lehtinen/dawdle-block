var dawdle_block_annoy = {
    timeoutHandle: undefined,
    init: _ => {
        let link = document.createElement("link")
        link.setAttribute("href", "https://fonts.googleapis.com/css?family=PT+Mono");
        link.setAttribute("rel", "stylesheet");
        document.head.appendChild(link);

        mainDiv = document.createElement("div");
        mainDiv.setAttribute("id", "dawdle_block_annoy");
        document.body.appendChild(mainDiv);
    },
    showTime: timeString => {
        mainDiv = document.getElementById("dawdle_block_annoy");

        if (mainDiv == null) {
            dawdle_block_annoy.init();
        }

        mainDiv.textContent = timeString;

        if (mainDiv.className == "hidden") {
            mainDiv.className = "";
        }

        clearTimeout(dawdle_block_annoy.timeoutHandle);
        dawdle_block_annoy.timeoutHandle = setTimeout(dawdle_block_annoy.hideTime, 1500);
    },
    hideTime: _ => {
        mainDiv = document.getElementById("dawdle_block_annoy");
        if (mainDiv != null) {
            mainDiv.className = "hidden";
        }
    }
}