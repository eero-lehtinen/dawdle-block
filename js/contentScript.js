var db_contentScriptCreated = true;

var mainDiv;

function db_showTime(timeString) {
    mainDiv = $("#dawdle_block_annoy");
    if (mainDiv.length == 0) {
        mainDiv = $("<div>", { id: "dawdle_block_annoy" }).prependTo("body");
        $("<link>", {href: "https://fonts.googleapis.com/css?family=PT+Mono", rel: "stylesheet"}).appendTo("head");
    }
    mainDiv.html(timeString);
}