var db_contentScriptCreated = true;

var mainDiv;

function db_showTime(timeString) {
    mainDiv = $("#dawdle_block_annoy");
    if (mainDiv.length == 0) {
        mainDiv = $("<div>", { id: "dawdle_block_annoy" }).prependTo("body");
    }
    mainDiv.html(timeString);
}