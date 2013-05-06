/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


var app = {
    config: {
        content_json: "http://contentcontent.eu01.aws.af.cm/json",
        content_json_local: "http://content.loc/json"
    },
    path: '',
    filter: /^\/(.*)\//,
    eventFolder: "",
    db: undefined,
    count_success: 0,
    total_file: 0,
    total_data: [],
    total_data_string: [],
    jsonData: undefined,
    total_size: 0,
    finished_size: 0,
    storage: window.localStorage,
    currentPanel: undefined,
    currentPanelIndex: 0,
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function () {
        console.log("Document is ready");
        app.initEvents();
        $(".home").on('click', function () {
            app.cleanPage();
            app.readFolder("ancestor-page");
        });
        app.readFolder("ancestor-page");
        app.updateFileList(app.config.content_json_local);
    },
    fail: function (evt) {
        console.log(evt.target.error.code);
    },
    cleanPage: function () {
        $('#bl-work-items').empty();
        $(".nav_buttons>li").remove();
        $(".backButton").remove();
    },
    addCurrentPathButtons: function (currentPath) {
        var path = currentPath.split("/");
        path.splice(-2, 2);
        $('#bl-work-items').append("<div class=\"btn\" data-panel=\"panel-1\">Show Content</div>");
        $('.bl-content').append("<div class=\"btn backButton\">BACK</div>");
        $('.backButton').on('click', function () {
            app.cleanPage();
            app.readFolder(path.join("/"))
            $(this).remove();
        });
        $("#bl-work-items>div").on('click', function () {
            // scale down main section
            $('#bl-work-section').addClass('bl-scale-down');

            // show panel for this work item
            $('#bl-panel-work-items').addClass('bl-panel-items-show');
            app.currentPanel = $('#bl-panel-work-items').find("[data-panel='" + $(this).data('panel') + "']");
            app.currentPanelIndex = app.currentPanel.index();
            app.currentPanel.addClass('bl-show-work');

            $('.bl-icon-close').on('click', function () {
                // scale up main section
                $('#bl-work-section').removeClass('bl-scale-down');
                $('#bl-panel-work-items').removeClass('bl-panel-items-show');
                $('.bl-show-work').removeClass('bl-show-work');
            });

            // navigating the work items: current work panel scales down and the next work panel slides up
            $('.bl-next-work').on('click', function () {
                app.currentPanelIndex = app.currentPanelIndex < $('#bl-panel-work-items').children('div').length - 1 ? app.currentPanelIndex + 1 : 0;
                var $nextPanel = $('#bl-panel-work-items').children('div').eq(app.currentPanelIndex);
                app.currentPanel.removeClass('bl-show-work').addClass('bl-hide-current-work').on('webkitTransitionEnd', function (event) {
                    if (!$(event.target).is('div')) return false;
                    $(this).off('webkitTransitionEnd').removeClass('bl-hide-current-work');
                });
                $nextPanel.addClass('bl-show-work');
                app.currentPanel = $nextPanel;

            });
        })
    },
    readFolder: function (folderName) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            var folderAbsolutePath = fs.root.fullPath + "/" + folderName;
            var jsonFilePath = folderAbsolutePath + "/content.json";
            fs.root.getFile(jsonFilePath, {}, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.readAsText(file);
                    reader.onloadend = function (evt) {
                        var jsondata = JSON.parse(evt.target.result);
                        var pageContent = {data: []};//Will add title, description, etc
                        for (var i = 0, len = jsondata.data.length; i < len; i++) {
                            var media = jsondata.data[i],
                                isImage = (media.type == "image") ? true : false,
                                isVideo = (media.type == "video") ? true : false;
                            pageContent.data.push({
                                index: i + 1,
                                name: media.name,
                                path: folderAbsolutePath + "/" + media.name,
                                isImage: isImage,
                                isVideo: isVideo
                            })
                        }
                        var source = $("#media-template").html();
                        var template = Handlebars.compile(source);
                        var context = pageContent.data;
                        $("#bl-panel-work-items").empty().append(template(context));
                        app.handleCenterMedia();
                        if ($('#bl-panel-work-items').children('div').length == 1) {//hide next work button when just one item
                            $('.bl-next-work').hide();
                        }
                        app.addCurrentPathButtons(jsondata.folder);
                    }
                }, app.fail);
            }, app.fail);
            var directoryEntry = new DirectoryEntry(folderName, folderAbsolutePath);
            var directoryReader = directoryEntry.createReader();
            directoryReader.readEntries(function (entries) {
                var countDirectory = 1;
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.isDirectory) {
                        var button = "<li class=\"btn btn-path\" data-panel=\"panel-" + countDirectory + "\" data-path=\"" + folderName + "/" + entry.name + "\">" + entry.name + "</li>"
                        $('.nav_buttons').append(button);
                        countDirectory++;
                    }
                }
                app.showCurrentPath(folderName);
                $('.nav_buttons > li').on('click', function (event) {
                    app.cleanPage();
                    app.readFolder($(this).data("path"));
                });
            }, app.fail);
        }, app.fail)
    },

    readFileList: function (file) {//Read the global json file and extract informations
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            app.jsonData = JSON.parse(evt.target.result);
            if (app.storage.getItem("data_version") != app.jsonData.version) {
                $(".progressbar-inner").width(0);
                app.finished_size=0;
                app.storage.setItem("data_version", app.jsonData.version);
                app.total_file = app.jsonData.CACHE.length;
                app.total_size = app.jsonData.TotalSize;
                for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
                    var page = app.jsonData.CACHE[i];
                    for (var j = 0, len_page = page.data.length; j < len_page; j++) {
                        var obj={
                            url: page.data[j].url,
                            folderName: page.folder,
                            filePath: page.folder + page.data[j].url.split('/').pop()
                        };
                        app.total_data_string.push(JSON.stringify(obj));
                        app.total_data.push(obj);
                    }
                }
                app.downloadItem((app.checkData(app.total_data)).toDownload);
                $('.progress-status').empty().append("<p>Still " + app.jsonData.TotalSize + " bytes to go!</p>");
            }
            else {
                $('.message').html("The content is updated!");
            }
        };
        reader.readAsText(file);
    },
    downloadItem: function (data) {

        var filePath = "",
            url = "",
            page = undefined,
            folder = "",
            jsonStringData = "",
            fileTransfer = undefined;
        if (data.length > 0) {
            var elt = data.pop();
            url = elt.url;
            var folderName = elt.folderName;
            filePath = app.path + elt.filePath;
            fileTransfer = new FileTransfer();
            fileTransfer.onprogress = function (progressEvent) {
                if (progressEvent.lengthComputable) {
                    var percent = ((app.finished_size + progressEvent.loaded) / app.jsonData.TotalSize) * 500;
                    $(".progressbar-inner").width(percent);
                }
            };
            fileTransfer.download(
                url, filePath, function (entry) {
                    app.count_success++;
                    entry.file(function (file) {
                        app.total_size -= file.size;
                        app.finished_size += file.size;
                        $('.progress-status').empty().append("<p>Still " + app.total_size + " bytes to go!</p>");
                    }, app.fail)
                    app.downloadItem(data);
                }, function (error) {
                    console.log("Download error, target: " + elt.url);
                    app.downloadItem(data);
                });
        }
        else {//Download finished
            //Add content.json to each folder
            var writeContentJson = function (jsonStringData, folder) {
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                    fileSystem.root.getFile(folder + "content.json", {create: true}, function (fileEntry) {
                        fileEntry.createWriter(function (writer) {
                            writer.write(jsonStringData);
                        }, app.fail);
                    }, app.fail);
                }, app.fail);
            }
            for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
                page = app.jsonData.CACHE[i];
                folder = page.folder;
                jsonStringData = JSON.stringify(page);
                writeContentJson(jsonStringData, folder);
            }
            $('.message').html("New content available");
        }
    },

    fail: function (evt) {
        console.log(evt.target.error.code);
    },

    updateFileList: function (fileListUrl) {//update the global json file
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
            fileSystem.root.getFile("fileList", {create: true}, function (fileEntry) {
                app.path = app.filter.exec(fileEntry.fullPath)[0];
                var fileTransfer = new FileTransfer();
                var fileListPath = app.path + "fileList";
                fileTransfer.download(
                    fileListUrl, fileListPath,
                    function (entry) {
                        entry.file(function (file) {
                            app.readFileList(file);
                        }, app.fail);
                    }, function (error) {
                        $('.message').html("Network is not available");
                        console.log("Download file list error: " + error.source);
                    });
            }, app.fail);
        }, app.fail);
    },
    initEvents: function () {
        $('.reload_button').on('click', function () {
            $('.message').html("Page refreshed");
            app.cleanPage();
            app.readFolder('ancestor-page');

        });
        $('.update_button').on('click', function () {
            app.storage.setItem("data_version", "999");
            app.total_data=[];
            app.total_data_string=[];
            app.updateFileList(app.config.content_json_local);
        })
    },
    showCurrentPath: function (currentPath) {
        $('.current-path').html(currentPath);
    },
    handleCenterMedia: function () {
        $(".media-container>img, .media-container>video").css({
            'left': ($("body").width() - $(".media-container>img").width()) / 2
        });
        $(window).on('resize', function () {
            $(".media-container>img, .media-container>video").css({
                'left': ($("body").width() - $(".media-container>img").width()) / 2
            });
        });
    },
    checkData: function(data){
     var old_data=[],
         tmp1=JSON.parse(app.storage.getItem("data")),
         result;
        if (tmp1){
            for (var i = 0, len = tmp1.data.length; i < len; i++) {
                old_data.push(tmp1.data[i]);
            }
        }
        if (old_data.length>0){
//            log(old_data);
//            log(data.length);
//            log(old_data.length);
            var toDelete=old_data,
                toDownload=[];
            for (var i = 0, len = data.length; i < len; i++) {
                if (!app.checkItemInArray(old_data,data[i])){
//                    log("add");
                    toDownload.push(data[i]);
                }
                else{
                    toDelete= toDelete.filter(function (elt) {
                        return (elt.filePath!=data[i].filePath);
                    });
//                    log("delete");
                }
            }
//            log(toDownload);
//            log(toDelete);
            result= {toDelete: toDelete, toDownload: toDownload};
            app.storage.removeItem("data");
        }
        else{
            result= {toDelete: [], toDownload: data};
        }
        var tmp={data: data};
        app.storage.setItem("data", JSON.stringify(tmp));
//        log(JSON.parse(app.storage.getItem("data")));
//        log(result);
        return result;
    },
    checkItemInArray: function(array, item){
        var result=$.grep(array, function(elt){
            return (elt.filePath==item.filePath);
        });
        return (result.length>0);
    }
};

var log = function (message) {
    console.log(message);
}


