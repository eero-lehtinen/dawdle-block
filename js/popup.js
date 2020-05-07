var bgPage;
var blocksetIds;
var blocksetDatas;
var blocksetTimesElapsed;

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tabId === currentTabId && changeInfo.status === "complete") {
        $("#info").hide();
        if (blocksetIds.length === 1) {
            selectSet(blocksetIds[0]);
            $("#bsName").hide();
        }
        else {
            $("#bsName").show();
        }
    }
});

chrome.runtime.getBackgroundPage(function (bg) {
    bgPage = bg;
    blocksetIds = bgPage.blocksetIds;
    blocksetDatas = bgPage.blocksetDatas;
    blocksetTimesElapsed = bgPage.blocksetTimesElapsed;
    start();
});

function start() {
    setDarkTheme(bgPage.generalOptions.darkTheme);

    loadAllBlocksets();
    bgPage.callbacks[1] = update;

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.type === "blocksetChanged") {
            loadAllBlocksets();
        }
        else if (message.type === "blocksetDeleted") {
            loadAllBlocksets();
        }
    });

    $("p.header").text("Dawdle block " + bgPage.version);
}



var blocksetTimes = {};

function loadAllBlocksets() {
    var list = $("ul.blocksets");
    list.empty();

    blocksetTimes = [];

    for (id of blocksetIds) {
        var listItem = $("<li>", { id: id });
        var name = $("<a>", { class: "blocksiteName", href: "#" }).text(blocksetDatas[id].name);
        name.on("click", function (e) {
            var blocksetId = $(this).parent().attr("id");
            selectSet(blocksetId);
        });

        var time = $("<span>", { class: "blocksiteTime" });
        setTimeDisplay(time, blocksetDatas[id].timeAllowed - blocksetTimesElapsed[id]);

        blocksetTimes[id] = time;
        name.appendTo(listItem);
        time.appendTo(listItem);
        listItem.appendTo(list);
    }

    if (blocksetIds.length === 1) {
        selectSet(blocksetIds[0]);
        $("#bsName").hide();
    }
    else {
        $("#bsName").show();
    }
}

function update() {
    for (id of blocksetIds) {
        if (blocksetTimes[id] != undefined) {
            setTimeDisplay(blocksetTimes[id], blocksetDatas[id].timeAllowed - blocksetTimesElapsed[id]);
        }
    }
}

// Update dom element text to time in ms
function setTimeDisplay(element, time) {
    element.text(msToTimeDisplay(time));

    if (time < 0) {
        if (!element.hasClass("red")) {
            element.addClass("red");
        }
    }
    else {
        if (element.hasClass("red")) {
            element.removeClass("red");
        }
    }
}

var currentId = -1;
var url;
var urlWithProtocol;
var currentTabId;

function selectSet(id) {
    if (currentId != -1)
        $("#" + currentId).removeAttr("class");

    $("#" + id).attr("class", "selected");
    currentId = id;

    chrome.windows.getCurrent(function (w) {
        var tabId = bgPage.openTabIds[w.id];
        currentTabId = tabId;
        chrome.tabs.get(tabId, function (tab) {
            url = tab.url.replace(/(^\w+:|^)\/\//, '');
            urlWithProtocol = tab.url;

            if (url.startsWith("chrome-extension:") && url.endsWith("blockPage.html")) {
                $("#info").hide();
                return;
            }

            $("#bsName").text(blocksetDatas[id].name);

            $("p#url").text(url);
            $("p#domain").text(new URL(urlWithProtocol).hostname);

            $("p.yt").hide();
            if (url.startsWith("www.youtube.com/watch")) {
                $("p.yt").show();
            }
            else if (url.startsWith("www.youtube.com/channel") || url.startsWith("www.youtube.com/user")) {
                $("p.yt").first().show();
            }

            if (blocksetTimesElapsed[id] >= blocksetDatas[id].timeAllowed && blocksetDatas[id].timeAllowed != 0 && !blocksetDatas[id].annoyMode) {
                $("a[id^='wl']").attr("class", "disabled");
            }
            else {
                $("a[id^='wl']").removeAttr("class");
            }

            $("#info").hide();
            $("div.controls").show();
        })
    });
}


function msToTimeDisplay(duration) {
    var isNegative = (duration < 0);

    duration = Math.abs(duration);

    var seconds = parseInt((duration / 1000) % 60);
    var minutes = parseInt((duration / (1000 * 60)) % 60);
    var hours = parseInt((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return (isNegative ? "-" : "") + hours + ":" + minutes + ":" + seconds;
}

function addDomain(domain, toList) {
    if (!toList.some(val => val.type === "urlPrefix" && val.value === domain)) {
        toList[toList.length] = bgPage.bsItem("urlPrefix", domain);
        saveCurrentBlockset();
    }
    else {
        $("#addIndicator").text("Already exists");
        $("#addIndicator").addClass("show");
        setTimeout(() => { $("#addIndicator").removeClass("show") }, 100);
    }
}

function addUrl(url, toList) {
    if (!toList.some(val => val.type === "urlEquals" && val.value === url)) {
        toList[toList.length] = bgPage.bsItem("urlEquals", url);
        saveCurrentBlockset();
    }
    else {
        $("#addIndicator").text("Already exists");
        $("#addIndicator").addClass("show");
        setTimeout(() => { $("#addIndicator").removeClass("show") }, 100);
    }
}

function addChannel(channelId, channelTitle, toList) {
    if (!toList.some(val => val.type === "ytChannel" && val.value.id === channelId)) {
        toList[toList.length] = bgPage.bsItem("ytChannel", [channelTitle, channelId]);
        saveCurrentBlockset();
    }
    else {
        $("#addIndicator").text("Already exists");
        $("#addIndicator").addClass("show");
        setTimeout(() => { $("#addIndicator").removeClass("show") }, 100);
    }
}

function addCategory(categoryId, categoryName, toList) {
    if (!toList.some(val => val.type === "ytCategory" && val.value.id === categoryId)) {
        toList[toList.length] = bgPage.bsItem("ytCategory", [categoryName, categoryId]);
        saveCurrentBlockset();
    }
    else {
        $("#addIndicator").text("Already exists");
        $("#addIndicator").addClass("show");
        setTimeout(() => { $("#addIndicator").removeClass("show") }, 100);
    }
}

function getYTData(_url, callback) {
    if (blocksetDatas[currentId] != undefined) {
        if (_url.startsWith("www.youtube.com/watch")) {
            var videoId = _url.split("v=")[1].substring(0, 11);
            bgPage.httpGetAsync("https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + videoId + "&fields=items(snippet(categoryId%2CchannelId%2CchannelTitle))&key=" + bgPage.API_KEY, function (response) {

                if (response.error != undefined) {
                    console.error(`Could not get video info with id ${videoId}, error: ${response.error}`);
                    return;
                }

                var object = JSON.parse(response.message);

                callback({
                    channelId: object.items[0].snippet.channelId,
                    channelTitle: object.items[0].snippet.channelTitle,
                    categoryId: object.items[0].snippet.categoryId
                });
            });
        }
        else if (_url.startsWith("www.youtube.com/channel/")) {
            var list = _url.split("/");
            var channelId = list[2];

            bgPage.httpGetAsync("https://www.googleapis.com/youtube/v3/channels?part=snippet&id=" + channelId + "&fields=items(snippet%2Ftitle)&key=" + bgPage.API_KEY, function (response) {

                if (response.error != undefined) {
                    console.error(`Could not get channel info with id ${channelId}, error: ${response.error}`);
                    return;
                }

                var object = JSON.parse(response.message);

                callback({
                    channelId: channelId,
                    channelTitle: object.items[0].snippet.title
                });
            });
        }
        else if (_url.startsWith("www.youtube.com/user/")) {
            var list = _url.split("/");
            var channelUserName = list[2];

            bgPage.httpGetAsync("https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=" + channelUserName + "&fields=items(id%2Csnippet%2Ftitle)&key=" + bgPage.API_KEY, function (response) {

                if (response.error != undefined) {
                    console.error(`Could not get channel info with username ${channelUserName}, error: ${response.error}`);
                    return;
                }

                var object = JSON.parse(response.message);

                callback({
                    channelId: object.items[0].id,
                    channelTitle: object.items[0].snippet.title
                });
            });
        }
    }
}

function saveCurrentBlockset() {
    chrome.storage.sync.set({
        [currentId]: blocksetDatas[currentId]
    }, function () {
        if (chrome.runtime.lastError == null) {
            $("#addIndicator").text("Added");
            $("#addIndicator").addClass("show");
            setTimeout(() => { $("#addIndicator").removeClass("show") }, 100);
        }
        else {
            console.log(chrome.runtime.lastError);
        }
    });

    chrome.runtime.sendMessage({
        type: "blocksetChanged",
        id: currentId
    });
}

function setDarkTheme(bool) {
    if (bool === true)
        $("html").attr({ class: "dark" });
    else
        $("html").removeAttr("class");
}

$("#options").on("click", function () {
    chrome.runtime.openOptionsPage();
});

$("#bl_domain").on("click", function () {
    if (blocksetDatas[currentId] != undefined && (new URL(urlWithProtocol).hostname) != "")
        addDomain(new URL(urlWithProtocol).hostname, blocksetDatas[currentId].blacklist);
    else {
        $("#addIndicator").text("Domain undefined");
        $("#addIndicator").addClass("show");
        setTimeout(() => { $("#addIndicator").removeClass("show") }, 100);
    }
});

$("#bl_url").on("click", function () {
    if (blocksetDatas[currentId] != undefined)
        addUrl(url, blocksetDatas[currentId].blacklist);
});

$("#wl_url").on("click", function () {
    if (blocksetDatas[currentId] != undefined)
        addUrl(url, blocksetDatas[currentId].whitelist);
});

$("#bl_channel").on("click", function () {
    if (blocksetDatas[currentId] != undefined) {
        getYTData(url, function (data) {
            addChannel(data.channelId, data.channelTitle, blocksetDatas[currentId].blacklist);
        });
    }
});

$("#wl_channel").on("click", function () {
    if (blocksetDatas[currentId] != undefined) {
        getYTData(url, function (data) {
            addChannel(data.channelId, data.channelTitle, blocksetDatas[currentId].whitelist);
        });
    }
});

$("#bl_category").on("click", function () {
    if (blocksetDatas[currentId] != undefined) {
        getYTData(url, function (data) {
            addCategory(data.categoryId, bgPage.ytCategoryNamesById[data.categoryId], blocksetDatas[currentId].blacklist);
        });
    }
});

$("#wl_category").on("click", function () {
    if (blocksetDatas[currentId] != undefined) {
        getYTData(url, function (data) {
            addCategory(data.categoryId, bgPage.ytCategoryNamesById[data.categoryId], blocksetDatas[currentId].whitelist);
        });
    }
});